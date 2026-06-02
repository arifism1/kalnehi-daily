#!/usr/bin/env node
/**
 * Builds the APK-bundled offline cache seed for the Capacitor shell.
 *
 * Usage:
 *   node scripts/build-android-cache-seed.mjs
 *   CACHE_SEED_BASE_URL=http://127.0.0.1:3000 node scripts/build-android-cache-seed.mjs
 *
 * Run after `next build`. Bumps seed version from android/app/build.gradle versionCode.
 */

import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_ROOT = join(ROOT, "android", "app", "src", "main", "assets", "kalnehi-cache-seed");
const PATHS_DIR = join(SEED_ROOT, "paths");
const NEXT_STATIC = join(ROOT, ".next", "static");
const PUBLIC_DIR = join(ROOT, "public");
const GRADLE = join(ROOT, "android", "app", "build.gradle");

const BASE_URL = (process.env.CACHE_SEED_BASE_URL ?? "https://www.kalnehi.com").replace(
  /\/$/,
  "",
);

/** Fetched from BASE_URL (HTML + App Router metadata routes). */
const FETCH_ROUTES = ["/home", "/auth", "/offline.html", "/manifest.webmanifest"];

/** Copied from public/ when present; missing files fall back to FETCH_ROUTES. */
const PUBLIC_ASSETS = [
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

async function readVersionCode() {
  const gradle = await readFile(GRADLE, "utf8");
  const m = gradle.match(/versionCode\s+(\d+)/);
  if (!m) throw new Error("Could not parse versionCode from android/app/build.gradle");
  return Number(m[1]);
}

function pathToSeedFile(urlPath) {
  if (urlPath === "/" || urlPath === "") return join(PATHS_DIR, "index");
  const clean = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  if (clean.startsWith("_next/")) return join(SEED_ROOT, clean);
  return join(PATHS_DIR, clean);
}

function acceptHeaderForPath(urlPath) {
  if (urlPath.endsWith(".webmanifest")) {
    return "application/manifest+json,application/json;q=0.9,*/*;q=0.8";
  }
  return "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
}

async function fetchToFile(urlPath) {
  const url = `${BASE_URL}${urlPath}`;
  const dest = pathToSeedFile(urlPath);
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: {
      "User-Agent": "KalnehiAndroidApp KalnehiCacheSeedBuild/1",
      Accept: acceptHeaderForPath(urlPath),
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  cached ${urlPath} -> ${dest.replace(ROOT, "")}`);
}

async function copyNextStatic() {
  const dest = join(SEED_ROOT, "_next", "static");
  try {
    await cp(NEXT_STATIC, dest, { recursive: true });
    console.log(`  copied .next/static -> ${dest.replace(ROOT, "")}`);
  } catch {
    console.warn(
      "  warn: .next/static missing — run `npm run build` first. Skipping static chunks.",
    );
  }
}

async function copyPublicAsset(urlPath) {
  const src = join(PUBLIC_DIR, urlPath.replace(/^\//, ""));
  try {
    await access(src);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      console.warn(`  warn: ${src} missing — fetching ${urlPath} from ${BASE_URL}`);
      await fetchToFile(urlPath);
      return;
    }
    throw err;
  }
  const dest = pathToSeedFile(urlPath);
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest);
  console.log(`  copied public ${urlPath}`);
}

async function main() {
  const versionCode = await readVersionCode();
  console.log(`Building cache seed v${versionCode} from ${BASE_URL}`);

  await rm(SEED_ROOT, { recursive: true, force: true });
  await mkdir(PATHS_DIR, { recursive: true });

  for (const route of FETCH_ROUTES) {
    await fetchToFile(route);
  }
  for (const asset of PUBLIC_ASSETS) {
    await copyPublicAsset(asset);
  }

  await copyNextStatic();

  const manifest = {
    versionCode,
    host: new URL(BASE_URL).host,
    builtAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    paths: [...FETCH_ROUTES, ...PUBLIC_ASSETS],
  };
  await writeFile(join(SEED_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Done. Seed at android/app/src/main/assets/kalnehi-cache-seed (versionCode ${versionCode})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
