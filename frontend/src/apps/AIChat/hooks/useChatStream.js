import { useState, useRef, useCallback } from "react";
import { consumeSSE } from "../../../lib/api";

/**
 * Custom Hook: useChatStream
 * Handles SSE streaming for AIChat including provider tracking,
 * research sources parsing, confidence signal metadata, and error recovery.
 */
export function useChatStream({ onChunk, onSources, onConfidence, onProvider, onError, onDone }) {
  const [streaming, setStreaming] = useState(false);
  const abortCtrlRef = useRef(null);

  const startStream = useCallback(
    async (payload) => {
      setStreaming(true);
      abortCtrlRef.current = new AbortController();

      try {
        const token = localStorage.getItem("omniverse_token");
        const resp = await fetch("/api/ai/chat/stream", {
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

        await consumeSSE(resp, (payloadText) => {
          if (payloadText === "[DONE]") {
            if (onDone) onDone();
            return false;
          }

          if (payloadText.startsWith("[sources:")) {
            const rawSources = payloadText.slice(9, -1);
            try {
              const parsed = JSON.parse(rawSources);
              if (onSources) onSources(parsed);
            } catch {}
            return;
          }

          if (payloadText.startsWith("[confidence:")) {
            const rawConf = payloadText.slice(12, -1);
            try {
              const parsed = JSON.parse(rawConf);
              if (onConfidence) onConfidence(parsed);
            } catch {}
            return;
          }

          if (payloadText.startsWith("[provider:")) {
            const p = payloadText.slice(10, -1);
            if (onProvider) onProvider(p);
            return;
          }

          if (payloadText.startsWith("[error:")) {
            const errCode = payloadText.slice(7, -1);
            if (onError) onError(errCode);
            return false;
          }

          if (payloadText === "[quota_exceeded]") {
            if (onError) onError("429");
            return false;
          }

          if (onChunk) onChunk(payloadText);
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          if (onError) onError(err.message);
        }
      } finally {
        setStreaming(false);
      }
    },
    [onChunk, onSources, onConfidence, onProvider, onError, onDone]
  );

  const stopStream = useCallback(() => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = null;
    }
    setStreaming(false);
  }, []);

  return {
    streaming,
    startStream,
    stopStream,
  };
}

export default useChatStream;
