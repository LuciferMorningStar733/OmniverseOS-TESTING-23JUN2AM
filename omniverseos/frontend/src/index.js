import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// ── Global error display (dev + prod) ─────────────────────────────────────────
// Surfaces runtime crashes visibly on mobile where no DevTools are open.
function showCrash(msg) {
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
        </div>`;
    }
  } catch (_) { /* silent */ }
}

window.addEventListener("error", (e) => showCrash(e.message || e.error));
window.addEventListener("unhandledrejection", (e) => showCrash(e.reason));

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
