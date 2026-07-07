import React, { useCallback, useEffect, useRef, useState } from "react";
import { projectApi, decisionApi } from "../lib/api";
import { toast } from "sonner";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  accent:    "#A855F7",
  accentDim: "rgba(168,85,247,0.6)",
  accentBg:  "rgba(168,85,247,0.08)",
  accentBdr: "rgba(168,85,247,0.22)",
  cyan:      "#00F0FF",
  cyanDim:   "rgba(0,240,255,0.4)",
  cyanBg:    "rgba(0,240,255,0.06)",
  cyanBdr:   "rgba(0,240,255,0.18)",
  text:      "#e0eeff",
  textMuted: "rgba(200,220,240,0.5)",
  surface:   "rgba(10,10,22,0.95)",
  border:    "rgba(168,85,247,0.1)",
  green:     "#39FF14",
  red:       "#FF003C",
};

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 24, height: 24, border: `2px solid ${C.accentBdr}`,
        borderTopColor: C.accent, borderRadius: "50%",
        animation: "dnaSpinner 0.7s linear infinite",
      }} />
    </div>
  );
}

// ─── Shared input / textarea / button styles ───────────────────────────────────
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(0,0,0,0.3)",
  border: `1px solid ${C.accentBdr}`,
  borderRadius: 8, color: C.text,
  fontFamily: "inherit", fontSize: 13,
  padding: "8px 12px", outline: "none",
  transition: "border-color 0.2s",
};
const textareaStyle = { ...inputStyle, resize: "vertical", minHeight: 72, lineHeight: 1.55 };
const btnPrimary = {
  background: `linear-gradient(135deg, ${C.accent}, rgba(100,40,200,0.9))`,
  border: "none", borderRadius: 8,
  color: "#fff", cursor: "pointer",
  fontSize: 12, fontWeight: 600,
  padding: "7px 16px", transition: "opacity 0.15s",
};
const btnGhost = {
  background: "none",
  border: `1px solid ${C.accentBdr}`,
  borderRadius: 8, color: C.accentDim,
  cursor: "pointer", fontSize: 12,
  padding: "6px 14px", transition: "all 0.15s",
};
const btnDanger = {
  background: "none",
  border: "1px solid rgba(255,0,60,0.25)",
  borderRadius: 6, color: "rgba(255,0,60,0.6)",
  cursor: "pointer", fontSize: 11,
  padding: "4px 10px", transition: "all 0.15s",
};

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab — project list + create/edit/delete
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ projects, loading, onSelect, selectedId, onRefresh }) {
  const [form, setForm] = useState({ name: "", description: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const resetForm = () => setForm({ name: "", description: "", tags: "" });

  const startEdit = (p) => {
    setEditId(p.id);
    setForm({ name: p.name, description: p.description || "", tags: (p.tags || []).join(", ") });
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return toast.error("Project name is required");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        goals: editId ? undefined : [],
      };
      if (editId) {
        await projectApi.update(editId, payload);
        toast.success("Project updated");
      } else {
        await projectApi.create({ ...payload, goals: [] });
        toast.success("Project created");
      }
      resetForm();
      setEditId(null);
      onRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [form, editId, onRefresh]);

  const handleDelete = useCallback(async (pid) => {
    if (!window.confirm("Delete this project and all its decisions?")) return;
    try {
      await projectApi.remove(pid);
      toast.success("Project deleted");
      onRefresh();
    } catch {
      toast.error("Delete failed");
    }
  }, [onRefresh]);

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 20, height: "100%", boxSizing: "border-box", overflow: "hidden" }}>
      {/* Project list */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        {loading && <Spinner />}
        {!loading && projects.length === 0 && (
          <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 40 }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>⬡</div>
            No projects yet. Create your first project.
          </div>
        )}
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              padding: "12px 14px", marginBottom: 8, borderRadius: 10,
              border: `1px solid ${selectedId === p.id ? C.accentBdr : C.border}`,
              background: selectedId === p.id ? C.accentBg : "rgba(10,10,22,0.5)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: selectedId === p.id ? C.accent : C.text, fontSize: 14, marginBottom: 3 }}>
                  {p.name}
                </div>
                {p.description && (
                  <div style={{ color: C.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.description}
                  </div>
                )}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                  {(p.tags || []).map(tag => (
                    <span key={tag} style={{
                      fontSize: 10, padding: "1px 7px", borderRadius: 20,
                      background: C.accentBg, border: `1px solid ${C.accentBdr}`,
                      color: C.accentDim, fontFamily: "'JetBrains Mono', monospace",
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button style={btnGhost} onClick={e => { e.stopPropagation(); startEdit(p); }}>Edit</button>
                <button style={btnDanger} onClick={e => { e.stopPropagation(); handleDelete(p.id); }}>✕</button>
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              Created {fmtDate(p.created_at)} · {(p.goals || []).length} goal{p.goals?.length !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit form */}
      <div style={{ width: 280, flexShrink: 0, background: "rgba(20,10,35,0.6)", border: `1px solid ${C.accentBdr}`, borderRadius: 12, padding: 16, boxSizing: "border-box", height: "fit-content" }}>
        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accentDim, marginBottom: 14 }}>
          {editId ? "Edit Project" : "New Project"}
        </div>
        <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Name *</label>
        <input className="dna-input" style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" />
        <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginTop: 10, marginBottom: 4 }}>Description</label>
        <textarea className="dna-input" style={textareaStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" />
        <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginTop: 10, marginBottom: 4 }}>Tags (comma-separated)</label>
        <input className="dna-input" style={inputStyle} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="ai, product, research" />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editId ? "Update" : "Create"}
          </button>
          {editId && (
            <button style={btnGhost} onClick={() => { setEditId(null); resetForm(); }}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Goals Tab — editable goals list for selected project
// ─────────────────────────────────────────────────────────────────────────────
function GoalsTab({ project, onRefresh }) {
  const [goals, setGoals] = useState(project?.goals || []);
  const [newGoal, setNewGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setGoals(project?.goals || []); }, [project]);

  const addGoal = useCallback(async () => {
    const g = newGoal.trim();
    if (!g) return;
    const updated = [...goals, g];
    setSaving(true);
    try {
      await projectApi.update(project.id, { goals: updated });
      setGoals(updated);
      setNewGoal("");
      inputRef.current?.focus();
      onRefresh();
    } catch { toast.error("Failed to add goal"); }
    finally { setSaving(false); }
  }, [newGoal, goals, project, onRefresh]);

  const removeGoal = useCallback(async (idx) => {
    const updated = goals.filter((_, i) => i !== idx);
    setSaving(true);
    try {
      await projectApi.update(project.id, { goals: updated });
      setGoals(updated);
      onRefresh();
    } catch { toast.error("Failed to remove goal"); }
    finally { setSaving(false); }
  }, [goals, project, onRefresh]);

  const handleKeyDown = (e) => { if (e.key === "Enter") addGoal(); };

  if (!project) return (
    <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
      Select a project first from the Overview tab.
    </div>
  );

  return (
    <div style={{ padding: "16px 20px", maxWidth: 640 }}>
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        Goals for <span style={{ color: C.accent, fontWeight: 600 }}>{project.name}</span>
      </div>

      {/* Add goal */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          ref={inputRef}
          className="dna-input"
          style={{ ...inputStyle, flex: 1 }}
          value={newGoal}
          onChange={e => setNewGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a goal and press Enter…"
        />
        <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={addGoal} disabled={saving}>
          + Add
        </button>
      </div>

      {/* Goals list */}
      {goals.length === 0 && (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, padding: "24px 0", opacity: 0.6 }}>
          No goals yet — add your first one above
        </div>
      )}
      {goals.map((g, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "10px 14px", marginBottom: 6, borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.accentBg,
          transition: "border-color 0.15s",
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
            background: C.accentBg, border: `1px solid ${C.accentBdr}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: C.accent, fontWeight: 700, marginTop: 1,
          }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{g}</span>
          <button style={btnDanger} onClick={() => removeGoal(i)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decisions Tab — chronological log embedded in project DNA
// ─────────────────────────────────────────────────────────────────────────────
function DecisionsTab({ project, onRefresh }) {
  const [decisions, setDecisions] = useState([]);
  const [loadingD, setLoadingD] = useState(false);
  const [form, setForm] = useState({ title: "", rationale: "", outcome: "" });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadDecisions = useCallback(async () => {
    if (!project) return;
    setLoadingD(true);
    try {
      const data = await decisionApi.list(project.id);
      setDecisions(data || []);
    } catch { setDecisions([]); }
    finally { setLoadingD(false); }
  }, [project]);

  useEffect(() => { loadDecisions(); }, [loadDecisions]);

  const resetForm = () => setForm({ title: "", rationale: "", outcome: "" });

  const startEdit = (d) => {
    setEditId(d.id);
    setForm({ title: d.title, rationale: d.rationale || "", outcome: d.outcome || "" });
    setExpandedId(null);
  };

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return toast.error("Decision title is required");
    setSaving(true);
    try {
      if (editId) {
        await decisionApi.update(editId, { title: form.title.trim(), rationale: form.rationale.trim(), outcome: form.outcome.trim() });
        toast.success("Decision updated");
      } else {
        await decisionApi.create(project.id, { title: form.title.trim(), rationale: form.rationale.trim(), outcome: form.outcome.trim() });
        toast.success("Decision logged");
      }
      resetForm();
      setEditId(null);
      loadDecisions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  }, [form, editId, project, loadDecisions]);

  const handleDelete = useCallback(async (did) => {
    if (!window.confirm("Delete this decision?")) return;
    try {
      await decisionApi.remove(did);
      toast.success("Decision deleted");
      loadDecisions();
    } catch { toast.error("Delete failed"); }
  }, [loadDecisions]);

  if (!project) return (
    <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
      Select a project first from the Overview tab.
    </div>
  );

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 20, height: "100%", boxSizing: "border-box", overflow: "hidden" }}>
      {/* Decision log */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.cyanDim, marginBottom: 12 }}>
          Decision Log · {project.name}
        </div>
        {loadingD && <Spinner />}
        {!loadingD && decisions.length === 0 && (
          <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, padding: "24px 0" }}>
            No decisions logged yet.
          </div>
        )}
        {/* Chronological timeline */}
        <div style={{ position: "relative", paddingLeft: 20 }}>
          {/* Vertical line */}
          {decisions.length > 0 && (
            <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: `linear-gradient(to bottom, ${C.accent}55, transparent)`, borderRadius: 2 }} />
          )}
          {decisions.map((d, i) => (
            <div key={d.id} style={{ position: "relative", marginBottom: 12 }}>
              {/* Timeline dot */}
              <div style={{
                position: "absolute", left: -20, top: 10,
                width: 8, height: 8, borderRadius: "50%",
                background: C.accent, border: `2px solid rgba(168,85,247,0.3)`,
                boxShadow: `0 0 6px ${C.accent}55`,
              }} />
              <div
                style={{
                  padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${expandedId === d.id ? C.accentBdr : C.border}`,
                  background: expandedId === d.id ? C.accentBg : "rgba(10,10,22,0.5)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: 13, marginBottom: 2 }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtDate(d.created_at)}
                      {d.updated_at !== d.created_at && " · edited"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button style={btnGhost} onClick={e => { e.stopPropagation(); startEdit(d); }}>Edit</button>
                    <button style={btnDanger} onClick={e => { e.stopPropagation(); handleDelete(d.id); }}>✕</button>
                  </div>
                </div>
                {expandedId === d.id && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                    {d.rationale && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.accentDim, marginBottom: 4 }}>Rationale</div>
                        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.55 }}>{d.rationale}</div>
                      </div>
                    )}
                    {d.outcome && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.cyanDim, marginBottom: 4 }}>Outcome</div>
                        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.55 }}>{d.outcome}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log form */}
      <div style={{ width: 280, flexShrink: 0, background: "rgba(20,10,35,0.6)", border: `1px solid ${C.accentBdr}`, borderRadius: 12, padding: 16, boxSizing: "border-box", height: "fit-content" }}>
        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accentDim, marginBottom: 14 }}>
          {editId ? "Edit Decision" : "Log Decision"}
        </div>
        <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Title *</label>
        <input className="dna-input" style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What was decided?" />
        <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginTop: 10, marginBottom: 4 }}>Rationale</label>
        <textarea className="dna-input" style={textareaStyle} value={form.rationale} onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} placeholder="Why was this decision made?" />
        <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginTop: 10, marginBottom: 4 }}>Outcome</label>
        <textarea className="dna-input" style={{ ...textareaStyle, minHeight: 56 }} value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} placeholder="Result or next step…" />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editId ? "Update" : "Log"}
          </button>
          {editId && (
            <button style={btnGhost} onClick={() => { setEditId(null); resetForm(); }}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ProjectDNA App
// ─────────────────────────────────────────────────────────────────────────────
export default function ProjectDNA() {
  const [tab, setTab] = useState("overview");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const selectedProject = projects.find(p => p.id === selectedId) || null;

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectApi.list();
      const list = data || [];
      setProjects(list);
      // Keep selection if still valid; otherwise auto-select first or clear
      setSelectedId(prev => {
        if (prev && list.find(p => p.id === prev)) return prev;
        return list.length ? list[0].id : null;
      });
    } catch { setProjects([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const TABS = [
    { id: "overview",  label: "Overview",  icon: "⬡" },
    { id: "goals",     label: "Goals",     icon: "◎" },
    { id: "decisions", label: "Decisions", icon: "⊕" },
  ];

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, #0a0814 0%, #050510 60%, #080516 100%)",
      color: C.text, fontFamily: "'Outfit', 'Inter', sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes dnaSpinner { to { transform: rotate(360deg); } }
        .dna-input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 2px ${C.accentBg}; }
        .dna-tab:hover { background: ${C.accentBg} !important; color: ${C.accent} !important; }
        .dna-project:hover { border-color: ${C.accentBdr} !important; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "14px 20px 0",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `radial-gradient(circle at 40% 35%, ${C.accent} 0%, rgba(100,40,200,0.7) 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, boxShadow: `0 0 16px ${C.accent}40`,
          }}>🧬</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>Project DNA</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""}{selectedProject ? ` · ${selectedProject.name}` : ""}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className="dna-tab"
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? C.accentBg : "none",
                border: "none",
                borderBottom: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
                borderRadius: "8px 8px 0 0",
                color: tab === t.id ? C.accent : C.textMuted,
                cursor: "pointer",
                fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
                padding: "7px 16px", letterSpacing: "0.02em",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "overview" && (
          <OverviewTab
            projects={projects}
            loading={loading}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); }}
            onRefresh={loadProjects}
          />
        )}
        {tab === "goals" && (
          <GoalsTab project={selectedProject} onRefresh={loadProjects} />
        )}
        {tab === "decisions" && (
          <DecisionsTab project={selectedProject} onRefresh={loadProjects} />
        )}
      </div>
    </div>
  );
}
