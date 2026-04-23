/**
 * Edge Config helpers for the global kill switch and per-feature flags.
 *
 * READ  path: @vercel/edge-config — sub-millisecond, globally consistent
 *             across all Vercel serverless instances. This is the "push"
 *             signal: the admin API writes here once, every function instance
 *             reads the new value on the next request.
 *
 * WRITE path: Vercel REST API (called by admin API routes after every DB
 *             update). Non-fatal if it fails — DB stays as source of truth.
 *
 * FALLBACK:   If EDGE_CONFIG is not configured (local dev / non-Vercel),
 *             reads from Supabase with a 15-second module-level cache.
 *
 * Edge Config keys used:
 *   app_status     — { app_enabled, maintenance_title, maintenance_message, maintenance_eta }
 *   feature_flags  — { [featureKey]: { enabled, message } }
 *
 * Required env vars (production):
 *   EDGE_CONFIG          — Edge Config connection string
 *   VERCEL_API_TOKEN     — Personal access token from vercel.com/account/tokens
 *   VERCEL_TEAM_ID       — Optional: team ID if the project is under a Vercel team
 */

import { get } from "@vercel/edge-config";

export type AppStatus = {
  app_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_eta: string | null;
};

const DEFAULT: AppStatus = {
  app_enabled: true,
  maintenance_title: "Back soon.",
  maintenance_message:
    "Kalnehi Daily is temporarily unavailable. We will be back shortly.",
  maintenance_eta: null,
};

export type FeatureFlagMap = Record<string, { enabled: boolean; message: string | null }>;

// ── Supabase fallback caches (used when EDGE_CONFIG is not configured) ─────────
type FallbackEntry = { status: AppStatus; fetchedAt: number };
let _fallbackCache: FallbackEntry | null = null;
type FlagsFallbackEntry = { flags: FeatureFlagMap; fetchedAt: number };
let _flagsFallbackCache: FlagsFallbackEntry | null = null;
// 2 s gives near-instant kill switch propagation when Edge Config is not used
// (local dev). In production, EDGE_CONFIG is set so this fallback is never reached.
const FALLBACK_TTL_MS = 2_000;

async function _readFromSupabase(): Promise<AppStatus> {
  const now = Date.now();
  if (_fallbackCache && now - _fallbackCache.fetchedAt < FALLBACK_TTL_MS) {
    return _fallbackCache.status;
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await client
      .from("app_config")
      .select(
        "app_enabled,maintenance_title,maintenance_message,maintenance_eta",
      )
      .maybeSingle();

    if (data) {
      const status: AppStatus = {
        app_enabled: data.app_enabled ?? true,
        maintenance_title: data.maintenance_title ?? DEFAULT.maintenance_title,
        maintenance_message:
          data.maintenance_message ?? DEFAULT.maintenance_message,
        maintenance_eta: data.maintenance_eta ?? null,
      };
      _fallbackCache = { status, fetchedAt: now };
      return status;
    }
  } catch (err) {
    console.warn("[edgeConfig] Supabase fallback failed:", err);
  }
  return DEFAULT;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns the current app status.
 *
 * Production (EDGE_CONFIG set): reads from Edge Config — sub-millisecond.
 * Development / fallback: reads from Supabase with 15 s module-level cache.
 *
 * Always fails open (returns app_enabled = true) on any error so a
 * misconfigured kill switch never locks everyone out.
 */
export async function readAppStatus(): Promise<AppStatus> {
  if (!process.env.EDGE_CONFIG) {
    return _readFromSupabase();
  }

  try {
    const stored = await get<AppStatus>("app_status");
    if (stored && typeof stored.app_enabled === "boolean") {
      return {
        app_enabled: stored.app_enabled,
        maintenance_title:
          stored.maintenance_title ?? DEFAULT.maintenance_title,
        maintenance_message:
          stored.maintenance_message ?? DEFAULT.maintenance_message,
        maintenance_eta: stored.maintenance_eta ?? null,
      };
    }
    // Key not yet seeded in Edge Config — treat as enabled.
    return DEFAULT;
  } catch {
    // Edge Config read failed — fail open.
    return DEFAULT;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

function _extractEdgeConfigId(connectionString: string): string | null {
  try {
    const u = new URL(connectionString);
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];
    return id?.startsWith("ecfg_") ? id : null;
  } catch {
    return null;
  }
}

/**
 * Pushes an app status patch to Edge Config so all Vercel instances
 * pick it up on the very next request (sub-second propagation).
 *
 * Merges with the current stored value so partial patches work correctly.
 * Returns true on success, false on failure (non-fatal — DB is source of truth).
 */
export async function writeAppStatus(
  patch: Partial<AppStatus>,
): Promise<boolean> {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const connectionString = process.env.EDGE_CONFIG?.trim();

  if (!token || !connectionString) {
    console.warn(
      "[edgeConfig] VERCEL_API_TOKEN or EDGE_CONFIG not set — skipping Edge Config write.",
    );
    return false;
  }

  const edgeConfigId = _extractEdgeConfigId(connectionString);
  if (!edgeConfigId) {
    console.error(
      "[edgeConfig] Could not parse Edge Config store ID from EDGE_CONFIG.",
    );
    return false;
  }

  // Merge with current status so unrelated fields are preserved.
  const current = await readAppStatus();
  const merged: AppStatus = { ...current, ...patch };

  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const apiUrl = new URL(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
  );
  if (teamId) apiUrl.searchParams.set("teamId", teamId);

  try {
    const res = await fetch(apiUrl.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "upsert", key: "app_status", value: merged }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[edgeConfig] Write failed (HTTP ${res.status}):`,
        text.slice(0, 300),
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[edgeConfig] Write error:", err);
    return false;
  }
}

// ── Feature flags ─────────────────────────────────────────────────────────────

async function _readFeatureFlagsFromSupabase(): Promise<FeatureFlagMap> {
  const now = Date.now();
  if (_flagsFallbackCache && now - _flagsFallbackCache.fetchedAt < FALLBACK_TTL_MS) {
    return _flagsFallbackCache.flags;
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await client
      .from("feature_flags")
      .select("feature_key,enabled,disabled_message");

    if (data) {
      const flags: FeatureFlagMap = {};
      for (const row of data) {
        flags[row.feature_key] = {
          enabled: row.enabled ?? true,
          message: row.disabled_message ?? null,
        };
      }
      _flagsFallbackCache = { flags, fetchedAt: now };
      return flags;
    }
  } catch (err) {
    console.warn("[edgeConfig] Feature flags Supabase fallback failed:", err);
  }
  return {};
}

/**
 * Returns the current feature flag map.
 *
 * Production (EDGE_CONFIG set): reads from Edge Config — sub-millisecond.
 * Development / fallback: reads from Supabase with 15 s module-level cache.
 *
 * Fails open (returns {}) on any error — unknown flags default to enabled
 * inside useFeatureFlag / route handlers.
 */
export async function readFeatureFlags(): Promise<FeatureFlagMap> {
  if (!process.env.EDGE_CONFIG) {
    return _readFeatureFlagsFromSupabase();
  }

  try {
    const stored = await get<FeatureFlagMap>("feature_flags");
    if (stored && typeof stored === "object") {
      return stored;
    }
    // Key not yet seeded — fall back to Supabase once to populate.
    return _readFeatureFlagsFromSupabase();
  } catch {
    return _readFeatureFlagsFromSupabase();
  }
}

/**
 * Pushes a single feature flag update to Edge Config.
 * Merges with the current stored map so unrelated flags are preserved.
 * Non-fatal — DB remains the source of truth.
 */
export async function writeFeatureFlag(
  featureKey: string,
  patch: { enabled: boolean; message: string | null },
): Promise<boolean> {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const connectionString = process.env.EDGE_CONFIG?.trim();

  if (!token || !connectionString) {
    console.warn(
      "[edgeConfig] VERCEL_API_TOKEN or EDGE_CONFIG not set — skipping feature flag write.",
    );
    return false;
  }

  const edgeConfigId = _extractEdgeConfigId(connectionString);
  if (!edgeConfigId) {
    console.error("[edgeConfig] Could not parse Edge Config store ID.");
    return false;
  }

  // Read current map and merge so other flags are not wiped.
  const current = await readFeatureFlags();
  const merged: FeatureFlagMap = { ...current, [featureKey]: patch };

  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const apiUrl = new URL(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
  );
  if (teamId) apiUrl.searchParams.set("teamId", teamId);

  try {
    const res = await fetch(apiUrl.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "upsert", key: "feature_flags", value: merged }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[edgeConfig] Feature flag write failed (HTTP ${res.status}):`,
        text.slice(0, 300),
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[edgeConfig] Feature flag write error:", err);
    return false;
  }
}
