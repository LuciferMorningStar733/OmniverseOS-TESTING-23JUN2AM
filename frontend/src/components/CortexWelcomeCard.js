import React, { useMemo } from "react";
import { getRecentApps, getRecentUrls } from "../lib/activityTimeline";
import { memGet } from "../lib/memoryEngine";
import { getAutoSnapshot } from "../lib/workspaceSnapshot";
import { getApp } from "../lib/apps";
import { useOS } from "../context/OSContext";

// ─── Inline styles (no CSS file dependency, zero-perf impact) ───────────────
// All colours use OmniverseOS cyan/glass design language.

const S = {
  card: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 380,
    background: "rgba(0,10,20,0.82)",
    border: "1px solid rgba(0,240,255,0.18)",
    borderRadius: 16,
    backdropFilter: "blur(18px)",
    padding: "28px 28px 20px",
    color: "#e0f7ff",
    fontFamily: "'SF Pro Display', 'Inter', sans-serif",
    boxShadow: "0 0 40px rgba(0,240,255,0.08), 0 8px 32px rgba(0,0,0,0.5)",
    zIndex: 10,
    userSelect: "none",
  },
  greeting: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 4,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  sub: {
    fontSize: 13,
    color: "rgba(0,240,255,0.65)",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(0,240,255,0.5)",
    marginBottom: 8,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(0,240,255,0.08)",
    border: "1px solid rgba(0,240,255,0.14)",
    borderRadius: 8,
    padding: "4px 10px",
    fontSize: 12,
    color: "#c8f6ff",
    cursor: "pointer",
    margin: "0 4px 6px 0",
    transition: "background 0.15s",
  },
  urlChip: {
    display: "block",
    background: "rgba(0,240,255,0.06)",
    border: "1px solid rgba(0,240,255,0.1)",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 11,
    color: "rgba(200,246,255,0.75)",
    cursor: "pointer",
    marginBottom: 5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },
  dismissBtn: {
    marginTop: 18,
    width: "100%",
    padding: "8px 0",
    background: "rgba(0,240,255,0.1)",
    border: "1px solid rgba(0,240,255,0.2)",
    borderRadius: 8,
    color: "rgba(0,240,255,0.9)",
    fontSize: 13,
    cursor: "pointer",
    letterSpacing: "0.03em",
    transition: "background 0.15s",
  },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function friendlyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname.slice(0, 24) : "");
  } catch {
    return url.slice(0, 30);
  }
}

/**
 * CortexWelcomeCard
 * Shown on the Desktop when no windows are open.
 * Surfaces recent apps + URLs from the ActivityTimeline.
 *
 * Props:
 *   onOpenApp  (appId: string) => void
 *   onOpenUrl  (url: string) => void
 *   onDismiss  () => void
 */
export default function CortexWelcomeCard({ onOpenApp, onOpenUrl, onDismiss }) {
  const { restoreLastWorkspace, user } = useOS();
  const recentApps = useMemo(() => getRecentApps(6), []);
  const recentUrls = useMemo(() => getRecentUrls(4), []);
  const autoSnap   = useMemo(() => getAutoSnapshot(), []);
  const userName   = memGet("userName", null) || user?.name || null;

  const hasContent = recentApps.length > 0 || recentUrls.length > 0;

  return (
    <div style={S.card} data-testid="cortex-welcome-card">
      {/* Header */}
      <div style={S.greeting}>
        {greeting()}{userName ? `, ${userName}` : ""}
      </div>
      <div style={S.sub}>Welcome back to OmniverseOS</div>

      {/* Workspace Restore (Priority 2) */}
      {autoSnap.hasSnapshot && (
        <button
          data-testid="welcome-restore-workspace"
          onClick={() => {
            const n = restoreLastWorkspace?.();
            if (n > 0) onDismiss?.();
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            background: "rgba(0,240,255,0.08)",
            border: "1px solid rgba(0,240,255,0.22)",
            borderRadius: 10, padding: "10px 12px",
            color: "#bdf2ff", fontSize: 13, cursor: "pointer",
            marginBottom: 16,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,240,255,0.14)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,240,255,0.08)"}
        >
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(0,240,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="fa-solid fa-rotate-left" style={{ color: "#00F0FF", fontSize: 13 }} />
          </span>
          <span style={{ flex: 1, textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 600 }}>Restore last session</div>
            <div style={{ color: "rgba(0,240,255,0.55)", fontSize: 11, marginTop: 2 }}>
              {autoSnap.windowCount} {autoSnap.windowCount === 1 ? "window" : "windows"} · {autoSnap.appIds.slice(0, 3).join(", ")}
            </div>
          </span>
          <i className="fa-solid fa-arrow-right" style={{ color: "rgba(0,240,255,0.5)", fontSize: 11 }} />
        </button>
      )}

      {hasContent ? (
        <>
          {/* Recent Apps */}
          {recentApps.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.sectionTitle}>Recent Apps</div>
              <div>
                {recentApps.map(appId => {
                  const app = getApp(appId);
                  return (
                    <span
                      key={appId}
                      style={S.chip}
                      onClick={() => onOpenApp?.(appId)}
                      title={`Open ${app?.name ?? appId}`}
                    >
                      {app?.icon ? <span>{app.icon}</span> : null}
                      {app?.name ?? appId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent URLs */}
          {recentUrls.length > 0 && (
            <div>
              <div style={S.sectionTitle}>Recent Sites</div>
              {recentUrls.map(url => (
                <span
                  key={url}
                  style={S.urlChip}
                  onClick={() => onOpenUrl?.(url)}
                  title={url}
                >
                  {friendlyUrl(url)}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: "rgba(0,240,255,0.4)", marginBottom: 8 }}>
          No recent activity yet. Open an app to get started.
        </div>
      )}

      <button style={S.dismissBtn} onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
