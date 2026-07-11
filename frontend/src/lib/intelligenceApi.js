/**
 * intelligenceApi.js — Phase 1 Intelligence Layer API client
 *
 * Covers:
 *  - Conversation Archaeology (semantic search)
 *  - Project DNA
 *  - Decision Memory
 *  - Cortex Timeline
 *  - Cortex Interrupts
 */
import { api } from "./api";

// ── Conversation Archaeology ──────────────────────────────────────────────
export const conversationSearchApi = {
  /** Semantic search across all chat sessions + messages */
  search: (query, limit = 8) =>
    api.post("/ai/search/conversations", { query, limit }).then((r) => r.data),
};

// ── Project DNA ───────────────────────────────────────────────────────────
export const projectsApi = {
  list:   ()              => api.get("/projects").then((r) => r.data),
  create: (data)          => api.post("/projects", data).then((r) => r.data),
  get:    (pid)           => api.get(`/projects/${pid}`).then((r) => r.data),
  update: (pid, patch)    => api.patch(`/projects/${pid}`, patch).then((r) => r.data),
  remove: (pid)           => api.delete(`/projects/${pid}`).then((r) => r.data),
};

// ── Decision Memory ────────────────────────────────────────────────────────
export const decisionsApi = {
  list:   (projectId)     => api.get("/decisions", { params: projectId ? { project_id: projectId } : {} }).then((r) => r.data),
  create: (data)          => api.post("/decisions", data).then((r) => r.data),
  update: (did, patch)    => api.patch(`/decisions/${did}`, patch).then((r) => r.data),
  remove: (did)           => api.delete(`/decisions/${did}`).then((r) => r.data),
};

// ── Cortex Timeline ────────────────────────────────────────────────────────
export const timelineApi = {
  list:   (params = {})   => api.get("/timeline", { params }).then((r) => r.data),
  log:    (data)          => api.post("/timeline", data).then((r) => r.data),
  remove: (eid)           => api.delete(`/timeline/${eid}`).then((r) => r.data),
};

// ── Cortex Interrupts ──────────────────────────────────────────────────────
export const interruptsApi = {
  check: () => api.get("/ai/interrupts/check").then((r) => r.data),
};
