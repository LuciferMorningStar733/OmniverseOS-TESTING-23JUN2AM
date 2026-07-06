/**
 * ProjectDNA — Persistent project intelligence layer.
 *
 * Each project stores: name, description, goals, roadmap,
 * architecture decisions, terminology, rejected ideas,
 * and unresolved questions.
 *
 * The Decisions tab shows the Decision Memory log for the project.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { projectsApi, decisionsApi } from "../lib/intelligenceApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PROJECT_COLORS = [
  "#00F0FF", "#7B2FFF", "#FF003C", "#39FF14",
  "#F59E0B", "#F472B6", "#60A5FA", "#2DD4BF",
];

const PROJECT_ICONS = [
  "fa-diagram-project", "fa-code", "fa-rocket",
  "fa-briefcase", "fa-brain", "fa-lightbulb",
  "fa-cube", "fa-flask", "fa-star",
];

const STATUS_COLORS = {
  active:    { bg: "rgba(0,240,255,0.08)", border: "rgba(0,240,255,0.25)", text: "#00F0FF" },
  archived:  { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)", text: "#64748b" },
  completed: { bg: "rgba(57,255,20,0.07)", border: "rgba(57,255,20,0.2)", text: "#39FF14" },
};

const DECISION_STATUS = {
  active:     { label: "Active",     color: "#00F0FF" },
  superseded: { label: "Superseded", color: "#F59E0B" },
  reversed:   { label: "Reversed",   color: "#FF003C" },
};

// ─── List item ────────────────────────────────────────────────────────────────
function ProjectItem({ project, isActive, onClick }) {
  const sc = STATUS_COLORS[project.status] || STATUS_COLORS.active;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "10px 12px",
        background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none", borderLeft: `2px solid ${isActive ? project.color : "transparent"}`,
        borderRadius: isActive ? "0 10px 10px 0" : "0 10px 10px 0",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${project.color}18`,
        border: `1px solid ${project.color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={`fa-solid ${project.icon || "fa-diagram-project"}`}
           style={{ color: project.color, fontSize: 12 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontFamily: "'Outfit', sans-serif",
          fontWeight: 500,
          color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {project.name}
        </div>
        <div style={{
          fontSize: 10, color: "rgba(255,255,255,0.3)",
          fontFamily: "'JetBrains Mono', monospace",
          marginTop: 1,
        }}>
          {project.goals?.length || 0} goals · {relTime(project.updated_at)}
        </div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, fontFamily: "monospace",
        color: sc.text, background: sc.bg,
        border: `1px solid ${sc.border}`,
        borderRadius: 4, padding: "2px 5px",
        letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
      }}>
        {project.status}
      </span>
    </motion.button>
  );
}

// ─── Tag list editor ──────────────────────────────────────────────────────────
function TagListEditor({ label, items, onChange, placeholder }) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (!v) return;
    onChange([...items, v]);
    setInput("");
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 10px 3px 10px",
            background: "rgba(0,240,255,0.07)",
            border: "1px solid rgba(0,240,255,0.18)",
            borderRadius: 20, fontSize: 11.5,
            color: "rgba(255,255,255,0.75)",
            fontFamily: "'Outfit', sans-serif",
          }}>
            {item}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.3)", padding: 0, lineHeight: 1,
                fontSize: 10,
              }}
            >×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: "5px 10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "rgba(255,255,255,0.7)",
            fontSize: 12, fontFamily: "'Outfit', sans-serif", outline: "none",
          }}
        />
        <button
          onClick={add}
          style={{
            padding: "5px 12px",
            background: "rgba(0,240,255,0.08)",
            border: "1px solid rgba(0,240,255,0.22)",
            borderRadius: 8, cursor: "pointer",
            color: "#00F0FF", fontSize: 11,
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Field editor ─────────────────────────────────────────────────────────────
function FieldEditor({ label, value, onChange, multiline, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 6,
      }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: "100%", padding: "8px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, color: "rgba(255,255,255,0.75)",
            fontSize: 13, fontFamily: "'Outfit', sans-serif",
            outline: "none", resize: "none",
            lineHeight: 1.6, boxSizing: "border-box",
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "7px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, color: "rgba(255,255,255,0.75)",
            fontSize: 13, fontFamily: "'Outfit', sans-serif",
            outline: "none", boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}

// ─── Decision Modal ───────────────────────────────────────────────────────────
function DecisionModal({ projectId, decision, onSave, onClose }) {
  const [form, setForm] = useState(decision || {
    title: "", summary: "", reasoning: "", alternatives: [],
    outcome: "", tags: [], status: "active",
    project_id: projectId || "",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    await onSave(form);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9990,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 540,
          background: "rgba(8,10,22,0.98)",
          border: "1px solid rgba(0,240,255,0.16)",
          borderRadius: 16, padding: 24,
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          maxHeight: "85vh", overflowY: "auto",
        }}
      >
        <div style={{
          fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
          color: "#fff", marginBottom: 20,
        }}>
          {decision ? "Edit Decision" : "Log Decision"}
        </div>

        <FieldEditor label="Title *" value={form.title} onChange={(v) => update("title", v)} placeholder="What was decided?" />
        <FieldEditor label="Summary" value={form.summary} onChange={(v) => update("summary", v)} multiline placeholder="Brief summary of the decision…" />
        <FieldEditor label="Reasoning" value={form.reasoning} onChange={(v) => update("reasoning", v)} multiline placeholder="Why was this decided?" />
        <FieldEditor label="Outcome" value={form.outcome} onChange={(v) => update("outcome", v)} multiline placeholder="What happened as a result?" />
        <TagListEditor label="Alternatives Considered" items={form.alternatives} onChange={(v) => update("alternatives", v)} placeholder="What else was considered?" />
        <TagListEditor label="Tags" items={form.tags} onChange={(v) => update("tags", v)} placeholder="Add tag…" />

        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 6,
          }}>Status</div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(DECISION_STATUS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => update("status", k)}
                style={{
                  padding: "5px 12px",
                  background: form.status === k ? `${v.color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${form.status === k ? v.color : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 8, cursor: "pointer",
                  color: form.status === k ? v.color : "rgba(255,255,255,0.4)",
                  fontSize: 12, fontFamily: "'Outfit', sans-serif",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{
            padding: "8px 18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, cursor: "pointer",
            color: "rgba(255,255,255,0.5)", fontSize: 13,
            fontFamily: "'Outfit', sans-serif",
          }}>
            Cancel
          </button>
          <button onClick={save} style={{
            padding: "8px 18px",
            background: "rgba(0,240,255,0.1)",
            border: "1px solid rgba(0,240,255,0.3)",
            borderRadius: 10, cursor: "pointer",
            color: "#00F0FF", fontSize: 13, fontWeight: 500,
            fontFamily: "'Outfit', sans-serif",
          }}>
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Decision row ─────────────────────────────────────────────────────────────
function DecisionRow({ decision, onEdit, onDelete }) {
  const sc = DECISION_STATUS[decision.status] || DECISION_STATUS.active;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        padding: "14px 16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, marginBottom: 8,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: "#e2e8f0",
              fontFamily: "'Outfit', sans-serif",
            }}>
              {decision.title}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, fontFamily: "monospace",
              color: sc.color, background: `${sc.color}15`,
              border: `1px solid ${sc.color}30`,
              borderRadius: 4, padding: "1px 5px",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {sc.label}
            </span>
          </div>
          {decision.summary && (
            <div style={{
              fontSize: 12, color: "#94a3b8", lineHeight: 1.5,
              fontFamily: "'Outfit', sans-serif", marginBottom: 4,
            }}>
              {decision.summary}
            </div>
          )}
          {decision.reasoning && (
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.35)",
              fontFamily: "'Outfit', sans-serif",
            }}>
              <i className="fa-solid fa-brain" style={{ fontSize: 9, marginRight: 4 }} />
              {decision.reasoning.slice(0, 120)}{decision.reasoning.length > 120 ? "…" : ""}
            </div>
          )}
          {decision.alternatives?.length > 0 && (
            <div style={{
              fontSize: 10, color: "rgba(255,255,255,0.3)",
              fontFamily: "'JetBrains Mono', monospace", marginTop: 4,
            }}>
              Alternatives: {decision.alternatives.join(", ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => onEdit(decision)} style={{
            width: 28, height: 28,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 7, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
          }}>
            <i className="fa-solid fa-pen" style={{ fontSize: 10 }} />
          </button>
          <button onClick={() => onDelete(decision.id)} style={{
            width: 28, height: 28,
            background: "rgba(255,0,60,0.05)",
            border: "1px solid rgba(255,0,60,0.15)",
            borderRadius: 7, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FF4466",
          }}>
            <i className="fa-solid fa-trash" style={{ fontSize: 10 }} />
          </button>
        </div>
      </div>
      <div style={{
        fontSize: 10, color: "rgba(255,255,255,0.2)",
        fontFamily: "'JetBrains Mono', monospace", marginTop: 6,
      }}>
        {relTime(decision.created_at)}
        {decision.tags?.length > 0 && ` · ${decision.tags.join(", ")}`}
      </div>
    </motion.div>
  );
}

// ─── Project detail view ──────────────────────────────────────────────────────
function ProjectDetail({ project, onUpdate, onDelete }) {
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState(project);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decisions, setDecisions] = useState([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [decisionModal, setDecisionModal] = useState(null); // null | "new" | decision object
  const saveTimer = useRef(null);

  // Sync form when project changes
  useEffect(() => {
    setForm(project);
    setDirty(false);
  }, [project.id]);

  // Load decisions when tab switches
  useEffect(() => {
    if (tab === "decisions") {
      setLoadingDecisions(true);
      decisionsApi.list(project.id).then((d) => {
        setDecisions(d);
        setLoadingDecisions(false);
      }).catch(() => setLoadingDecisions(false));
    }
  }, [tab, project.id]);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      projectsApi.update(project.id, { [k]: v })
        .then((updated) => { onUpdate(updated); setDirty(false); })
        .catch(() => toast.error("Save failed"))
        .finally(() => setSaving(false));
    }, 800);
  };

  const saveDecision = async (data) => {
    try {
      if (data.id) {
        const updated = await decisionsApi.update(data.id, data);
        setDecisions((ds) => ds.map((d) => d.id === updated.id ? updated : d));
        toast.success("Decision updated");
      } else {
        const created = await decisionsApi.create({ ...data, project_id: project.id });
        setDecisions((ds) => [created, ...ds]);
        toast.success("Decision logged");
      }
    } catch {
      toast.error("Failed to save decision");
    }
  };

  const deleteDecision = async (did) => {
    await decisionsApi.remove(did);
    setDecisions((ds) => ds.filter((d) => d.id !== did));
    toast.success("Decision removed");
  };

  const TABS = [
    { id: "overview", icon: "fa-layer-group", label: "Overview" },
    { id: "goals", icon: "fa-bullseye", label: "Goals" },
    { id: "decisions", icon: "fa-scale-balanced", label: "Decisions" },
    { id: "settings", icon: "fa-gear", label: "Settings" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${form.color}18`,
            border: `1px solid ${form.color}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className={`fa-solid ${form.icon || "fa-diagram-project"}`}
               style={{ color: form.color, fontSize: 16 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 17, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
              color: "#fff",
            }}>
              {form.name}
            </div>
            {form.description && (
              <div style={{
                fontSize: 12, color: "rgba(255,255,255,0.45)",
                fontFamily: "'Outfit', sans-serif",
              }}>
                {form.description.slice(0, 80)}
              </div>
            )}
          </div>
          {saving && (
            <span style={{
              fontSize: 10, color: "rgba(255,255,255,0.3)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 4 }} />
              saving…
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px",
              background: tab === t.id ? "rgba(0,240,255,0.08)" : "transparent",
              border: "none",
              borderBottom: `2px solid ${tab === t.id ? "#00F0FF" : "transparent"}`,
              cursor: "pointer",
              color: tab === t.id ? "#00F0FF" : "rgba(255,255,255,0.45)",
              fontSize: 12, fontFamily: "'Outfit', sans-serif",
              fontWeight: tab === t.id ? 500 : 400,
              transition: "all 0.15s",
            }}>
              <i className={`fa-solid ${t.icon}`} style={{ fontSize: 10 }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {tab === "overview" && (
          <div>
            <FieldEditor
              label="Description"
              value={form.description}
              onChange={(v) => update("description", v)}
              multiline
              placeholder="What is this project about?"
            />
            <FieldEditor
              label="Roadmap"
              value={form.roadmap}
              onChange={(v) => update("roadmap", v)}
              multiline
              placeholder="High-level roadmap or milestones…"
            />
            <TagListEditor
              label="Architecture Decisions"
              items={form.architecture_decisions || []}
              onChange={(v) => update("architecture_decisions", v)}
              placeholder="Key architectural choice…"
            />
            <TagListEditor
              label="Rejected Ideas"
              items={form.rejected_ideas || []}
              onChange={(v) => update("rejected_ideas", v)}
              placeholder="What was ruled out and why…"
            />
            <TagListEditor
              label="Unresolved Questions"
              items={form.unresolved_questions || []}
              onChange={(v) => update("unresolved_questions", v)}
              placeholder="Open question…"
            />
          </div>
        )}

        {tab === "goals" && (
          <div>
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.4)",
              fontFamily: "'Outfit', sans-serif", marginBottom: 16, lineHeight: 1.5,
            }}>
              Project goals are concrete outcomes you want to achieve. Use these
              to keep Cortex focused on what matters.
            </div>
            <TagListEditor
              label="Goals"
              items={form.goals || []}
              onChange={(v) => update("goals", v)}
              placeholder="Add a goal…"
            />

            {/* Terminology */}
            <div style={{ marginTop: 24 }}>
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 8,
              }}>
                Terminology / Glossary
              </div>
              <TerminologyEditor
                terminology={form.terminology || {}}
                onChange={(v) => update("terminology", v)}
              />
            </div>
          </div>
        )}

        {tab === "decisions" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{
                fontSize: 12, color: "rgba(255,255,255,0.4)",
                fontFamily: "'Outfit', sans-serif",
              }}>
                {decisions.length} decision{decisions.length !== 1 ? "s" : ""} logged
              </div>
              <button
                onClick={() => setDecisionModal("new")}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "7px 14px",
                  background: "rgba(0,240,255,0.08)",
                  border: "1px solid rgba(0,240,255,0.22)",
                  borderRadius: 10, cursor: "pointer",
                  color: "#00F0FF", fontSize: 12,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
                Log Decision
              </button>
            </div>

            {loadingDecisions ? (
              <div style={{ padding: "24px", textAlign: "center" }}>
                <i className="fa-solid fa-spinner fa-spin"
                   style={{ color: "rgba(0,240,255,0.4)", fontSize: 20 }} />
              </div>
            ) : decisions.length === 0 ? (
              <div style={{
                padding: "40px 20px", textAlign: "center",
                color: "rgba(255,255,255,0.2)",
                fontFamily: "'Outfit', sans-serif", fontSize: 13,
              }}>
                No decisions logged yet.<br />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
                  Log the reasoning behind important choices so your future self remembers why.
                </span>
              </div>
            ) : (
              <AnimatePresence>
                {decisions.map((d) => (
                  <DecisionRow
                    key={d.id}
                    decision={d}
                    onEdit={() => setDecisionModal(d)}
                    onDelete={deleteDecision}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 10,
              }}>
                Accent Color
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROJECT_COLORS.map((c) => (
                  <button key={c} onClick={() => update("color", c)} style={{
                    width: 28, height: 28, borderRadius: 8, background: c,
                    border: `2px solid ${form.color === c ? "#fff" : "transparent"}`,
                    cursor: "pointer",
                  }} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 10,
              }}>
                Icon
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROJECT_ICONS.map((ic) => (
                  <button key={ic} onClick={() => update("icon", ic)} style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: form.icon === ic ? `${form.color}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${form.icon === ic ? form.color : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: form.icon === ic ? form.color : "rgba(255,255,255,0.4)",
                  }}>
                    <i className={`fa-solid ${ic}`} style={{ fontSize: 13 }} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(0,240,255,0.5)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 10,
              }}>
                Status
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(STATUS_COLORS).map(([k, sc]) => (
                  <button key={k} onClick={() => update("status", k)} style={{
                    padding: "6px 14px",
                    background: form.status === k ? sc.bg : "rgba(255,255,255,0.03)",
                    border: `1px solid ${form.status === k ? sc.border : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 8, cursor: "pointer",
                    color: form.status === k ? sc.text : "rgba(255,255,255,0.35)",
                    fontSize: 12, fontFamily: "'Outfit', sans-serif",
                  }}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,0,60,0.15)", paddingTop: 20, marginTop: 32 }}>
              <button onClick={() => onDelete(project.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 16px",
                background: "rgba(255,0,60,0.05)",
                border: "1px solid rgba(255,0,60,0.2)",
                borderRadius: 10, cursor: "pointer",
                color: "#FF4466", fontSize: 13,
                fontFamily: "'Outfit', sans-serif",
              }}>
                <i className="fa-solid fa-trash" style={{ fontSize: 11 }} />
                Delete Project
              </button>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.2)",
                fontFamily: "'Outfit', sans-serif", marginTop: 8,
              }}>
                This will permanently delete the project and all its decisions.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decision modal */}
      <AnimatePresence>
        {decisionModal && (
          <DecisionModal
            projectId={project.id}
            decision={decisionModal === "new" ? null : decisionModal}
            onSave={saveDecision}
            onClose={() => setDecisionModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Terminology editor ───────────────────────────────────────────────────────
function TerminologyEditor({ terminology, onChange }) {
  const [keyInput, setKeyInput] = useState("");
  const [valInput, setValInput] = useState("");

  const add = () => {
    const k = keyInput.trim();
    const v = valInput.trim();
    if (!k || !v) return;
    onChange({ ...terminology, [k]: v });
    setKeyInput("");
    setValInput("");
  };

  return (
    <div>
      {Object.entries(terminology).map(([k, v]) => (
        <div key={k} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 10px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, marginBottom: 4,
        }}>
          <span style={{
            fontSize: 12, color: "#00F0FF",
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          }}>{k}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>→</span>
          <span style={{
            flex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)",
            fontFamily: "'Outfit', sans-serif",
          }}>{v}</span>
          <button
            onClick={() => {
              const t = { ...terminology };
              delete t[k];
              onChange(t);
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.3)", padding: 0, fontSize: 11,
            }}
          >×</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="Term"
          style={{
            flex: 1, padding: "5px 10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "rgba(255,255,255,0.7)",
            fontSize: 12, fontFamily: "'Outfit', sans-serif", outline: "none",
          }}
        />
        <input
          value={valInput}
          onChange={(e) => setValInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Definition"
          style={{
            flex: 2, padding: "5px 10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "rgba(255,255,255,0.7)",
            fontSize: 12, fontFamily: "'Outfit', sans-serif", outline: "none",
          }}
        />
        <button onClick={add} style={{
          padding: "5px 12px",
          background: "rgba(0,240,255,0.08)",
          border: "1px solid rgba(0,240,255,0.22)",
          borderRadius: 8, cursor: "pointer",
          color: "#00F0FF", fontSize: 11,
        }}>Add</button>
      </div>
    </div>
  );
}

// ─── New project form ─────────────────────────────────────────────────────────
function NewProjectForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await onSave({ name, description, color, icon });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      padding: 24,
      background: "rgba(8,10,22,0.97)",
      borderRadius: 16,
      border: "1px solid rgba(0,240,255,0.12)",
    }}>
      <div style={{
        fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
        color: "#fff", marginBottom: 20,
      }}>
        New Project
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name…"
          autoFocus
          style={{
            width: "100%", padding: "9px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, color: "#fff",
            fontSize: 14, fontFamily: "'Outfit', sans-serif",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description (optional)…"
          rows={2}
          style={{
            width: "100%", padding: "8px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, color: "rgba(255,255,255,0.7)",
            fontSize: 13, fontFamily: "'Outfit', sans-serif",
            outline: "none", resize: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {PROJECT_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 26, height: 26, borderRadius: 7, background: c,
            border: `2px solid ${color === c ? "#fff" : "transparent"}`,
            cursor: "pointer",
          }} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {PROJECT_ICONS.map((ic) => (
          <button key={ic} onClick={() => setIcon(ic)} style={{
            width: 32, height: 32, borderRadius: 8,
            background: icon === ic ? `${color}18` : "rgba(255,255,255,0.03)",
            border: `1px solid ${icon === ic ? color : "rgba(255,255,255,0.08)"}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: icon === ic ? color : "rgba(255,255,255,0.3)",
          }}>
            <i className={`fa-solid ${ic}`} style={{ fontSize: 12 }} />
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "9px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, cursor: "pointer",
          color: "rgba(255,255,255,0.4)",
          fontFamily: "'Outfit', sans-serif", fontSize: 13,
        }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving} style={{
          flex: 2, padding: "9px",
          background: "rgba(0,240,255,0.1)",
          border: "1px solid rgba(0,240,255,0.3)",
          borderRadius: 10, cursor: saving ? "wait" : "pointer",
          color: "#00F0FF", fontWeight: 500,
          fontFamily: "'Outfit', sans-serif", fontSize: 13,
        }}>
          {saving ? "Creating…" : "Create Project"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ProjectDNA() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    projectsApi.list().then((p) => {
      setProjects(p);
      if (!selected && p.length > 0) setSelected(p[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selected]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createProject = async (data) => {
    const p = await projectsApi.create(data);
    setProjects((ps) => [p, ...ps]);
    setSelected(p);
    setShowNew(false);
    toast.success("Project created");
  };

  const updateProject = (updated) => {
    setProjects((ps) => ps.map((p) => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  const deleteProject = async (pid) => {
    await projectsApi.remove(pid);
    const next = projects.filter((p) => p.id !== pid);
    setProjects(next);
    setSelected(next[0] || null);
    toast.success("Project deleted");
  };

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selected?.id) || null,
    [projects, selected]
  );

  return (
    <div style={{
      display: "flex", height: "100%",
      background: "rgba(5,6,18,0.7)", color: "#fff",
    }}>
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(0,240,255,0.5)",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            // Projects
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={{
              width: 24, height: 24,
              background: "rgba(0,240,255,0.08)",
              border: "1px solid rgba(0,240,255,0.2)",
              borderRadius: 7, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#00F0FF",
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
          </button>
        </div>

        {/* Project list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: "center" }}>
              <i className="fa-solid fa-spinner fa-spin"
                 style={{ color: "rgba(0,240,255,0.4)" }} />
            </div>
          ) : projects.length === 0 && !showNew ? (
            <div style={{
              padding: "24px 16px", textAlign: "center",
              color: "rgba(255,255,255,0.2)", fontSize: 12,
              fontFamily: "'Outfit', sans-serif", lineHeight: 1.5,
            }}>
              No projects yet.<br />
              <button
                onClick={() => setShowNew(true)}
                style={{
                  marginTop: 10, padding: "6px 14px",
                  background: "rgba(0,240,255,0.08)",
                  border: "1px solid rgba(0,240,255,0.2)",
                  borderRadius: 8, cursor: "pointer",
                  color: "#00F0FF", fontSize: 12,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                + New Project
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {projects.map((p) => (
                <ProjectItem
                  key={p.id}
                  project={p}
                  isActive={selected?.id === p.id}
                  onClick={() => { setSelected(p); setShowNew(false); }}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          {showNew ? (
            <motion.div
              key="new"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                flex: 1, display: "flex", alignItems: "flex-start",
                justifyContent: "center", padding: "40px 24px",
                overflowY: "auto",
              }}
            >
              <div style={{ width: "100%", maxWidth: 520 }}>
                <NewProjectForm
                  onSave={createProject}
                  onCancel={() => setShowNew(false)}
                />
              </div>
            </motion.div>
          ) : activeProject ? (
            <motion.div
              key={activeProject.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <ProjectDetail
                project={activeProject}
                onUpdate={updateProject}
                onDelete={deleteProject}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                flex: 1, display: "flex", alignItems: "center",
                justifyContent: "center", flexDirection: "column", gap: 16,
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: "rgba(0,240,255,0.06)",
                border: "1px solid rgba(0,240,255,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="fa-solid fa-diagram-project"
                   style={{ color: "rgba(0,240,255,0.4)", fontSize: 24 }} />
              </div>
              <div style={{
                textAlign: "center", color: "rgba(255,255,255,0.3)",
                fontFamily: "'Outfit', sans-serif",
              }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                  Select or create a project
                </div>
                <div style={{ fontSize: 12 }}>
                  Projects store goals, decisions, roadmaps, and terminology.
                </div>
              </div>
              <button onClick={() => setShowNew(true)} style={{
                padding: "9px 20px",
                background: "rgba(0,240,255,0.08)",
                border: "1px solid rgba(0,240,255,0.22)",
                borderRadius: 10, cursor: "pointer",
                color: "#00F0FF", fontSize: 13,
                fontFamily: "'Outfit', sans-serif",
              }}>
                <i className="fa-solid fa-plus" style={{ marginRight: 8, fontSize: 11 }} />
                New Project
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
