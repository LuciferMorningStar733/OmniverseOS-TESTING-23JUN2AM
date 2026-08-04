/**
 * Tool session API client
 * Wraps session endpoints with app_type scoping for tool-specific run history.
 * Tools: "adversary" | "warroom" | "deadreckoning"
 */
import { api } from "./api";

export const toolSessionApi = {
  /** List runs for a given app_type */
  list: (appType, search = "") =>
    api
      .get("/ai/sessions", { params: { app_type: appType, ...(search ? { search } : {}) } })
      .then((r) => r.data),

  /** Create a new empty run session */
  create: (appType, title = "New Run") =>
    api.post("/ai/sessions", { title, app_type: appType }).then((r) => r.data),

  /** Rename or pin */
  update: (sessionId, patch) =>
    api.patch(`/ai/sessions/${sessionId}`, patch).then((r) => r.data),

  /** Delete the run and all its messages */
  delete: (sessionId) =>
    api.delete(`/ai/sessions/${sessionId}`).then((r) => r.data),

  /**
   * Bulk-save messages for a run.
   * Each message: { role, content, meta: {} }
   */
  saveMessages: (sessionId, messages) =>
    api.post(`/ai/sessions/${sessionId}/messages`, { messages }).then((r) => r.data),

  /** Load all messages for a run (chronological) */
  loadMessages: (sessionId) =>
    api.get(`/ai/chat/history/${sessionId}`).then((r) => r.data),
};
