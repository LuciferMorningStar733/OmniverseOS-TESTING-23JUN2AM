import React, { useEffect, useRef, useState } from "react";
import { aiApi } from "../lib/api";
import { toast } from "sonner";

const SESSION_ID = "main";

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState({ provider: "anthropic", model: "claude-sonnet-4-6" });
  const endRef = useRef();
  const mountedRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    aiApi.history(SESSION_ID).then((m) => mountedRef.current && setMessages(m)).catch(() => {});
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const text = input;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await aiApi.chatStream({ session_id: SESSION_ID, message: text, ...model }, (delta) => {
        if (!mountedRef.current) return;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + delta };
          return copy;
        });
      }, ctrl.signal);
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("Chat failed");
    } finally {
      if (mountedRef.current) setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-white" data-testid="ai-chat-app">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="mono-label">// Cortex Online</div>
          <h2 className="font-heading text-xl font-bold">AI Assistant</h2>
        </div>
        <select
          value={`${model.provider}|${model.model}`}
          onChange={(e) => { const [p, m] = e.target.value.split("|"); setModel({ provider: p, model: m }); }}
          className="input-cyber !py-1 !w-auto text-xs"
          data-testid="model-select"
        >
          <option value="anthropic|claude-sonnet-4-6">Claude Sonnet 4.6</option>
          <option value="openai|gpt-5.4">GPT-5.4</option>
          <option value="gemini|gemini-3-flash-preview">Gemini 3 Flash</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 pt-10">
            <i className="fa-solid fa-wand-magic-sparkles text-4xl text-[#00F0FF] opacity-50"></i>
            <div className="mt-3 text-sm">Ask me anything. I remember our conversation.</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed text-sm
              ${m.role === "user" ? "bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-white" : "glass-light text-slate-200"}`}>
              {m.content || (streaming && i === messages.length - 1 && <span className="text-[#00F0FF] animate-pulse">▊</span>)}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-white/10 flex items-center gap-2">
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message the cortex…"
          className="input-cyber flex-1"
        />
        <button data-testid="chat-send" onClick={send} disabled={streaming} className="neon-btn primary !py-2">
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
}
