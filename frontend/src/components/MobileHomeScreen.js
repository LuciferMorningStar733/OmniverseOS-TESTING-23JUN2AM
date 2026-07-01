import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileWidgetView from "../widgets/MobileWidgetView";
import MobileAppDrawer from "./MobileAppDrawer";

// Dock pinned apps — Cortex, Browser, Files, Settings (4 apps only)
export const PINNED_APP_IDS = ["voice", "browser", "files", "settings"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getGreeting(hour) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getAIBrief(hour) {
  if (hour < 6)
    return "The night is quiet. Cortex has been running background analysis. Your focus window opens at dawn.";
  if (hour < 9)
    return "Morning brief ready. 2 tasks due today, no conflicts in your schedule. Cortex reviewed your overnight activity.";
  if (hour < 12)
    return "You have 3 events before noon. Cortex suggests prioritising high-impact tasks now while focus is sharpest.";
  if (hour < 15)
    return "Afternoon check-in: tasks on track. Cortex identified 2 research threads from your recent sessions.";
  if (hour < 18)
    return "Energy dip zone. Cortex recommends a short break, then your most creative work before 6 PM.";
  return "Evening wind-down. Cortex has summarised your day and prepared tomorrow's brief. You're ahead of schedule.";
}

// ── Shared glass style ─────────────────────────────────────────────────────────

const GLASS = {
  background: "rgba(6, 8, 18, 0.58)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.055)",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function CortexSearchBar({ onTap }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.32, ease: "easeOut" }}
      style={{ padding: "12px 16px 0", flexShrink: 0 }}
    >
      <motion.button
        onTouchEnd={onTap}
        onClick={onTap}
        whileTap={{ scale: 0.975 }}
        aria-label="Search Cortex"
        role="button"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          borderRadius: 16,
          background: "rgba(8, 10, 22, 0.72)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(0,240,255,0.18)",
          boxShadow: "0 0 0 1px rgba(0,240,255,0.05), 0 4px 16px rgba(0,0,0,0.35)",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <div
          style={{
            width: 26, height: 26, borderRadius: 8,
            background: "linear-gradient(135deg, rgba(0,240,255,0.22), rgba(0,240,255,0.08))",
            border: "1px solid rgba(0,240,255,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i className="fa-solid fa-microphone" style={{ color: "#00F0FF", fontSize: 12 }} />
        </div>
        <span style={{
          flex: 1,
          fontSize: 14,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 400,
          color: "rgba(255,255,255,0.35)",
          textAlign: "left",
          userSelect: "none",
          letterSpacing: "0.005em",
        }}>
          Search Cortex…
        </span>
        <div style={{
          padding: "3px 10px", borderRadius: 20,
          background: "rgba(0,240,255,0.10)",
          border: "1px solid rgba(0,240,255,0.20)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: "#00F0FF", fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>AI</span>
        </div>
      </motion.button>
    </motion.div>
  );
}

function GreetingSection({ userName, now }) {
  const hour = now.getHours();
  const greeting = getGreeting(hour);
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.10, type: "spring", damping: 30, stiffness: 280 }}
      style={{ padding: "20px 20px 10px" }}
    >
      {/* Clock */}
      <div style={{
        fontSize: "clamp(36px, 10vw, 52px)",
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 200,
        color: "#ffffff",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        textShadow: "0 2px 24px rgba(0,0,0,0.55), 0 0 48px rgba(0,240,255,0.06)",
        userSelect: "none",
      }}>
        {timeStr}
      </div>
      <div style={{
        fontSize: 13,
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 400,
        color: "rgba(255,255,255,0.40)",
        marginTop: 5,
        userSelect: "none",
        letterSpacing: "0.01em",
      }}>
        {dateStr}
      </div>
      <div style={{
        fontSize: 19,
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 600,
        color: "rgba(255,255,255,0.88)",
        marginTop: 16,
        letterSpacing: "-0.01em",
        userSelect: "none",
      }}>
        {greeting}{userName ? `, ${userName}` : ""}
      </div>
    </motion.div>
  );
}

function AIBriefCard({ now }) {
  const [orbActive, setOrbActive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOrbActive(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.17, type: "spring", damping: 26, stiffness: 260 }}
      style={{ margin: "0 16px 12px", ...GLASS }}
    >
      <div style={{ padding: "16px 18px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
          {/* Cortex orb */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 11,
              background: "linear-gradient(135deg, rgba(0,240,255,0.28), rgba(0,240,255,0.08))",
              border: "1px solid rgba(0,240,255,0.38)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 18px rgba(0,240,255,0.20)",
            }}>
              <i className="fa-solid fa-brain" style={{ color: "#00F0FF", fontSize: 15, filter: "drop-shadow(0 0 6px rgba(0,240,255,0.9))" }} />
            </div>
            {orbActive && (
              <motion.div
                animate={{ scale: [1, 1.65, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ repeat: 5, duration: 1.5 }}
                style={{
                  position: "absolute", inset: -5,
                  borderRadius: 16,
                  border: "1px solid rgba(0,240,255,0.40)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          <div>
            <div style={{ fontSize: 10.5, color: "#00F0FF", fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", opacity: 0.90 }}>
              Cortex Brief
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", fontFamily: "'Outfit', sans-serif" }}>
              AI Daily Summary
            </div>
          </div>

          {/* Live badge */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 6px rgba(0,240,255,0.8)" }}
            />
            <span style={{ fontSize: 9, color: "#00F0FF", fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
          </div>
        </div>

        <p style={{
          fontSize: 13.5,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 400,
          color: "rgba(255,255,255,0.70)",
          lineHeight: 1.6,
          margin: 0,
          userSelect: "none",
        }}>
          {getAIBrief(now.getHours())}
        </p>
      </div>
    </motion.div>
  );
}

function QuickStatsRow({ now }) {
  const tiles = useMemo(() => [
    { icon: "fa-calendar",    color: "#FB923C", label: "Schedule", value: "3 events" },
    { icon: "fa-list-check",  color: "#39FF14", label: "Tasks",    value: "2 due"   },
    { icon: "fa-brain",       color: "#2DD4BF", label: "Memory",   value: "Active"  },
    { icon: "fa-bell",        color: "#F59E0B", label: "Alerts",   value: "1 new"   },
  ], []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, type: "spring", damping: 28, stiffness: 260 }}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        margin: "0 16px 12px",
      }}
    >
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.24 + i * 0.04, type: "spring", damping: 24, stiffness: 360 }}
          style={{
            ...GLASS,
            borderRadius: 16,
            padding: "12px 6px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: `${tile.color}14`,
            border: `1px solid ${tile.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className={`fa-solid ${tile.icon}`} style={{ color: tile.color, fontSize: 13 }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em", userSelect: "none" }}>
            {tile.value}
          </div>
          <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.32)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.01em", userSelect: "none" }}>
            {tile.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function CalendarCard({ onOpenApp }) {
  const events = [
    { time: "10:00 AM", title: "Team Sync",       color: "#00F0FF" },
    { time: "2:30 PM",  title: "Project Review",  color: "#FB923C" },
    { time: "5:00 PM",  title: "Focus Session",   color: "#A855F7" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px", ...GLASS }}
    >
      <div style={{ padding: "15px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-calendar" style={{ color: "#FB923C", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(251,146,60,0.65))" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
              Today's Schedule
            </span>
          </div>
          <button
            onClick={() => onOpenApp("calendar")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, WebkitTapHighlightColor: "transparent" }}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "rgba(255,255,255,0.22)", fontSize: 11 }} />
          </button>
        </div>

        {events.map((ev, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 11,
              paddingBottom: i < events.length - 1 ? 11 : 0,
              marginBottom: i < events.length - 1 ? 11 : 0,
              borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <div style={{
              width: 3, height: 36, borderRadius: 2,
              background: `linear-gradient(to bottom, ${ev.color}, ${ev.color}50)`,
              flexShrink: 0,
              boxShadow: `0 0 10px ${ev.color}70`,
            }} />
            <div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>
                {ev.title}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>
                {ev.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MemoryCard({ onOpenApp }) {
  const items = [
    { icon: "fa-note-sticky", color: "#F59E0B", text: "Ideas for the new project structure" },
    { icon: "fa-brain",       color: "#2DD4BF", text: "Cortex learned your reading schedule" },
    { icon: "fa-clipboard",   color: "#818CF8", text: "Copied: API endpoint from docs" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px", ...GLASS }}
    >
      <div style={{ padding: "15px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-brain" style={{ color: "#2DD4BF", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(45,212,191,0.65))" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
              Memory
            </span>
          </div>
          <button
            onClick={() => onOpenApp("memory")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, WebkitTapHighlightColor: "transparent" }}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "rgba(255,255,255,0.22)", fontSize: 11 }} />
          </button>
        </div>

        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              paddingBottom: i < items.length - 1 ? 10 : 0,
              marginBottom: i < items.length - 1 ? 10 : 0,
              borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: `${item.color}14`, border: `1px solid ${item.color}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 11 }} />
            </div>
            <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.62)", fontFamily: "'Outfit', sans-serif", lineHeight: 1.48, paddingTop: 4 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function RecentNotesCard({ onOpenApp }) {
  const notes = [
    { title: "Project Architecture",  preview: "Microservices vs monolith trade-offs for the new…", time: "2h ago",  color: "#F59E0B" },
    { title: "Meeting Notes",         preview: "Q3 roadmap finalized. Key points: mobile-first…",  time: "Yesterday", color: "#60A5FA" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.40, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px", ...GLASS }}
    >
      <div style={{ padding: "15px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-note-sticky" style={{ color: "#F59E0B", fontSize: 13, filter: "drop-shadow(0 0 5px rgba(245,158,11,0.65))" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
              Recent Notes
            </span>
          </div>
          <button
            onClick={() => onOpenApp("notes")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, WebkitTapHighlightColor: "transparent" }}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "rgba(255,255,255,0.22)", fontSize: 11 }} />
          </button>
        </div>

        {notes.map((note, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              paddingBottom: i < notes.length - 1 ? 11 : 0,
              marginBottom: i < notes.length - 1 ? 11 : 0,
              borderBottom: i < notes.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `${note.color}14`, border: `1px solid ${note.color}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="fa-solid fa-note-sticky" style={{ color: note.color, fontSize: 14 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.82)", fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {note.title}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
                  {note.time}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.38)", fontFamily: "'Outfit', sans-serif", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {note.preview}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuickAccessRow({ onOpenApp }) {
  const apps = [
    { id: "chat",      name: "AI Chat",   icon: "fa-comments",    color: "#00F0FF" },
    { id: "notes",     name: "Notes",     icon: "fa-note-sticky",  color: "#F59E0B" },
    { id: "tasks",     name: "Tasks",     icon: "fa-list-check",   color: "#39FF14" },
    { id: "calendar",  name: "Calendar",  icon: "fa-calendar",     color: "#FB923C" },
    { id: "music",     name: "Music",     icon: "fa-music",        color: "#F472B6" },
    { id: "memory",    name: "Memory",    icon: "fa-brain",        color: "#2DD4BF" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.46, type: "spring", damping: 28, stiffness: 260 }}
      style={{ margin: "0 16px 12px" }}
    >
      <div style={{
        fontSize: 10.5,
        color: "rgba(255,255,255,0.30)",
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        fontWeight: 700,
        marginBottom: 10,
        paddingLeft: 2,
      }}>
        Quick Access
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px 0" }}>
        {apps.map((app, i) => (
          <AppQuickIcon key={app.id} app={app} onPress={onOpenApp} delay={0.48 + i * 0.03} />
        ))}
      </div>
    </motion.div>
  );
}

function AppQuickIcon({ app, onPress, delay }) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.70 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", damping: 22, stiffness: 380 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <motion.button
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => { setPressed(false); onPress(app.id); }}
        onPointerLeave={() => setPressed(false)}
        animate={{ scale: pressed ? 0.80 : 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 22, mass: 0.18 }}
        aria-label={`Open ${app.name}`}
        role="button"
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
          background: "transparent", border: "none", cursor: "pointer",
          padding: "7px 3px",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation", userSelect: "none",
          minWidth: 52,
        }}
      >
        <div style={{
          width: 50, height: 50, borderRadius: 15,
          background: `linear-gradient(145deg, ${app.color}1A 0%, ${app.color}08 100%)`,
          border: `1px solid ${app.color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 18px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.07)`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "relative", overflow: "hidden",
        }}>
          <i className={`fa-solid ${app.icon}`} style={{ color: app.color, fontSize: 21, filter: `drop-shadow(0 0 7px ${app.color}88)` }} />
        </div>
        <span style={{
          fontSize: 9.5, fontFamily: "'Outfit', sans-serif", fontWeight: 500,
          color: "rgba(255,255,255,0.62)",
          textAlign: "center", lineHeight: 1.2, maxWidth: 56,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textShadow: "0 1px 6px rgba(0,0,0,0.9)", userSelect: "none",
        }}>
          {app.name}
        </span>
      </motion.button>
    </motion.div>
  );
}

function AppLibraryHint({ onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.5 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 4,
        paddingBottom: 12,
        gap: 3,
        flexShrink: 0,
      }}
    >
      <motion.button
        onTouchEnd={onOpen}
        onClick={onOpen}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "8px 28px",
          WebkitTapHighlightColor: "transparent",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}
      >
        <motion.i
          className="fa-solid fa-chevron-up"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.20)" }}
        />
        <span style={{
          fontSize: 10, color: "rgba(255,255,255,0.18)",
          fontFamily: "'Outfit', sans-serif", letterSpacing: "0.06em",
          userSelect: "none",
        }}>
          App Library
        </span>
      </motion.button>
    </motion.div>
  );
}

// ── AI Home content (the main scrollable feed) ─────────────────────────────────

function AIHomeContent({ onOpenApp, onOpenDrawer }) {
  const now = useClock();
  const userName = useMemo(() => {
    try { return localStorage.getItem("omniverse_user_name") || ""; } catch { return ""; }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Search bar — stays at top */}
      <CortexSearchBar onTap={onOpenDrawer} />

      {/* Scrollable feed */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <GreetingSection userName={userName} now={now} />
        <AIBriefCard now={now} />
        <QuickStatsRow now={now} />
        <CalendarCard onOpenApp={onOpenApp} />
        <MemoryCard onOpenApp={onOpenApp} />
        <RecentNotesCard onOpenApp={onOpenApp} />
        <QuickAccessRow onOpenApp={onOpenApp} />
        {/* Bottom breathing room */}
        <div style={{ height: 12 }} />
      </div>

      {/* App Library swipe-up hint */}
      <AppLibraryHint onOpen={onOpenDrawer} />
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function MobileHomeScreen({ onOpenApp }) {
  const [showDrawer, setShowDrawer] = useState(false);

  // Pages: 0 = widget view (swipe right), 1 = AI home (default)
  const [globalPage, setGlobalPage] = useState(1);
  const [direction, setDirection] = useState(0);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const axisLocked = useRef(null); // null=undecided, 'h'=horizontal, 'v'=vertical

  const navigate = useCallback((delta) => {
    setGlobalPage((p) => {
      const next = Math.max(0, Math.min(1, p + delta));
      setDirection(delta);
      return next;
    });
  }, []);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    axisLocked.current = null;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (axisLocked.current === null && (dx > 8 || dy > 8)) {
      axisLocked.current = dx > dy ? "h" : "v";
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const axis = axisLocked.current;
    touchStartX.current = null;
    axisLocked.current = null;

    // Swipe UP on home page → open App Drawer
    if (axis === "v" && dy < -70 && globalPage === 1 && !showDrawer) {
      setShowDrawer(true);
      return;
    }

    // Horizontal swipe → page navigation
    if (axis === "h" && Math.abs(dx) > 50) {
      if (dx < 0) navigate(1);   // swipe left (but home is already rightmost)
      if (dx > 0) navigate(-1);  // swipe right → widget page
    }
  }, [navigate, globalPage, showDrawer]);

  const isWidgetPage = globalPage === 0;

  const pageVariants = {
    initial: (dir) => ({ opacity: 0, x: dir > 0 ? "28%" : "-28%" }),
    animate: { opacity: 1, x: "0%" },
    exit:    (dir) => ({ opacity: 0, x: dir > 0 ? "-28%" : "28%" }),
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          bottom: 88,
          display: "flex",
          flexDirection: "column",
          zIndex: 8,
          pointerEvents: "auto",
          overflowX: "hidden",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Page area */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={globalPage}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.45 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {isWidgetPage ? (
                <MobileWidgetView />
              ) : (
                <AIHomeContent
                  onOpenApp={onOpenApp}
                  onOpenDrawer={() => setShowDrawer(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Page indicator dots */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 6, paddingBottom: 12, paddingTop: 4, flexShrink: 0,
        }}>
          {[0, 1].map((i) => {
            const isActive = i === globalPage;
            return (
              <motion.button
                key={i}
                onClick={() => { setDirection(i > globalPage ? 1 : -1); setGlobalPage(i); }}
                animate={{
                  width: isActive ? 20 : 6,
                  background: isActive
                    ? (i === 0 ? "#7C3AED" : "#00F0FF")
                    : "rgba(255,255,255,0.22)",
                }}
                transition={{ type: "spring", damping: 22, stiffness: 320 }}
                style={{
                  height: 6, borderRadius: 3,
                  border: "none", padding: 0, cursor: "pointer",
                  boxShadow: isActive
                    ? `0 0 10px ${i === 0 ? "rgba(124,58,237,0.65)" : "rgba(0,240,255,0.65)"}`
                    : "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              />
            );
          })}
        </div>

        {/* Widget page hint (only shown on home page) */}
        {globalPage === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 0.30, x: 0 }}
            transition={{ delay: 1.4, duration: 0.4 }}
            style={{
              position: "absolute",
              left: 12,
              top: "40%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 3,
              pointerEvents: "none",
            }}
          >
            <motion.i
              className="fa-solid fa-chevron-left"
              animate={{ x: [-3, 0, -3] }}
              transition={{ repeat: 3, duration: 1, delay: 1.6 }}
              style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}
            />
            <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", fontFamily: "'Outfit', sans-serif" }}>
              Widgets
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* App Drawer (portal-like, outside main container) */}
      <AnimatePresence>
        {showDrawer && (
          <MobileAppDrawer
            key="app-drawer"
            onClose={() => setShowDrawer(false)}
            onOpenApp={(id) => { setShowDrawer(false); onOpenApp(id); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
