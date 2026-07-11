/**
 * swarmApi.js — P14: Client for the /api/ai/swarm SSE endpoint.
 *
 * Streams results as individual agents complete (Research, Writer,
 * Scheduler, Planner) then delivers a merged synthesis.
 *
 * Events emitted via callbacks:
 *   onAgent(agent)       — { name, output, elapsed_ms, success }
 *   onSynthesis(text)    — final merged synthesis string
 *   onDone()             — stream complete
 *   onError(err)         — stream or network error
 */

import { API } from "./api";

/**
 * Run a swarm goal and stream results.
 *
 * @param {string} goal         — the user's big goal
 * @param {object} handlers     — { onAgent, onSynthesis, onDone, onError }
 * @param {AbortSignal} signal  — optional AbortSignal for cancellation
 */
export async function runSwarm(goal, { onAgent, onSynthesis, onDone, onError } = {}, signal) {
  const token = localStorage.getItem("omniverse_token");

  let res;
  try {
    res = await fetch(`${API}/ai/swarm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ goal }),
      signal,
    });
  } catch (err) {
    onError?.(err);
    return;
  }

  if (!res.ok) {
    onError?.(new Error(`HTTP ${res.status}`));
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";

      for (const chunk of parts) {
        if (!chunk.startsWith("data: ")) continue;
        const payload = chunk.slice(6).trim();

        if (payload === "[DONE]") {
          onDone?.();
          return;
        }

        let evt;
        try { evt = JSON.parse(payload); }
        catch { continue; }

        if (evt.type === "agent")     onAgent?.(evt.agent);
        if (evt.type === "synthesis") onSynthesis?.(evt.content);
        if (evt.type === "done")      { onDone?.(); return; }
        if (evt.type === "error")     { onError?.(new Error(evt.message)); return; }
      }
    }
  } catch (err) {
    if (err?.name !== "AbortError") onError?.(err);
  }
}
