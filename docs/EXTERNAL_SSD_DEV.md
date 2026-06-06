# External SSD development guide

All Kalnehi development (and sibling apps) runs from the **external SSD** mounted at `/Volumes/AndroidStorage`. This frees internal Mac storage while keeping one canonical location for every repo, tool, and build artifact.

---

## Volume layout

```
/Volumes/AndroidStorage/
├── kalnehi-daily/          # this repo (Next.js PWA + Capacitor Android shell)
├── AndroidDev/
│   ├── sdk/                # Android SDK  →  android.sdk.path in gradle.properties
│   └── gradle_cache/       # Gradle home   →  org.gradle.user.home in gradle.properties
├── aciselect-pwa/          # sibling Next.js app
├── bizhiker/               # sibling app
├── sycusto/                # sibling app
└── kalnehi.jks             # signing keystore (volume root, never committed)
```

---

## Before opening Cursor or a terminal

Mount the SSD first. If Cursor is already open and the volume is not mounted, the workspace paths will be stale and `npm run dev` will fail with "project not found" errors.

---

## Web / PWA development (kalnehi-daily)

### First time or after `git pull` with dependency changes

```bash
cd /Volumes/AndroidStorage/kalnehi-daily
npm ci          # installs from lockfile, keeps node_modules on SSD
```

Use `npm ci` (not `npm install`) after every `git pull` that touches `package.json` or `package-lock.json`. This is especially important after Capacitor/Firebase native plugin updates where native bindings are compiled.

### Dev server

```bash
cd /Volumes/AndroidStorage/kalnehi-daily
npm run dev     # Turbopack (default) — http://localhost:3000
```

**Note on the "Slow filesystem" Turbopack warning:** Next.js benchmarks file I/O at startup and warns when latency is higher than ~200ms. This warning is expected on an external USB drive. It does not prevent the server from running. With Next.js 16.1+ Turbopack persistent caching (`.next/cache/turbopack-dev`), **subsequent** dev starts are fast even on the SSD because the module graph is loaded from disk cache.

If the very first compile after a cold start is slow (~30–60s for a large route like `/sw.js`), that is normal. Subsequent page visits on the same dev session are fast.

**Do not attempt to symlink `.next` to the internal Mac disk.** Turbopack generates project-relative paths inside `.next`; moving it outside the project root (even via symlink) breaks module resolution (`[project]/instrumentation.ts not found`). `.next` must remain inside the project directory. The SSD has ~900GB free so this is never a storage concern.

### `.next` and `.gitignore`

`.next` is already in `.gitignore`. It is recreated automatically by `next dev` and `next build`; never commit it.

---

## Android (Capacitor) development

### Prerequisites

| Requirement | Location on SSD |
|-------------|----------------|
| Android SDK | `/Volumes/AndroidStorage/AndroidDev/sdk` |
| Gradle cache | `/Volumes/AndroidStorage/AndroidDev/gradle_cache` |
| JDK 21 (release builds) | `brew install --cask temurin@21` (internal disk, small) |
| Keystore | `/Volumes/AndroidStorage/kalnehi.jks` |

These paths are committed in [`android/gradle.properties`](../android/gradle.properties) so Android Studio launched from the Dock (which may not inherit shell exports) still resolves them correctly. **Do not change these paths** unless you also update `gradle.properties`.

### Build commands

```bash
# Build Next.js, regenerate offline cache seed, sync Capacitor:
npm run android:build

# Regenerate the offline cache seed only (after an existing next build):
npm run android:cache-seed

# Open in Android Studio:
npm run android:open

# Sync Capacitor only (after source changes that don't need a full rebuild):
npm run android:sync
```

The offline cache seed lives at `android/app/src/main/assets/kalnehi-cache-seed/` and is committed to the repo. Regenerate it whenever app routes change materially.

### JDK 21 for release builds

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
npm run android:build
```

Or pin it machine-locally (do not commit machine-specific paths):

```properties
# android/gradle.properties — machine-local, do not commit
org.gradle.java.home=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
```

---

## Sibling apps (aciselect-pwa, bizhiker, sycusto)

Same workflow applies:

```bash
cd /Volumes/AndroidStorage/<app-name>
npm ci                  # first time or after dependency changes
npm run dev             # start dev server
```

Each app has its own `node_modules` on the SSD. There is no shared `node_modules` between projects. No Node.js installation is needed on the SSD — the system `node` and `npm` from `/usr/local/bin` (or Homebrew) are used.

---

## Useful diagnostics

```bash
# Check SSD free space
df -h /Volumes/AndroidStorage

# Verify Android SDK and Gradle paths resolve
ls /Volumes/AndroidStorage/AndroidDev/sdk
ls /Volumes/AndroidStorage/AndroidDev/gradle_cache

# Confirm node_modules are on the SSD (not internal disk)
ls /Volumes/AndroidStorage/kalnehi-daily/node_modules | head -5

# Turbopack tracing for slow compile investigation
NEXT_TURBOPACK_TRACING=1 npm run dev
# then: npx next internal trace .next/dev/trace-turbopack
```
