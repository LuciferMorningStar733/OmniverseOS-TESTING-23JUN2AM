import React, { useState, useRef } from "react";
import { aiApi } from "../lib/api";
import { toast } from "sonner";

export default function Voice() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const recogRef = useRef(null);
  const transcriptRef = useRef(""); // avoid stale closure inside onend
  const startedRef = useRef(false);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Speech recognition not supported in this browser");
    if (startedRef.current) return; // guard double-start race

    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";

    transcriptRef.current = "";
    setTranscript("");
    setResponse("");

    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join("");
      transcriptRef.current = t;
      setTranscript(t);
    };

    r.onerror = () => {
      startedRef.current = false;
      setListening(false);
    };

    r.onend = async () => {
      startedRef.current = false;
      setListening(false);
      const text = transcriptRef.current.trim();
      if (!text) return;
      try {
        const { response: ans } = await aiApi.chat({
          session_id: "voice",
          message: text,
          provider: "anthropic",
          model: "claude-sonnet-4-6",
        });
        setResponse(ans);
        const u = new SpeechSynthesisUtterance(ans);
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      } catch {
        toast.error("Voice query failed");
      }
    };

    recogRef.current = r;
    startedRef.current = true;
    setListening(true);
    try {
      r.start();
    } catch {
      startedRef.current = false;
      setListening(false);
    }
  };

  const stop = () => {
    try { recogRef.current?.stop(); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-white" data-testid="voice-app">
      <div className="mono-label mb-2">// Voice Cortex</div>
      <h2 className="font-heading text-3xl font-black mb-6">Speak naturally.</h2>

      <button
        data-testid="voice-toggle"
        onClick={listening ? stop : start}
        className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all ${listening ? "pulse-glow" : ""}`}
        style={{ background: listening ? "linear-gradient(135deg,#FF003C,#00F0FF)" : "rgba(0,240,255,0.1)", border: `2px solid ${listening ? "#FF003C" : "#00F0FF"}` }}
      >
        <i className={`fa-solid ${listening ? "fa-stop" : "fa-microphone"} text-4xl`} style={{ color: listening ? "#fff" : "#00F0FF" }}></i>
        {listening && <span className="absolute inset-0 rounded-full border-2 border-[#00F0FF] animate-ping opacity-50" />}
      </button>

      <div className="mt-8 w-full max-w-lg space-y-3">
        {transcript && (
          <div className="glass-light rounded-xl p-4">
            <div className="mono-label opacity-60 mb-1">You</div>
            <div className="text-sm">{transcript}</div>
          </div>
        )}
        {response && (
          <div className="glass-light rounded-xl p-4 border-[#00F0FF]/30">
            <div className="mono-label text-[#00F0FF] mb-1">Cortex</div>
            <div className="text-sm">{response}</div>
          </div>
        )}
      </div>
    </div>
  );
}
