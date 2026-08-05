/**
 * crossToolBridge — P11 Cross-Tool AI Continuity
 *
 * Stores structured context in localStorage so a completed analysis
 * in one tool can seed the next tool with relevant conclusions.
 *
 * Schema:
 * {
 *   from:      "adversary" | "warroom" | "deadreckoning"
 *   to:        "warroom"  | "deadreckoning"
 *   label:     Human-readable description of what was transferred
 *   context:   Compact structured text (not a raw dump)
 *   ts:        ISO timestamp
 * }
 */

const KEY = "omniverse_cross_tool";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function writeCrossToolContext({ from, to, label, context }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ from, to, label, context, ts: new Date().toISOString() }));
  } catch {}
}

export function readCrossToolContext(expectedTo) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.to !== expectedTo) return null;
    if (Date.now() - new Date(data.ts).getTime() > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

export function clearCrossToolContext() {
  try { localStorage.removeItem(KEY); } catch {}
}

// ── Formatters — build compact structured context for each transfer ────────

export function adversaryToWarRoom({ idea, attackText, surviveText }) {
  const lines = [];
  lines.push("ADVERSARY ANALYSIS CONTEXT");
  lines.push("==========================");
  lines.push(`Original idea: ${idea.slice(0, 300)}${idea.length > 300 ? "…" : ""}`);
  if (surviveText) {
    lines.push("");
    lines.push("What survived the attack (defensible core):");
    lines.push(surviveText.slice(0, 600) + (surviveText.length > 600 ? "…" : ""));
  }
  if (attackText) {
    lines.push("");
    lines.push("Key attack points (vulnerabilities identified):");
    lines.push(attackText.slice(0, 600) + (attackText.length > 600 ? "…" : ""));
  }
  return lines.join("\n");
}

export function warRoomToDeadReckoning({ situation, agents }) {
  const lines = [];
  lines.push("WAR ROOM CONTEXT");
  lines.push("================");
  lines.push(`Situation analysed: ${situation.slice(0, 300)}${situation.length > 300 ? "…" : ""}`);
  lines.push("");
  lines.push("Key expert perspectives:");
  agents.forEach((a) => {
    if (a.text) {
      lines.push(`\n${a.name || a.id}:`);
      lines.push((a.text || "").slice(0, 300) + (a.text?.length > 300 ? "…" : ""));
    }
  });
  return lines.join("\n");
}
