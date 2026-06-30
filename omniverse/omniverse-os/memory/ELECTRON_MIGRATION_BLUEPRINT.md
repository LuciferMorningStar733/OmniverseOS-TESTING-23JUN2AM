# OmniverseOS — Electron Migration Blueprint

**Status:** Architecture document only. **No code is migrated in this sprint.**
**Owner:** OmniverseOS engineering · Target milestone: Alpha 1.0 (post-RC).
**Last reviewed:** 2026-06-29 (Alpha 0.9 RC sprint).

---

## 1. Why Electron

OmniverseOS already behaves like an OS in the browser, but is constrained by:

- Iframe restrictions (`X-Frame-Options`, CSP) → the Browser app shows a "blocked" panel for ~30 high-value sites.
- No native filesystem (Files app is a virtual MongoDB collection).
- No real OS notifications, no global hotkeys, no menu-bar integration.
- No browser automation surface (Cortex can only navigate, never read DOM).
- No reliable secure credential store (currently `localStorage`).

Electron gives us a controlled, sandboxed Chromium that we can drive through
Chrome DevTools Protocol (CDP) and Playwright, plus Node-level access for
filesystem, notifications, auto-update, and credential storage.

---

## 2. Recommended Project Structure

```
omniverseos-desktop/
├── apps/
│   ├── web/                    # existing React app (mostly unchanged)
│   │   └── src/...             # reused as renderer
│   └── api/                    # FastAPI service (mostly unchanged)
│       └── server.py
├── desktop/
│   ├── main/                   # Electron main process
│   │   ├── index.ts            # createWindow, ipcMain wiring
│   │   ├── browser-host.ts     # BrowserView / WebContentsView per tab
│   │   ├── cdp.ts              # CDP attach/detach helpers
│   │   ├── playwright.ts       # Playwright launch + automation bridge
│   │   ├── fs.ts               # native filesystem service
│   │   ├── notifications.ts    # native notifications + tray
│   │   ├── auto-updater.ts     # electron-updater integration
│   │   ├── ipc/                # channel definitions + handlers
│   │   └── security.ts         # CSP, sandbox, contextIsolation
│   ├── preload/
│   │   └── index.ts            # contextBridge.exposeInMainWorld('omni', …)
│   └── shared/
│       └── ipc-contract.ts     # zod schemas for every IPC channel
├── tools/
│   ├── pack/                   # electron-builder configs
│   └── codesign/               # Windows / macOS signing scripts
├── package.json                # workspaces: apps/* + desktop
└── electron-builder.yml
```

Use **pnpm workspaces** (already in the codebase) so the React app and the
desktop shell share dependencies and version-lock perfectly.

---

## 3. Process & IPC Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Electron Main Process                          │
│  - App lifecycle, window manager, native APIs                           │
│  - Owns: filesystem, notifications, auto-updater, secure credentials    │
│  - Spawns one BrowserView per browser tab                               │
│  - Hosts Playwright server, CDP client                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                 ▲   ▲
                                 │   │ contextBridge
                                 │   │ (no nodeIntegration in renderer)
                                 │   │
   ┌─────────────────────────────┘   └─────────────────────────────┐
   │                                                                │
┌─────────────────────────────┐              ┌────────────────────────────────┐
│ Renderer: OmniverseOS Shell │              │ Renderer: BrowserView per tab  │
│ (React app)                 │              │ (sandboxed, isolated session)  │
│  - Desktop / Mission Ctrl   │              │  - Hosts the live web page     │
│  - AIChat, Voice, Notes…    │              │  - Receives CDP/Playwright cmd │
│  - window.omni.*  IPC       │              │  - Cortex reads DOM via CDP    │
└─────────────────────────────┘              └────────────────────────────────┘
```

### IPC Contract (typed, zod-validated)

Each channel has a `request.schema.ts` and `response.schema.ts`. The preload
script wraps `ipcRenderer.invoke` in typed wrappers exposed via
`contextBridge.exposeInMainWorld('omni', api)`.

| Namespace      | Channels                                                   |
| -------------- | ---------------------------------------------------------- |
| `omni.fs`      | `read`, `write`, `list`, `watch`, `pickFile`, `pickFolder` |
| `omni.notify`  | `show`, `cancel`, `requestPermission`                      |
| `omni.creds`   | `set`, `get`, `delete`, `list`                             |
| `omni.tabs`    | `create`, `close`, `navigate`, `goBack`, `goForward`, `setBounds`, `screenshot` |
| `omni.cdp`     | `attach`, `detach`, `send`, `subscribe`                    |
| `omni.auto`    | `playwright.dispatch`, `playwright.cancel`                 |
| `omni.update`  | `check`, `downloadProgress`, `install`                     |
| `omni.system`  | `getInfo`, `openExternal`, `setBadgeCount`, `quit`         |

All schemas are shared between main and renderer via `desktop/shared/`.
**Never** `ipcMain.handle` an untyped channel — gate every payload through zod.

---

## 4. Browser Process Architecture

Each "tab" in the OmniverseOS Browser app maps to one **`WebContentsView`**
(replacing the legacy `BrowserView`). The main process maintains a `Map<TabId, WebContentsView>`
and positions them under the React Browser window using `setBounds()` on every
resize/move/active-window-change.

Key properties (per-view):

```ts
new WebContentsView({
  webPreferences: {
    sandbox: true,                  // forces OS-level sandbox
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    partition: `persist:tab-${tabId}`, // cookie/storage isolation per tab
    preload: undefined,             // no preload for arbitrary web pages
  },
});
```

When the React Browser window is moved, resized, or its z-index changes, main
process repositions the view. When the window is minimized or covered, the
view's bounds are zero'd (effectively hiding it without destroying state).

---

## 5. Chrome DevTools Protocol Integration

CDP is what unlocks Cortex's real intelligence. For each tab:

```ts
const debugger = view.webContents.debugger;
debugger.attach('1.3');

// Capture DOM context for Cortex
const { result } = await debugger.sendCommand('Runtime.evaluate', {
  expression: 'document.title + "\\n" + document.body.innerText.slice(0, 5000)',
  returnByValue: true,
});

// Subscribe to page-load events
debugger.on('message', (_e, method, params) => {
  if (method === 'Page.frameNavigated') {
    main.send('omni.tabs.urlChanged', { tabId, url: params.frame.url });
  }
});
```

### Cortex CDP use-cases
- **Page summarization** → `Runtime.evaluate` to extract `innerText`, ship to LLM.
- **Form auto-fill** → `Runtime.evaluate` + `Input.dispatchKeyEvent`.
- **Screenshot for vision** → `Page.captureScreenshot`.
- **Reader mode** → `Runtime.evaluate` to inject a Mozilla Readability bundle.
- **Element inspection** → `DOM.getDocument` + `DOM.querySelector`.

Always **detach** the debugger when the tab closes; never leave a CDP session
hanging — it leaks heap and prevents tab GC.

---

## 6. Playwright Integration

Two roles for Playwright:

### A) Cortex Automation Engine (in-app)
The main process imports `playwright-core` (no separate browser binary — we
attach to the running Electron `WebContents` via CDP at
`ws://localhost:<port>/devtools/...`). This lets the existing Playwright
APIs (`page.click`, `page.fill`, `page.waitForSelector`) drive any tab.

```ts
const cdpUrl = await debugger.sendCommand('Browser.getVersion');
const browser = await chromium.connectOverCDP(cdpUrl);
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

// Cortex can now drive the page
await page.fill('input[name="q"]', 'cyberpunk OS');
await page.click('button[type="submit"]');
```

### B) E2E Test Harness (CI)
`@playwright/test` runs against the packaged Electron app via
`_electron.launch({ args: ['./dist/main.js'] })`. We get the full OmniverseOS
shell tested in CI on Windows / macOS / Linux. Existing `data-testid`
attributes (already comprehensive) are reused verbatim.

---

## 7. Browser Automation Architecture (Cortex → Web)

```
User prompt
   │
   ▼
AIChat → parseActions → executeActions
   │
   ▼ (new action type: 'browser_automate')
omni.auto.playwright.dispatch({ tabId, steps })
   │
   ▼
Main → Playwright → CDP → WebContents
   │
   ▼
Stream of { step, status, screenshotUrl, dom } events
   │
   ▼
Rendered in AIChat as a live "Cortex Operator" timeline card
```

`steps` is a typed instruction list: `goto | click | fill | scroll | wait | screenshot | extract`.
Cortex can ask the LLM to generate this list, then the main process executes it
deterministically. **Every step is auditable** — the renderer sees the screenshot
between each step before continuing (Operator-style approval flow).

---

## 8. Native Filesystem Integration

Replace the virtual Files app with an `omni.fs` service:

```ts
// main/fs.ts
ipcMain.handle('omni.fs.read', async (_e, payload) => {
  const { path } = readSchema.parse(payload);
  await assertInsideUserVault(path);   // sandbox the filesystem to ~/Omniverse
  return fs.readFile(path, 'utf-8');
});
```

**Sandbox** every path through `assertInsideUserVault()` — never let the renderer
read `~/.ssh`. The user's "vault" is `~/Omniverse/` (configurable in Settings).

The existing Notes/Tasks/etc. apps can optionally write a `.omni` mirror to disk
under `~/Omniverse/notes/<id>.json` to enable offline sync + git-friendly backup.

---

## 9. Native Notifications

```ts
// main/notifications.ts
import { Notification } from 'electron';

new Notification({
  title: payload.title,
  body: payload.body,
  silent: !payload.sound,
  icon: assetPath(payload.iconKey),
}).show();
```

Wire to existing `pushNotification` in `OSContext.js`: when running in Electron,
also dispatch `window.omni.notify.show()`. The in-window NotificationCenter
remains the source of truth for unread state.

---

## 10. Secure Credential Storage

Replace `localStorage` JWT with OS keychain via `keytar` (or the newer
`@napi-rs/keyring`):

```ts
ipcMain.handle('omni.creds.set', async (_e, { service, account, password }) => {
  await keytar.setPassword(service, account, password);
});
```

- macOS → Keychain
- Windows → Credential Manager
- Linux → libsecret (gnome-keyring / KWallet)

Migration: on first Electron launch, read the JWT from `localStorage`, write it
to keytar, then clear `localStorage`. The renderer fetches the token via
`await window.omni.creds.get('omniverseos','jwt')` on boot.

---

## 11. Auto-Updater Strategy

Use `electron-updater` with a **dual-channel** scheme:

- **stable** → tagged GitHub releases (`v1.0.0`, `v1.0.1`, …)
- **canary** → branch builds for power users (opt-in in Settings)

```ts
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'lucifermornings',
  repo: 'omniverseos-desktop',
  channel: getUpdateChannel(),
});
autoUpdater.on('update-downloaded', (info) => {
  main.send('omni.update.ready', info);
});
```

The renderer surfaces an "Update available · Restart" pill in the TopBar.
Updates **always** require explicit user confirmation — never silent install.

---

## 12. Packaging (Windows / macOS / Linux)

Use **electron-builder** with the following targets:

| OS      | Format        | Code-sign                      |
| ------- | ------------- | ------------------------------ |
| macOS   | DMG, ZIP      | Developer ID + notarization    |
| Windows | NSIS, MSI     | EV code-signing cert           |
| Linux   | AppImage, DEB | GPG signature in repo metadata |

```yaml
# electron-builder.yml
appId: io.omniverseos.desktop
productName: OmniverseOS
directories:
  output: dist
files:
  - 'desktop/dist/**'
  - 'apps/web/build/**'
  - 'apps/api/**'
mac:
  category: public.app-category.developer-tools
  hardenedRuntime: true
  gatekeeperAssess: true
  entitlements: build/entitlements.mac.plist
win:
  signingHashAlgorithms: ['sha256']
  publisherName: 'OmniverseOS Inc.'
linux:
  category: 'Office;Utility'
```

**Backend bundling:** ship `apps/api` as a one-binary PyInstaller artifact
(`omniverseos-api`) launched as a child process from `main/index.ts` with a
random localhost port. The renderer reads the port from a postMessage from
main during boot.

---

## 13. Security Considerations

Non-negotiable defaults:

1. **`contextIsolation: true`** on every window — renderer never sees Node.
2. **`sandbox: true`** on every untrusted view (all web tabs).
3. **`nodeIntegration: false`** everywhere except the OmniverseOS shell window
   (where it's still false; main exposes capability via contextBridge only).
4. **CSP header** in the shell:
   `default-src 'self'; script-src 'self'; connect-src 'self' https://api.omniverseos.io https://generativelanguage.googleapis.com; img-src 'self' data: https:;`
5. **Web request filter** in main: block telemetry endpoints unless explicitly
   opted-in via Settings → Privacy.
6. **Disable** `allowRunningInsecureContent`, `experimentalFeatures`, `webviewTag`.
7. **HMR** (`webPack-dev-server`) is **dev-only** and never bundled in prod.
8. **Native module audit**: pin all `electron-*` and `@napi-rs/*` versions in
   the workspace catalog; rebuild on every Electron upgrade.
9. **Code-signing required** on every release; refuse to ship unsigned builds.
10. **Renderer process model**: one process per BrowserView keeps a crashing
    web page from killing the OS shell.

---

## 14. Performance Considerations

| Concern                         | Mitigation                                                        |
| ------------------------------- | ----------------------------------------------------------------- |
| Cold-start time                 | Lazy-load apps/* (already done); preload only OSContext + shell.  |
| BrowserView memory growth       | Discard `WebContents` on tab close; cap concurrent tabs (e.g. 12). |
| CDP message flood               | Debounce `Page.frameNavigated` events to 200 ms in main process.  |
| Renderer FPS during drag        | Already handled via `framer-motion` `dragMomentum: false`.        |
| Backend startup latency         | PyInstaller `--onedir` (not `--onefile`) — ~5× faster cold start. |
| Auto-updater download           | Background, chunked; surface progress in TopBar.                  |
| GPU acceleration                | Keep `--enable-features=VaapiVideoDecoder` on Linux.              |

---

## 15. Migration Phases & Estimated Effort

| Phase | Scope                                                              | Eng-weeks |
| ----- | ------------------------------------------------------------------ | --------- |
| 0     | Repo restructure to pnpm workspace + `desktop/` skeleton           | 0.5       |
| 1     | Main + preload + IPC contract + zod schemas                        | 1.0       |
| 2     | Embed existing React app as renderer (file://, then dev-server)    | 0.5       |
| 3     | `omni.tabs` + BrowserView host + Browser app rewire                | 1.5       |
| 4     | CDP attach + Cortex page-summarize / read-DOM features             | 1.0       |
| 5     | Playwright integration + 'browser_automate' Cortex action          | 1.5       |
| 6     | `omni.fs` + Native Files app                                       | 1.0       |
| 7     | Native notifications, tray, global hotkey, menu bar                | 0.5       |
| 8     | `omni.creds` (keytar) + JWT migration                              | 0.5       |
| 9     | Auto-updater (electron-updater) + release channels                 | 0.5       |
| 10    | electron-builder pack + signing + CI matrix                        | 1.5       |
| 11    | Playwright E2E test harness in CI                                  | 1.0       |
| 12    | Beta polish, perf tuning, doc                                      | 1.0       |

**Total: ~11.5 engineer-weeks** (2.5–3 months for a solo dev, 6 weeks for a pair).

---

## 16. Risks & Mitigation

| Risk                                                  | Likelihood | Impact | Mitigation                                                          |
| ----------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------- |
| CDP API changes between Chromium versions             | Medium     | Med    | Pin Electron version per release; smoke-test CDP at upgrade time.   |
| Code-signing certificate revoked / expired            | Low        | High   | Maintain a backup cert; document rotation in `docs/release.md`.     |
| macOS notarization rejection                          | Medium     | Med    | Hardened runtime + entitlements + automated notarytool in CI.       |
| Playwright + custom Chromium binary mismatch          | Medium     | Med    | Use `playwright-core` (no binary) — attach to Electron's Chromium.  |
| keytar native build breaks on Linux distro            | Medium     | Low    | Provide `--no-keychain` fallback; degrade to AES-encrypted file.    |
| Backend PyInstaller bundle bloat                      | Medium     | Low    | Use `--exclude-module` aggressively; consider `nuitka` as alt.      |
| User data migration from web localStorage             | Low        | High   | First-run migration wizard; back up `localStorage` to JSON before clearing. |
| Electron security advisory mid-cycle                  | Medium     | High   | Subscribe to `electron-releases`; emergency patch SLA = 72 hours.   |

---

## 17. Modules That Can Be Reused **Unchanged**

These run cleanly inside the Electron renderer with **zero code changes**:

- `App.js`, `index.js`
- `context/OSContext.js`
- `components/Desktop.js`, `Window.js`, `TopBar.js`, `Dock.js`, `MissionControl.js`,
  `CommandPalette.js`, `NotificationCenter.js`, `AIDock.js`, `CortexWelcomeCard.js`,
  `CortexTimeline.js`, `LockScreen.js`, `MarkdownRenderer.js`, `WallpaperStudio.js`,
  `AuthScreen.js`, `BrowserIntelBar.js`, `ErrorBoundary.js`
- `widgets/*`
- `lib/cortexActions.js`, `cortexContext.js`, `memoryEngine.js`, `activityTimeline.js`,
  `workspaceSnapshot.js`, `contextResolver.js`, `speechCorrection.js`, `wallpapers.js`,
  `apps.js`
- `hooks/*`, `styles/*`, `constants/*`
- `apps/AIChat.js`, `Voice.js`, `Notes.js`, `Tasks.js`, `Calendar.js`,
  `Music.js`, `Watchlist.js`, `Finance.js`, `Settings.js`, `Memory.js`,
  `Dashboard.js`, `Analytics.js`, `Clipboard.js`, `ImageGen.js`, `Videos.js`,
  `CodeEditor.js`, `DiscordApp.js`

**Backend (`backend/server.py`, `providers.py`)** also reused unchanged — it is
launched as a child process from the Electron main, bound to localhost:randport.

---

## 18. Modules That Require Refactoring

| Module                  | Change Required                                                     |
| ----------------------- | ------------------------------------------------------------------- |
| `apps/Browser.js`       | Replace `<iframe>` with `omni.tabs.*` IPC. Drop BLOCKED_HOSTS panel — Electron tabs never get embed-blocked. Add per-tab state.            |
| `apps/FileManager.js`   | Swap CRUD calls to `omni.fs.*` IPC; gain real folders + drag-drop.  |
| `lib/api.js`            | Add `getBackendBaseUrl()` that returns the Electron-supplied port; preserve `REACT_APP_BACKEND_URL` fallback for web build.                |
| `OSContext.js`          | When `window.omni` exists, mirror `pushNotification` → `omni.notify.show`; mirror auth token to/from `omni.creds`.                          |
| `cortexActions.js`      | Add new action types: `browser_automate`, `read_file`, `write_file`, `fs_pick`. Each routed through `omni.*` IPC.                          |
| `apps/Clipboard.js`     | Replace polled `navigator.clipboard.readText()` with native main-process clipboard watcher via `omni.clipboard.*` IPC + `clipboard-event-handler` lib. |
| `AIDock.js`             | Wire the existing "Summarize page" suggestion to fetch real DOM via `omni.cdp.evaluate` instead of just the URL string.                    |

All other modules are pure React/Tailwind/Framer and translate 1:1.

---

## 19. Decision Log Reference

- **WebContentsView vs `<webview>`:** chose WebContentsView — `<webview>` is
  deprecated and slower; main-process control is cleaner.
- **Pure CDP vs Playwright:** chose Playwright for the Cortex automation surface
  because the developer ergonomics (`page.fill`, `waitForSelector`) are
  significantly better than raw CDP, and the runtime cost is identical (it's
  just a typed wrapper).
- **Local backend (FastAPI subprocess) vs SQLite-in-Node:** chose FastAPI
  subprocess to keep one codebase between web and desktop. SQLite is a
  follow-up optimization once the API is stabilized.
- **electron-builder vs electron-forge:** electron-builder for richer code-sign
  / multi-target support.
- **Electron version policy:** track the most recent **stable** release on a
  6-week cadence (matches Chromium milestones); pin Electron + dependent
  native modules in lockstep.

---

## 20. What Is **Not** Migrating to Electron in v1

Deferred to v2:
- iOS / Android via Capacitor (re-uses the same renderer; different shell).
- Real-time collaboration (CRDT) on Notes and Tasks.
- Plugin SDK for third-party apps inside OmniverseOS.
- Voice activation outside the window (always-on hotword).

---

**End of blueprint.** This document is the authoritative source for the Alpha 1.0
Electron migration. Any deviation must be tracked in `docs/architecture-decisions/`
and reviewed by the Principal Architect.
