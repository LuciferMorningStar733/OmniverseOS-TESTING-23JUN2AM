// Dev-only: connect Reticle. Imported for its side effect from src/index.tsx.
//
// CRA's public/index.html is a static template the bundler never processes for
// modules, so the connect cannot live there. The pairing token arrives through
// REACT_APP_RETICLE_TOKEN because REACT_APP_* is the only thing CRA inlines
// into browser code.
if (process.env.NODE_ENV === 'development') {
  void import('@reticlehq/react').then(({ reticle, install }) => {
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
  });
}

