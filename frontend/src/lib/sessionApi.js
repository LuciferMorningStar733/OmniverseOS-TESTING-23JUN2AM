/**
 * Chat session API client
 * Wraps all /api/ai/sessions endpoints with typed helpers.
 */
import { api } from "./api";

export const sessionApi = {
  /** List all sessions, optionally filtered by search string */
  list: (search = "") =>
    api.get("/ai/sessions", { params: search ? { search } : {} }).then((r) => r.data),

  /** Create a new empty session */
  create: (data = {}) =>
    api.post("/ai/sessions", { title: "New Chat", ...data }).then((r) => r.data),

  /** Rename or pin a session */
  update: (sessionId, patch) =>
    api.patch(`/ai/sessions/${sessionId}`, patch).then((r) => r.data),

  /** Delete a session and all its messages */
  delete: (sessionId) =>
    api.delete(`/ai/sessions/${sessionId}`).then((r) => r.data),

  /** Duplicate a session */
  duplicate: (sessionId) =>
    api.post(`/ai/sessions/${sessionId}/duplicate`).then((r) => r.data),

  /** Auto-generate a title from the first user message */
  autoTitle: (sessionId) =>
    api.post(`/ai/sessions/${sessionId}/auto-title`).then((r) => r.data),
};
