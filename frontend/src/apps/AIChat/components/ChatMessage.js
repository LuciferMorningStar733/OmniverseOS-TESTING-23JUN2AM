import React, { useState, useRef, useCallback, useEffect } from "react";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { toast } from "sonner";

export function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const handleCopy = useCallback(() => {
    if (!text) return;
    const resetAfter = () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    };
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied!", { duration: 1500, style: { fontSize: 13 } });
      resetAfter();
    }).catch(() => {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        resetAfter();
      } catch {
        toast.error("Copy failed");
      }
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title="Copy"
      aria-label="Copy message"
      className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-all duration-200 flex-shrink-0 select-none"
      style={{
        background: copied ? "rgba(57,255,20,0.12)" : "rgba(255,255,255,0.04)",
        border: copied
          ? "1px solid rgba(57,255,20,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        color: copied ? "#39FF14" : "rgba(255,255,255,0.4)",
      }}
    >
      {copied ? (
        <>
          <i className="fa-solid fa-check text-[9px]" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <i className="fa-regular fa-copy text-[9px]" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function ChatMessage({ message, isLast, streaming, onActionClick }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} my-2.5 px-3`}
      style={{ animation: "fadeSlideUp 0.2s ease both" }}
    >
      <div
        className={`relative max-w-[85%] rounded-2xl p-4 text-sm ${
          isUser
            ? "bg-[#00F0FF]/10 text-white border border-[#00F0FF]/20 rounded-tr-none"
            : "bg-slate-900/80 text-slate-100 border border-slate-700/50 rounded-tl-none shadow-xl"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 opacity-60 text-xs font-mono">
          <span>{isUser ? "You" : "Cortex AI"}</span>
          <CopyButton text={message.content} />
        </div>

        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
