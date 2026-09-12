// Dev-only: connect Reticle. Imported for its side effect from src/index.tsx.
//
// CRA's public/index.html is a static template the bundler never processes for
// modules, so the connect cannot live there. The pairing token arrives through
// REACT_APP_RETICLE_TOKEN because REACT_APP_* is the only thing CRA inlines
// into browser code.
if (process.env.NODE_ENV === 'development') {
  void import('@reticlehq/react').then((sdk) => {
    // On its own line: CRA boilerplate prettier caps lines at 80.
    const { reticle, install, registerCapabilities } = sdk;
    install();
    const token = process.env.REACT_APP_RETICLE_TOKEN ?? '';
    // Written by `reticle init` from the daemon that was live when it ran, and
    // refreshed by re-running it. CRA gives us no hook to resolve this at
    // dev-server start, so if the daemon moves, re-run `reticle init` rather
    // than editing the url below.
    const url = process.env.REACT_APP_RETICLE_URL ?? '';
    // Loud on purpose: without this the only symptom is the bridge's generic
    // auth failure.
    if (token.length === 0) {
      console.error(
        "[reticle] REACT_APP_RETICLE_TOKEN is not set, so Reticle " +
        "cannot pair with the daemon. The pairing token is " +
        "per-machine and .env.development.local is gitignored by " +
        "CRA's template, so it does not survive a clone. Run " +
        "`npx @reticlehq/server init` in this project to write it for this " +
        "machine.",
      );
    }
    // Still attempt it — a bridge running without a token pairs fine.
    reticle.connect({
      projectId: 'frontend-4ecc9fb6',
      ...(url.length > 0 ? { url } : {}),
      ...(token.length > 0 ? { token } : {}),
    });
    // What the agent can drive without guessing.
    registerCapabilities({
      testids: ['error-boundary', 'adaptive-dock', 'location-backdrop-btn', 'dock-root', 'topbar', 'notes-app', 'calendar-app', 'cortex-trigger', 'chat-input', 'ai-chat-input', 'ai-chat-messages', 'chat-messages', 'desktop-wallpaper', 'dock', 'settings-app', 'adversary-app', 'ai-chat-app', 'ai-chat-header', 'chat-send', 'analytics-app', 'black-box-app', 'browser-app', 'browser-url-input', 'clipboard-app', 'clipboard-label', 'clipboard-input', 'clipboard-paste', 'clipboard-save', 'code-app', 'code-run', 'code-input', 'dashboard-app', 'discord-app', 'discord-input', 'files-app', 'new-folder', 'new-file', 'finance-app', 'txn-title', 'txn-amount', 'txn-add', 'imagegen-app', 'image-prompt', 'image-generate', 'memory-app', 'music-app', 'play-toggle', 'notes-new', 'note-content', 'omniverse-zero-app', 'zero-input', 'tasks-app', 'task-input', 'task-add', 'videos-app', 'video-player', 'voice-app', 'warroom-app', 'watchlist-app', 'context-chips'],
      signals: [], // names you pass to reticle.signal()
      stores: [], // register a store above, then name its key here
    });
  });
}

