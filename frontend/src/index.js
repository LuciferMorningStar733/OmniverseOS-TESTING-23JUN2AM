import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// ── Global error display (dev + prod) ─────────────────────────────────────────
// Surfaces runtime crashes visibly on mobile where no DevTools are open.
// HARDENED (Track A8): ignore benign browser noise so a ResizeObserver hiccup
// or a cancelled fetch during navigation never wipes the entire OS UI.

const BENIGN_ERROR_PATTERNS = [
  /ResizeObserver loop/i,
  /ResizeObserver loop limit exceeded/i,
  /Non-Error promise rejection captured/i,
  /Loading chunk \d+ failed/i,
  /Loading CSS chunk/i,
  /AbortError/i,
  /The operation was aborted/i,
  /cancelled/i,
  /NetworkError when attempting to fetch resource/i,
  /Script error\.?$/i,
];

function isBenign(msg) {
  if (!msg) return true;
  const s = String(msg);
  return BENIGN_ERROR_PATTERNS.some((re) => re.test(s));
}

let crashShown = false;
function showCrash(msg) {
  if (isBenign(msg)) return;
  if (crashShown) return; // never overwrite an existing crash panel
  crashShown = true;
  try {
    const el = document.getElementById("root");
    if (el) {
      el.innerHTML = `
        <div style="position:fixed;inset:0;background:#05050a;display:flex;flex-direction:column;
                    align-items:center;justify-content:center;padding:24px;font-family:monospace;z-index:99999">
          <div style="color:#FF003C;font-size:13px;font-weight:700;letter-spacing:.08em;margin-bottom:12px">
            ⚠ RUNTIME CRASH
          </div>
          <div style="color:#e2e8f0;font-size:11px;line-height:1.6;max-width:360px;
                      background:rgba(255,0,60,0.08);border:1px solid rgba(255,0,60,0.25);
                      border-radius:10px;padding:14px;word-break:break-all;white-space:pre-wrap">
            ${String(msg).slice(0, 600)}
          </div>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 16px;
                      background:rgba(0,240,255,0.1);border:1px solid rgba(0,240,255,0.3);
                      border-radius:8px;color:#00F0FF;font-family:monospace;font-size:11px;
                      cursor:pointer;letter-spacing:0.05em">
            RELOAD
          </button>
        </div>`;
    }
  } catch (_) { /* silent */ }
}

window.addEventListener("error", (e) => {
  const msg = e?.message || e?.error?.message || e?.error;
  if (isBenign(msg)) {
    // Swallow benign browser noise (esp. ResizeObserver loops from framer-motion).
    e.preventDefault?.();
    return;
  }
  showCrash(msg);
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = e?.reason?.message || e?.reason;
  if (isBenign(reason)) {
    e.preventDefault?.();
    return;
  }
  showCrash(reason);
});

// ── React root ────────────────────────────────────────────────────────────────
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err) { showCrash(err?.stack || err?.message || err); }
  render() {
    if (this.state.error) return null; // showCrash already injected HTML
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
);
