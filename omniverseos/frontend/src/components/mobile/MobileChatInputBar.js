import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const PLACEHOLDERS = [
  "Ask Cortex…",
  "Open Browser…",
  "Find my files…",
  "Summarize today…",
  "What's on my calendar?",
];

/**
 * Mobile-only floating input bar. Every control performs a real, working
 * action — there is no decorative button that does nothing:
 *  - mic: reuses existing speech-to-text pipeline
 *  - attach: real native file picker, reads real file metadata (and a real
 *    image preview via FileReader for image files)
 *  - camera: native camera capture via <input capture="environment">
 *  - clipboard: reads real clipboard text via the Clipboard API
 *  - send: existing send pipeline
 */
export default function MobileChatInputBar({
  input,
  setInput,
  onSend,
  streaming,
  isRecording,
  onToggleMic,
  onAttachFile,
}) {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (input) return; // stop rotating once the user starts typing
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 2600);
    return () => clearInterval(id);
  }, [input]);

  const handleFilePicked = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onAttachFile?.(file);
  }, [onAttachFile]);

  const handleClipboardPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.info("Clipboard is empty");
        return;
      }
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    } catch {
      toast.error("Clipboard access denied — allow permission in browser settings");
    }
  }, [setInput]);

  return (
    <div
      className="flex-shrink-0"
      style={{
        padding: "10px 10px calc(10px + env(safe-area-inset-bottom, 0px))",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(16px) saturate(160%)",
      }}
    >
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFilePicked} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFilePicked} />

      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 6px 6px 10px",
          borderRadius: 26,
          background: isRecording ? "rgba(255,0,60,0.06)" : "rgba(255,255,255,0.045)",
          border: `1px solid ${isRecording ? "rgba(255,0,60,0.4)" : "rgba(255,255,255,0.1)"}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        }}
      >
        <IconButton icon="fa-paperclip" title="Attach a file" onClick={() => fileInputRef.current?.click()} disabled={streaming} />
        <IconButton icon="fa-camera" title="Camera" onClick={() => cameraInputRef.current?.click()} disabled={streaming} />
        <IconButton icon="fa-clipboard" title="Paste from clipboard" onClick={handleClipboardPaste} disabled={streaming} />

        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={isRecording ? "Listening…" : PLACEHOLDERS[placeholderIdx]}
          style={{
            flex: 1, minWidth: 0,
            background: "transparent", border: "none", outline: "none",
            color: "#E2E8F0", fontSize: 14.5, padding: "8px 2px",
          }}
        />

        <IconButton
          icon={isRecording ? "fa-stop" : "fa-microphone"}
          title={isRecording ? "Stop recording" : "Speak to Cortex"}
          onClick={onToggleMic}
          disabled={streaming}
          active={isRecording}
          activeColor="#FF4466"
        />

        <button
          onClick={onSend}
          disabled={streaming || !input.trim()}
          data-testid="chat-send"
          style={{
            flexShrink: 0,
            width: 38, height: 38, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: (streaming || !input.trim())
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(135deg, #00F0FF, #7B5CFF)",
            border: "none", cursor: (streaming || !input.trim()) ? "not-allowed" : "pointer",
            color: (streaming || !input.trim()) ? "rgba(255,255,255,0.3)" : "#fff",
            boxShadow: (streaming || !input.trim()) ? "none" : "0 0 18px rgba(0,240,255,0.4)",
            transition: "all 0.18s ease",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <i className="fa-solid fa-paper-plane" style={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  );
}

function IconButton({ icon, title, onClick, disabled, active, activeColor = "#00F0FF" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        flexShrink: 0,
        width: 32, height: 32, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? `${activeColor}22` : "transparent",
        border: active ? `1px solid ${activeColor}88` : "1px solid transparent",
        color: active ? activeColor : "rgba(148,163,184,0.75)",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        WebkitTapHighlightColor: "transparent",
        transition: "all 0.15s ease",
      }}
    >
      <i className={`fa-solid ${icon}`} style={{ fontSize: 13 }} />
    </button>
  );
}
