import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("omniverse_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const authApi = {
  signup: (data) => api.post("/auth/signup", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

export const aiApi = {
  chat: (data) => api.post("/ai/chat", data).then((r) => r.data),
  history: (sid) => api.get(`/ai/chat/history/${sid}`).then((r) => r.data),
  image: (prompt) => api.post("/ai/image", { prompt }).then((r) => r.data),
  imageHistory: () => api.get("/ai/image/history").then((r) => r.data),
  chatStream: async (data, onDelta, signal) => {
    const token = localStorage.getItem("omniverse_token");
    const res = await fetch(`${API}/ai/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
      signal,
    });
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") return;
          onDelta(payload);
        }
      }
    } finally {
      try { reader.releaseLock(); } catch { /* ignore */ }
    }
  },
};

export const crud = (resource) => ({
  list: () => api.get(`/${resource}`).then((r) => r.data),
  create: (data) => api.post(`/${resource}`, data).then((r) => r.data),
  update: (id, data) => api.put(`/${resource}/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/${resource}/${id}`).then((r) => r.data),
});

export const analytics = () => api.get("/analytics/summary").then((r) => r.data);
