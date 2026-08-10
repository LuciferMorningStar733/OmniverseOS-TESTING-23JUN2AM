import { useState, useCallback, useRef } from "react";
import { consumeSSE } from "../lib/api";

/**
 * Custom hook for resilient SSE stream handling across destination agent apps.
 * Centralizes fetch initialization, auth header attachment, stream parsing,
 * error state handling, and cancellation.
 */
export function useAgentStream(defaultEndpoint) {
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortCtrlRef = useRef(null);

  const startStream = useCallback(
    async (payload, overrideEndpoint = null) => {
      const endpoint = overrideEndpoint || defaultEndpoint;
      if (!endpoint) {
        setError("No endpoint provided for agent stream.");
        return;
      }

      setOutput("");
      setError(null);
      setStreaming(true);
      abortCtrlRef.current = new AbortController();

      try {
        const token = localStorage.getItem("omniverse_token");
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: abortCtrlRef.current.signal,
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          throw new Error(`HTTP ${resp.status}: ${errText || "Request failed"}`);
        }

        await consumeSSE(resp, (chunk) => {
          if (chunk === "[DONE]") return false;
          if (chunk.startsWith("[error:")) {
            const errCode = chunk.replace("[error:", "").replace("]", "");
            setError(`Agent error (${errCode})`);
            return false;
          }
          if (chunk === "[quota_exceeded]") {
            setError("Rate limit exceeded. Please wait a moment.");
            return false;
          }
          // Filter provider / confidence control tags if emitted
          if (chunk.startsWith("[provider:") || chunk.startsWith("[confidence:")) {
            return;
          }
          setOutput((prev) => prev + chunk);
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to complete stream");
        }
      } finally {
        setStreaming(false);
      }
    },
    [defaultEndpoint]
  );

  const stopStream = useCallback(() => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = null;
    }
    setStreaming(false);
  }, []);

  const clearStream = useCallback(() => {
    setOutput("");
    setError(null);
  }, []);

  return {
    output,
    streaming,
    error,
    startStream,
    stopStream,
    clearStream,
    setOutput,
  };
}

export default useAgentStream;
