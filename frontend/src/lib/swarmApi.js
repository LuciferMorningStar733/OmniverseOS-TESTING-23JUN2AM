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

import { API, consumeSSE } from "./api";

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

  try {
    await consumeSSE(res, (payload) => {
      if (payload === "[DONE]") {
        onDone?.();
        return false;
      }

      let evt;
      try { evt = JSON.parse(payload); }
      catch { return true; }

      if (evt.type === "agent") onAgent?.(evt.agent);
      if (evt.type === "synthesis") onSynthesis?.(evt.content);
      if (evt.type === "done") {
        onDone?.();
        return false;
      }
      if (evt.type === "error") {
        onError?.(new Error(evt.message));
        return false;
      }
      return true;
    });
  } catch (err) {
    if (err?.name !== "AbortError") onError?.(err);
  }
}
