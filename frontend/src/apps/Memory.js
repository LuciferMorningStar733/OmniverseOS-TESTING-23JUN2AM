import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

const CATEGORIES = ["All", "Personal", "Preferences", "Devices", "Vehicles", "Projects", "Work", "Contacts", "Locations", "Other"];
const CATEGORY_ICONS = {
  All: "fa-brain",
  Personal: "fa-user",
  Preferences: "fa-sliders",
  Devices: "fa-laptop",
  Vehicles: "fa-car",
  Projects: "fa-code-branch",
  Work: "fa-briefcase",
  Contacts: "fa-address-book",
  Locations: "fa-location-dot",
  Other: "fa-tag",
};

const IMPORTANCE_LABELS = ["Low", "Medium", "High", "Critical"];
function importanceLabel(score) {
  if (score >= 0.85) return "Critical";
  if (score >= 0.65) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}
function importanceColor(score) {
  if (score >= 0.85) return "#FF003C";
  if (score >= 0.65) return "#F59E0B";
  if (score >= 0.4) return "#00F0FF";
  return "rgba(255,255,255,0.35)";
}

const memApi = {
  list: () => api.get("/memories").then(r => r.data),
  create: (data) => api.post("/memories", data).then(r => r.data),
  update: (id, data) => api.put(`/memories/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/memories/${id}`).then(r => r.data),
};

function MemoryCard({ mem, onEdit, onDelete, onTogglePin, onToggleNeverForget }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        background: mem.never_forget
          ? "rgba(255,0,60,0.06)"
          : mem.pinned
          ? "rgba(0,240,255,0.06)"
          : "rgba(255,255,255,0.03)",
        border: mem.never_forget
          ? "1px solid rgba(255,0,60,0.3)"
          : mem.pinned
          ? "1px solid rgba(0,240,255,0.25)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "12px 14px",
        transition: "all 0.15s",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {mem.pinned && (
              <i className="fa-solid fa-thumbtack" style={{ fontSize: 9, color: "#00F0FF" }} />
            )}
            {mem.never_forget && (
              <i className="fa-solid fa-infinity" style={{ fontSize: 9, color: "#FF003C" }} />
            )}
            <span style={{
              fontSize: 12, fontWeight: 600, color: "#E2E8F0",
              fontFamily: "'Inter', sans-serif", wordBreak: "break-word",
            }}>
              {mem.title || mem.content.slice(0, 60)}
            </span>
          </div>
          {expanded && (
            <div style={{
              marginTop: 6, fontSize: 12.5, color: "rgba(255,255,255,0.7)",
              lineHeight: 1.55, wordBreak: "break-word",
            }}>
              {mem.content}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{
              fontSize: 9.5, fontFamily: "monospace",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4, padding: "1px 6px", color: "rgba(255,255,255,0.45)",
            }}>
              <i className={`fa-solid ${CATEGORY_ICONS[mem.category] || "fa-tag"} mr-1`} style={{ fontSize: 8 }} />
              {mem.category}
            </span>
            <span style={{
              fontSize: 9.5, fontFamily: "monospace",
              color: importanceColor(mem.importance_score),
              border: `1px solid ${importanceColor(mem.importance_score)}40`,
              borderRadius: 4, padding: "1px 6px",
              background: `${importanceColor(mem.importance_score)}10`,
            }}>
              {importanceLabel(mem.importance_score)}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
              {new Date(mem.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <ActionBtn icon="fa-thumbtack" active={mem.pinned} activeColor="#00F0FF" title="Pin" onClick={() => onTogglePin(mem)} />
          <ActionBtn icon="fa-infinity" active={mem.never_forget} activeColor="#FF003C" title="Never forget" onClick={() => onToggleNeverForget(mem)} />
          <ActionBtn icon="fa-pen" title="Edit" onClick={() => onEdit(mem)} />
          <ActionBtn icon="fa-trash" title="Delete" onClick={() => onDelete(mem.id)} danger />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, active, activeColor, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: 6, border: "none",
        background: active ? `${activeColor}18` : "rgba(255,255,255,0.06)",
        color: active ? activeColor : danger ? "rgba(255,0,60,0.5)" : "rgba(255,255,255,0.35)",
        cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = active ? `${activeColor}28` : danger ? "rgba(255,0,60,0.12)" : "rgba(255,255,255,0.1)";
        e.currentTarget.style.color = active ? activeColor : danger ? "#FF003C" : "rgba(255,255,255,0.7)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = active ? `${activeColor}18` : "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = active ? activeColor : danger ? "rgba(255,0,60,0.5)" : "rgba(255,255,255,0.35)";
      }}
    >
      <i className={`fa-solid ${icon}`} />
    </button>
  );
}

function EditModal({ mem, onSave, onClose }) {
  const [form, setForm] = useState({
    title: mem?.title || "",
    content: mem?.content || "",
    category: mem?.category || "Other",
    importance_score: mem?.importance_score ?? 0.5,
    pinned: mem?.pinned || false,
    never_forget: mem?.never_forget || false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(480px, 95vw)", background: "rgba(8,10,18,0.98)",
          border: "1px solid rgba(0,240,255,0.2)", borderRadius: 14,
          padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#00F0FF", marginBottom: 16, fontFamily: "monospace" }}>
          <i className="fa-solid fa-brain mr-2" /> {mem ? "Edit Memory" : "New Memory"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>TITLE</label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Short label..."
              className="input-cyber"
              style={{ width: "100%", marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>CONTENT *</label>
            <textarea
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder="The memorable fact..."
              rows={3}
              className="input-cyber"
              style={{ width: "100%", marginTop: 4, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>CATEGORY</label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                className="input-cyber"
                style={{ width: "100%", marginTop: 4 }}
              >
                {CATEGORIES.filter(c => c !== "All").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                IMPORTANCE: {importanceLabel(form.importance_score)}
              </label>
              <input
                type="range" min={0} max={1} step={0.05}
                value={form.importance_score}
                onChange={e => set("importance_score", parseFloat(e.target.value))}
                style={{ width: "100%", marginTop: 10, accentColor: importanceColor(form.importance_score) }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              <input type="checkbox" checked={form.pinned} onChange={e => set("pinned", e.target.checked)} style={{ accentColor: "#00F0FF" }} />
              <i className="fa-solid fa-thumbtack" style={{ color: "#00F0FF", fontSize: 10 }} /> Pin
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              <input type="checkbox" checked={form.never_forget} onChange={e => set("never_forget", e.target.checked)} style={{ accentColor: "#FF003C" }} />
              <i className="fa-solid fa-infinity" style={{ color: "#FF003C", fontSize: 10 }} /> Never Forget
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={() => { if (form.content.trim()) onSave(form); }}
              className="neon-btn primary"
              style={{ flex: 1 }}
            >
              <i className="fa-solid fa-floppy-disk mr-2" /> Save
            </button>
            <button onClick={onClose} className="neon-btn" style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Memory() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(() => {
    memApi.list().then(data => {
      setMemories(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = memories.filter(m => {
    const matchCat = activeCategory === "All" || m.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || m.content?.toLowerCase().includes(q) || m.title?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const handleSave = async (form) => {
    try {
      if (editTarget && editTarget.id) {
        await memApi.update(editTarget.id, form);
        toast.success("Memory updated");
      } else {
        await memApi.create(form);
        toast.success("Memory stored");
      }
      setEditTarget(null);
      setShowAddModal(false);
      load();
    } catch {
      toast.error("Failed to save memory");
    }
  };

  const handleDelete = async (id) => {
    try {
      await memApi.remove(id);
      toast.success("Memory forgotten");
      setMemories(ms => ms.filter(m => m.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleTogglePin = async (mem) => {
    try {
      const updated = await memApi.update(mem.id, { ...mem, pinned: !mem.pinned });
      setMemories(ms => ms.map(m => m.id === mem.id ? updated : m));
    } catch { toast.error("Failed to update"); }
  };

  const handleToggleNeverForget = async (mem) => {
    try {
      const updated = await memApi.update(mem.id, { ...mem, never_forget: !mem.never_forget });
      setMemories(ms => ms.map(m => m.id === mem.id ? updated : m));
      toast.success(updated.never_forget ? "Marked as Never Forget" : "Removed Never Forget");
    } catch { toast.error("Failed to update"); }
  };

  const pinnedCount = memories.filter(m => m.pinned).length;
  const neverForgetCount = memories.filter(m => m.never_forget).length;

  return (
    <div className="flex flex-col sm:flex-row h-full text-white" data-testid="memory-app">
      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4,
        overflowY: "auto",
      }} className="hidden sm:flex">
        <div style={{ fontFamily: "monospace", fontSize: 9.5, color: "rgba(0,240,255,0.5)", letterSpacing: "0.15em", marginBottom: 8, paddingLeft: 8 }}>
          // CORTEX MEMORY
        </div>

        {CATEGORIES.map(cat => {
          const count = cat === "All" ? memories.length : memories.filter(m => m.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 8,
                background: activeCategory === cat ? "rgba(0,240,255,0.1)" : "transparent",
                border: activeCategory === cat ? "1px solid rgba(0,240,255,0.2)" : "1px solid transparent",
                color: activeCategory === cat ? "#00F0FF" : "rgba(255,255,255,0.55)",
                fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.12s",
              }}
            >
              <i className={`fa-solid ${CATEGORY_ICONS[cat]}`} style={{ fontSize: 11, width: 14, textAlign: "center" }} />
              <span style={{ flex: 1 }}>{cat}</span>
              {count > 0 && (
                <span style={{ fontSize: 9.5, fontFamily: "monospace", opacity: 0.5 }}>{count}</span>
              )}
            </button>
          );
        })}

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 8, paddingTop: 8 }}>
          {pinnedCount > 0 && (
            <div style={{ fontSize: 10, color: "rgba(0,240,255,0.45)", fontFamily: "monospace", padding: "3px 10px" }}>
              <i className="fa-solid fa-thumbtack mr-1" /> {pinnedCount} pinned
            </div>
          )}
          {neverForgetCount > 0 && (
            <div style={{ fontSize: 10, color: "rgba(255,0,60,0.5)", fontFamily: "monospace", padding: "3px 10px" }}>
              <i className="fa-solid fa-infinity mr-1" /> {neverForgetCount} never forget
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Toolbar */}
        <div style={{
          padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", gap: 8, alignItems: "center", flexShrink: 0,
        }}>
          <div style={{ position: "relative", flex: 1 }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, color: "rgba(255,255,255,0.3)",
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="input-cyber"
              style={{ width: "100%", paddingLeft: 28, boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowAddModal(true); }}
            className="neon-btn primary"
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            <i className="fa-solid fa-plus mr-1" /> Store
          </button>
        </div>

        {/* Category tabs on mobile */}
        <div className="flex sm:hidden overflow-x-auto" style={{ padding: "8px 12px", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0, padding: "4px 10px", borderRadius: 20, fontSize: 11,
                background: activeCategory === cat ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)",
                border: activeCategory === cat ? "1px solid rgba(0,240,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                color: activeCategory === cat ? "#00F0FF" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Memory list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 40, fontSize: 13 }}>
              <i className="fa-solid fa-brain fa-pulse mr-2" /> Loading memories...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", paddingTop: 40, fontSize: 13 }}>
              {search ? "No memories match your search." : `No memories in ${activeCategory}.`}
              <div style={{ marginTop: 8, fontSize: 11 }}>Chat with Cortex — it will remember important things automatically.</div>
            </div>
          ) : (
            filtered.map(mem => (
              <MemoryCard
                key={mem.id}
                mem={mem}
                onEdit={m => { setEditTarget(m); setShowAddModal(true); }}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onToggleNeverForget={handleToggleNeverForget}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {showAddModal && (
        <EditModal
          mem={editTarget}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
