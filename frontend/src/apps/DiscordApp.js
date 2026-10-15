import React, { useState } from "react";
import DemoBadge from "../components/DemoBadge";
import { aiApi } from "../lib/api";

const SERVERS = [
  { id: "omni", name: "OmniVerse", channels: ["general", "ai-talk", "design"] },
  { id: "cyber", name: "Cyber Lounge", channels: ["lobby", "synthwave", "memes"] },
  { id: "code", name: "Code Cell", channels: ["js", "python", "rust"] },
];

const initial = {
  general: [
    { user: "Cortex", text: "Welcome to OmniVerse — your AI command center.", color: "#00F0FF" },
    { user: "Nyx", text: "Anyone tried the new image gen?", color: "#FF003C" },
    { user: "Vector", text: "Yes! Outputs are insane.", color: "#FCEE09" },
  ],
  "ai-talk": [{ user: "Cortex", text: "GPT vs Claude vs Gemini — discuss.", color: "#00F0FF" }],
  design: [{ user: "Nyx", text: "Cyberpunk > everything.", color: "#FF003C" }],
  lobby: [{ user: "Echo", text: "Vibes only.", color: "#39FF14" }],
  synthwave: [{ user: "Vector", text: "Mix dropping at 8.", color: "#FCEE09" }],
  memes: [{ user: "Glitch", text: "(╯°□°)╯︵ ┻━┻", color: "#00F0FF" }],
  js: [{ user: "Cortex", text: "async/await > .then() change my mind.", color: "#00F0FF" }],
  python: [{ user: "Echo", text: "FastAPI is criminally underrated.", color: "#39FF14" }],
  rust: [{ user: "Vector", text: "Borrow checker is love.", color: "#FCEE09" }],
};

export default function DiscordApp() {
  const [server, setServer] = useState("omni");
  const [channel, setChannel] = useState("general");
  const [messages, setMessages] = useState(initial);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => ({
      ...m,
      [channel]: [...(m[channel] || []), { user: "You", text, color: "#00F0FF" }]
    }));

    setIsBotTyping(true);
    try {
      let reply = "";
      await aiApi.chatStreamResilient(
        {
          session_id: `discord-${server}-${channel}`,
          message: text,
          model: "gemini-2.5-flash",
          provider: "gemini",
          system: `You are Cortex participating in a multi-user cyberpunk Discord channel (#${channel} in server ${server}). Respond naturally, witty, concisely (1-3 sentences max).`,
        },
        (delta) => { reply += delta; },
        null,
        new AbortController().signal
      );
      if (reply) {
        setMessages((m) => ({
          ...m,
          [channel]: [...(m[channel] || []), { user: "Cortex", text: reply.trim(), color: "#00F0FF" }]
        }));
      }
    } catch {
      setMessages((m) => ({
        ...m,
        [channel]: [...(m[channel] || []), { user: "Cortex", text: "Neural signal acknowledged on the mesh.", color: "#00F0FF" }]
      }));
    } finally {
      setIsBotTyping(false);
    }
  };

  const channels = SERVERS.find((s) => s.id === server).channels;

  return (
    <div className="flex flex-col h-full text-white" data-testid="discord-app">
      <DemoBadge note="Messages stay local to this browser session." />
      <div className="flex flex-1 overflow-hidden">
      <div className="w-16 bg-black/40 flex flex-col items-center py-3 gap-2 border-r border-white/10">
        {SERVERS.map((s) => (
          <button key={s.id} onClick={() => { setServer(s.id); setChannel(SERVERS.find(x => x.id === s.id).channels[0]); }} className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold transition ${server === s.id ? "bg-[#00F0FF] text-black rounded-xl" : "bg-white/5 text-slate-300 hover:bg-white/10 hover:rounded-xl"}`}>
            {s.name[0]}
          </button>
        ))}
      </div>
      <div className="w-48 border-r border-white/10 p-3">
        <div className="font-heading font-bold mb-3">{SERVERS.find((s) => s.id === server).name}</div>
        {channels.map((ch) => (
          <button key={ch} onClick={() => setChannel(ch)} className={`w-full text-left px-2 py-1.5 rounded text-sm ${channel === ch ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}>
            <span className="text-slate-500">#</span> {ch}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 font-mono text-sm text-slate-300"># {channel}</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(messages[channel] || []).map((m, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: `${m.color}22`, color: m.color }}>{m.user[0]}</div>
              <div>
                <div className="text-sm font-medium" style={{ color: m.color }}>{m.user}</div>
                <div className="text-sm text-slate-200">{m.text}</div>
              </div>
            </div>
          ))}
          {isBotTyping && (
            <div className="flex items-center gap-2 text-xs text-[#00F0FF] font-mono pl-12 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
              Cortex is typing...
            </div>
          )}
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input data-testid="discord-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`Message #${channel}`} className="input-cyber flex-1" />
          <button onClick={send} className="neon-btn primary"><i className="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
      </div>
    </div>
  );
}
