/**
 * ExportManager.js — Cortex Data Export Panel
 * OmniverseOS — Feature 6.3: Export Everything
 *
 * Client-side data export: fetches from existing CRUD APIs, assembles
 * a ZIP file using JSZip (or falls back to single-JSON download),
 * and triggers a browser download.
 */
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { toast } from "sonner";

/* ── Data source definitions ─────────────────────────────────────────────── */
const SOURCES = [
  { id: "notes",        label: "Notes",         icon: "fa-sticky-note",      color: "#FCEE09", endpoint: "/notes",        format: "json" },
  { id: "tasks",        label: "Tasks",          icon: "fa-list-check",       color: "#39FF14", endpoint: "/tasks",        format: "json" },
  { id: "events",       label: "Calendar",       icon: "fa-calendar",         color: "#00F0FF", endpoint: "/events",       format: "json" },
  { id: "transactions", label: "Finance",        icon: "fa-dollar-sign",      color: "#F59E0B", endpoint: "/transactions", format: "json" },
  { id: "memories",     label: "Cortex Memory",  icon: "fa-brain",            color: "#A855F7", endpoint: "/memories",     format: "json" },
  { id: "clipboard",    label: "Clipboard",      icon: "fa-clipboard",        color: "#94A3B8", endpoint: "/clipboard",    format: "json" },
  { id: "images",       label: "Image History",  icon: "fa-image",            color: "#FF003C", endpoint: "/images",       format: "json" },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function slugDate() {
  return new Date().toISOString().slice(0, 10);
}

function toJSON(data) {
  return JSON.stringify(data, null, 2);
}

function toMarkdown(id, data) {
  if (!Array.isArray(data) || data.length === 0) return `# ${id}\n\n_No data._\n`;
  const lines = [`# ${id} export — ${slugDate()}`, ""];
  for (const item of data) {
    if (item.title || item.content || item.text || item.description || item.name) {
      lines.push(`## ${item.title || item.name || item.text || "(untitled)"}`);
      if (item.content)      lines.push(item.content);
      if (item.description)  lines.push(item.description);
      if (item.text)         lines.push(item.text);
      if (item.created_at)   lines.push(`\n_Created: ${item.created_at}_`);
      lines.push("");
    } else {
      lines.push("```json");
      lines.push(JSON.stringify(item, null, 2));
      lines.push("```");
      lines.push("");
    }
  }
  return lines.join("\n");
}

/** Download a string as a file */
function downloadBlob(content, filename, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Try to load JSZip dynamically — returns null if unavailable */
async function tryLoadJSZip() {
  try {
    const JSZip = (await import("jszip")).default;
    return JSZip;
  } catch {
    return null;
  }
}

/* ── Progress bar ────────────────────────────────────────────────────────── */
function ProgressBar({ progress, color = "#00F0FF" }) {
  return (
    <div style={{
      height: 4, borderRadius: 2, overflow: "hidden",
      background: "rgba(255,255,255,0.07)", marginTop: 8,
    }}>
      <motion.div
        animate={{ width: `${progress}%` }}
        transition={{ ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 2,
          boxShadow: `0 0 6px ${color}80` }}
      />
    </div>
  );
}

/* ── Source row ──────────────────────────────────────────────────────────── */
function SourceRow({ src, checked, onChange, status }) {
  const statusColor = status === "done" ? "#39FF14" : status === "error" ? "#FF003C" : status === "loading" ? "#F59E0B" : null;
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 10, cursor: "pointer",
      background: checked ? `${src.color}08` : "rgba(255,255,255,0.02)",
      border: checked ? `1px solid ${src.color}25` : "1px solid rgba(255,255,255,0.05)",
      transition: "all 0.18s", WebkitTapHighlightColor: "transparent",
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(src.id, e.target.checked)}
        style={{ display: "none" }}
      />
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: checked ? `2px solid ${src.color}` : "2px solid rgba(255,255,255,0.2)",
        background: checked ? src.color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.18s",
      }}>
        {checked && <i className="fa-solid fa-check" style={{ fontSize: 8, color: "#000" }} />}
      </div>
      <i className={`fa-solid ${src.icon}`} style={{ color: src.color, fontSize: 12, width: 16, textAlign: "center", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? "#fff" : "rgba(255,255,255,0.55)" }}>{src.label}</div>
      </div>
      {statusColor && (
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor,
          boxShadow: `0 0 8px ${statusColor}`, flexShrink: 0,
          animation: status === "loading" ? "orbPulse 1s ease-in-out infinite" : "none"
        }} />
      )}
      {status === "done" && <i className="fa-solid fa-check" style={{ color: "#39FF14", fontSize: 10 }} />}
      {status === "error" && <i className="fa-solid fa-xmark" style={{ color: "#FF003C", fontSize: 10 }} />}
    </label>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function ExportManager() {
  const [selected,  setSelected]  = useState(new Set(SOURCES.map((s) => s.id)));
  const [format,    setFormat]    = useState("zip"); // "zip" | "json"
  const [exporting, setExporting] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [statuses,  setStatuses]  = useState({});

  const toggleSource = useCallback((id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === SOURCES.length) setSelected(new Set());
    else setSelected(new Set(SOURCES.map((s) => s.id)));
  }, [selected]);

  const runExport = useCallback(async () => {
    const toExport = SOURCES.filter((s) => selected.has(s.id));
    if (toExport.length === 0) { toast.error("Select at least one data source."); return; }

    setExporting(true);
    setProgress(0);
    setStatuses({});

    const results = {};
    const step = 100 / toExport.length;

    for (let i = 0; i < toExport.length; i++) {
      const src = toExport[i];
      setStatuses((prev) => ({ ...prev, [src.id]: "loading" }));
      try {
        const res = await api.get(src.endpoint);
        results[src.id] = res.data;
        setStatuses((prev) => ({ ...prev, [src.id]: "done" }));
      } catch {
        results[src.id] = [];
        setStatuses((prev) => ({ ...prev, [src.id]: "error" }));
      }
      setProgress(Math.round((i + 1) * step));
    }

    // Assemble and download
    const date = slugDate();
    try {
      if (format === "zip") {
        const JSZip = await tryLoadJSZip();
        if (JSZip) {
          const zip = new JSZip();
          const folder = zip.folder(`omniverse-export-${date}`);
          for (const src of toExport) {
            const data = results[src.id];
            folder.file(`${src.id}.json`, toJSON(data));
            folder.file(`${src.id}.md`,   toMarkdown(src.label, data));
          }
          folder.file("README.md", `# OmniverseOS Data Export\n\nExported: ${new Date().toLocaleString()}\nSources: ${toExport.map((s) => s.label).join(", ")}\n`);
          const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `omniverse-export-${date}.zip`; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          toast.success(`Exported ${toExport.length} sources as ZIP`);
        } else {
          // JSZip not available — fall back to single JSON
          const all = {};
          for (const src of toExport) all[src.id] = results[src.id];
          downloadBlob(toJSON(all), `omniverse-export-${date}.json`, "application/json");
          toast.success("Exported as JSON (install jszip for ZIP support)");
        }
      } else {
        // Single JSON blob
        const all = {};
        for (const src of toExport) all[src.id] = results[src.id];
        downloadBlob(toJSON(all), `omniverse-export-${date}.json`, "application/json");
        toast.success(`Exported ${toExport.length} sources as JSON`);
      }
    } catch (err) {
      toast.error("Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  }, [selected, format]);

  const selectedCount = selected.size;
  const allSelected   = selected.size === SOURCES.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>
              Export Your Data
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginTop: 2 }}>
              All data stays local — no third-party servers.
            </div>
          </div>
          <button
            onClick={toggleAll}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 11, fontFamily: "monospace",
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.55)", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
      </div>

      {/* Sources */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SOURCES.map((src) => (
          <SourceRow
            key={src.id}
            src={src}
            checked={selected.has(src.id)}
            onChange={toggleSource}
            status={statuses[src.id]}
          />
        ))}
      </div>

      {/* Format selector */}
      <div>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
          Export Format
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "zip",  label: "ZIP Archive",    icon: "fa-file-zipper",  desc: "JSON + Markdown in one file" },
            { id: "json", label: "JSON Bundle",    icon: "fa-file-code",    desc: "Single JSON file" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                border: format === f.id ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                background: format === f.id ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.03)",
                color: format === f.id ? "#00F0FF" : "rgba(255,255,255,0.55)",
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                textAlign: "left", transition: "all 0.18s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i className={`fa-solid ${f.icon}`} style={{ fontSize: 12 }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
              </div>
              <div style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.6 }}>{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <AnimatePresence>
        {exporting && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div style={{ fontSize: 11, color: "rgba(0,240,255,0.7)", fontFamily: "monospace", marginBottom: 4 }}>
              Fetching data… {progress}%
            </div>
            <ProgressBar progress={progress} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={runExport}
        disabled={exporting || selectedCount === 0}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12,
          background: exporting ? "rgba(0,240,255,0.06)" : selectedCount === 0
            ? "rgba(255,255,255,0.04)"
            : "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,160,220,0.10))",
          border: selectedCount === 0 ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,240,255,0.35)",
          color: selectedCount === 0 ? "rgba(255,255,255,0.3)" : "#00F0FF",
          cursor: exporting || selectedCount === 0 ? "not-allowed" : "pointer",
          fontFamily: "monospace", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          transition: "all 0.2s",
          boxShadow: selectedCount > 0 && !exporting ? "0 0 24px rgba(0,240,255,0.10)" : "none",
        }}
      >
        {exporting ? (
          <><i className="fa-solid fa-spinner fa-spin" />Exporting {selectedCount} sources…</>
        ) : (
          <><i className="fa-solid fa-download" />Export {selectedCount} source{selectedCount !== 1 ? "s" : ""}</>
        )}
      </motion.button>

      {/* Footer note */}
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace",
        textAlign: "center", lineHeight: 1.6 }}>
        Your data belongs to you. Exports are processed entirely on your device.
      </div>
    </div>
  );
}
