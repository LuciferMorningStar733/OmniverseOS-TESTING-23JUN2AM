import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as SelectPrimitive from "@radix-ui/react-select";
import { aiApi } from "../lib/api";

/* ── CyberSelect — fixed Radix UI (no invalid render props) ─────────────── */
function CyberSelect({ value, onValueChange, options, placeholder, small }) {
  const triggerStyle = {
    display:"inline-flex", alignItems:"center", gap:6,
    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.10)",
    borderRadius:8, cursor:"pointer", padding:small?"3px 10px":"6px 12px",
    color:"#fff", fontFamily:"'JetBrains Mono', monospace", fontSize:small?11:12,
    letterSpacing:"0.04em", transition:"border-color 0.18s, box-shadow 0.18s",
    outline:"none", userSelect:"none", whiteSpace:"nowrap",
  };
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger style={triggerStyle}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(0,240,255,0.45)";e.currentTarget.style.boxShadow="0 0 14px rgba(0,240,255,0.12)";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.10)";e.currentTarget.style.boxShadow="none";}}>
        <SelectPrimitive.Value placeholder={placeholder}/>
        <SelectPrimitive.Icon>
          <i className="fa-solid fa-chevron-down" style={{ fontSize:9, opacity:0.5, marginLeft:2 }}/>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} style={{
          background:"rgba(8,10,18,0.96)", backdropFilter:"blur(24px)",
          border:"1px solid rgba(0,240,255,0.18)", borderRadius:12, padding:"6px",
          boxShadow:"0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,240,255,0.08)",
          zIndex:9999, minWidth:160,
        }}>
          <SelectPrimitive.Viewport>
            {options.map(opt=>(
              <SelectPrimitive.Item key={opt.value??opt} value={opt.value??opt}
                style={{ outline:"none", listStyle:"none" }}>
                <div style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"7px 12px", borderRadius:8, cursor:"pointer",
                  fontFamily:"'JetBrains Mono', monospace", fontSize:12,
                  color:"rgba(255,255,255,0.85)", transition:"background 0.12s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                  <SelectPrimitive.ItemText>{opt.label??opt}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <i className="fa-solid fa-check" style={{ fontSize:10, color:"#00F0FF" }}/>
                  </SelectPrimitive.ItemIndicator>
                </div>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ── Language config ─────────────────────────────────────────────────────── */
const LANGS = [
  { value:"javascript", label:"JavaScript", icon:"fa-js",         color:"#FCEE09" },
  { value:"python",     label:"Python",     icon:"fa-python",     color:"#39FF14" },
  { value:"html",       label:"HTML",       icon:"fa-html5",      color:"#FF6B35" },
  { value:"css",        label:"CSS",        icon:"fa-css3-alt",   color:"#00F0FF" },
  { value:"json",       label:"JSON",       icon:"fa-code",       color:"#C778DD" },
  { value:"typescript", label:"TypeScript", icon:"fa-code",       color:"#60A5FA" },
  { value:"bash",       label:"Bash",       icon:"fa-terminal",   color:"#39FF14" },
];

const THEMES = [
  { value:"cyber",   label:"Cyber Dark"  },
  { value:"matrix",  label:"Matrix"      },
  { value:"solarized",label:"Solarized"  },
];

const STARTERS = {
  javascript:`// OmniverseOS Code Editor — JavaScript
// Press ▶ Run or ⌘↵ to execute (sandboxed)

function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = Array.from({ length: 10 }, (_, i) => fibonacci(i));
console.log("Fibonacci sequence:", result);
console.log("Sum:", result.reduce((a, b) => a + b, 0));
console.log("Golden ratio ≈", (fibonacci(20) / fibonacci(19)).toFixed(6));
`,
  python:`# Python — syntax preview only (sandbox executes JS)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = [fibonacci(i) for i in range(10)]
print("Fibonacci:", result)
print("Sum:", sum(result))
`,
  typescript:`// TypeScript — syntax preview
interface User {
  id: number;
  name: string;
  email: string;
}

const greet = (user: User): string => {
  return \`Hello, \${user.name}!\`;
};

const user: User = { id: 1, name: "OmniUser", email: "user@omniverse.os" };
console.log(greet(user));
`,
  html:`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>OmniverseOS Preview</title>
    <style>
      body { background: #080a12; color: #00F0FF; font-family: 'JetBrains Mono', monospace; }
      h1 { text-shadow: 0 0 20px #00F0FF; }
    </style>
  </head>
  <body>
    <h1>Hello from OmniverseOS</h1>
    <p>HTML preview mode — CSS & JS supported.</p>
  </body>
</html>`,
  css:`/* OmniverseOS CSS Theme */
:root {
  --cyan:   #00f0ff;
  --green:  #39ff14;
  --red:    #ff003c;
  --yellow: #fcee09;
  --bg:     #080a12;
}

body {
  background: var(--bg);
  color: var(--cyan);
  font-family: 'JetBrains Mono', monospace;
}

.glass {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}`,
  json:`{
  "app": "OmniverseOS",
  "version": "2.0.0",
  "codename": "NEXUS",
  "features": ["AI Chat", "Voice", "Browser", "Finance", "Memory"],
  "theme": {
    "primary": "#00F0FF",
    "accent":  "#FF003C",
    "success": "#39FF14"
  },
  "ai": {
    "model": "cortex-v3",
    "capabilities": ["memory", "context", "voice", "vision"]
  }
}`,
  bash:`#!/bin/bash
# OmniverseOS — shell preview

echo "=== OmniverseOS System Info ==="
echo "OS: OmniverseOS v2.0"
echo "Kernel: omni-6.1.0-cyber"
echo "Uptime: $(uptime -p)"

# List running services
services=("ai-cortex" "memory-layer" "network-mesh" "storage-pool")
for svc in "\${services[@]}"; do
  echo "✓ $svc [ONLINE]"
done
`,
};

/* ── Console line colors ─────────────────────────────────────────────────── */
const LINE_STYLE = {
  error:  { color:"#FF003C", icon:"fa-circle-xmark"     },
  return: { color:"#39FF14", icon:"fa-arrow-turn-down"  },
  info:   { color:"#00F0FF", icon:"fa-circle-info"       },
  log:    { color:"#C8D3E0", icon:"fa-terminal"          },
  warn:   { color:"#FCEE09", icon:"fa-triangle-exclamation" },
};

/* ── CodeEditor ──────────────────────────────────────────────────────────── */
export default function CodeEditor() {
  const [lang,    setLang]    = useState("javascript");
  const [theme,   setTheme]   = useState("cyber");
  const [code,    setCode]    = useState(STARTERS.javascript);
  const [output,  setOutput]  = useState([]);
  const [running, setRunning] = useState(false);
  const [consoleH, setConsoleH] = useState(190);
  // Phase 18: Agentic AI command bar state
  const [aiCmd,        setAiCmd]        = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const aiAbortRef = useRef(null);
  const textareaRef = useRef(null);

  const activeLang = LANGS.find(l=>l.value===lang);

  const handleLangChange = useCallback((next) => {
    setLang(next);
    setCode(STARTERS[next]??"");
    setOutput([]);
  }, []);

  const run = useCallback(() => {
    if (lang !== "javascript") {
      setOutput([{ type:"info", text:`Live execution is JS-only. Showing ${activeLang?.label||lang} syntax preview.` }]);
      return;
    }
    setRunning(true);
    setOutput([]);
    setTimeout(() => {
      const logs = [];
      const orig = { log:console.log, warn:console.warn, error:console.error };
      console.log   = (...a) => logs.push({ type:"log",   text:a.map(x=>typeof x==="object"?JSON.stringify(x,null,2):String(x)).join(" ") });
      console.warn  = (...a) => logs.push({ type:"warn",  text:a.map(String).join(" ") });
      console.error = (...a) => logs.push({ type:"error", text:a.map(String).join(" ") });
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(code);
        const result = fn();
        if (result !== undefined) logs.push({ type:"return", text:typeof result==="object"?JSON.stringify(result,null,2):String(result) });
      } catch(e) {
        logs.push({ type:"error", text:e.message });
      }
      Object.assign(console, orig);
      setOutput(logs.length?logs:[{ type:"info", text:"Executed successfully — no output." }]);
      setRunning(false);
    }, 80);
  }, [code, lang, activeLang]);

  // Phase 18: Agentic AI command — streams raw code directly into the editor
  const handleAiCmd = useCallback(async () => {
    const prompt = aiCmd.trim();
    if (!prompt || aiGenerating) return;
    if (aiAbortRef.current) aiAbortRef.current.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setAiGenerating(true);
    setCode("");
    setOutput([]);
    const AI_CODE_SYSTEM =
      "You are an expert developer. The user will ask for a script or game. " +
      "Output ONLY the raw JavaScript code. No markdown formatting, no explanations. Just the code.";
    let accumulated = "";
    try {
      await aiApi.chatStreamResilient(
        {
          session_id: `codegen-${Date.now()}`,
          message: prompt,
          system: AI_CODE_SYSTEM,
          provider: "gemini",
          model: "gemini-2.5-flash",
          preferred_provider: "gemini",
          mode: "chat",
        },
        (delta) => {
          if (ctrl.signal.aborted) return;
          accumulated += delta;
          // Strip any accidental markdown fences in real time
          const clean = accumulated.replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "");
          setCode(clean);
        },
        null, ctrl.signal, null, null, null
      );
    } catch { /* non-fatal */ }
    setAiGenerating(false);
    setAiCmd("");
    // Strip fences one final time after stream completes
    setCode(prev => prev.replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim());
  }, [aiCmd, aiGenerating]);

  const handleKeyDown = useCallback((e) => {
    if (e.key==="Tab") {
      e.preventDefault();
      const el=e.currentTarget, s=el.selectionStart, end=el.selectionEnd;
      const next=code.substring(0,s)+"  "+code.substring(end);
      setCode(next);
      requestAnimationFrame(()=>{ el.selectionStart=el.selectionEnd=s+2; });
    }
    if (e.key==="Enter"&&(e.ctrlKey||e.metaKey)) run();
  }, [code, run]);

  const themeEditorBg = theme==="matrix"?"rgba(0,20,0,0.5)":theme==="solarized"?"rgba(0,30,35,0.5)":"rgba(0,0,0,0.35)";
  const themeConsoleBg = theme==="matrix"?"rgba(0,10,0,0.6)":theme==="solarized"?"rgba(0,20,25,0.55)":"rgba(0,0,0,0.5)";

  return (
    <div className="flex flex-col h-full text-white" data-testid="code-app">

      {/* Phase 18: Agentic AI Command Bar */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderBottom:"1px solid rgba(0,240,255,0.08)", background:"rgba(0,10,20,0.6)" }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 9, color: "#00F0FF" }} />
        </div>
        <input
          value={aiCmd}
          onChange={e => setAiCmd(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiCmd(); } }}
          placeholder="Ask Cortex to write code… (e.g. 'build Flappy Bird')"
          disabled={aiGenerating}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "rgba(255,255,255,0.85)", fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.01em",
            caretColor: "#00F0FF",
          }}
        />
        {aiGenerating ? (
          <button
            onClick={() => { aiAbortRef.current?.abort(); setAiGenerating(false); }}
            style={{
              flexShrink: 0, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
              background: "rgba(255,0,60,0.12)", border: "1px solid rgba(255,0,60,0.3)",
              color: "#FF7090", fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            <i className="fa-solid fa-stop text-[9px] mr-1" />stop
          </button>
        ) : (
          <button
            onClick={handleAiCmd}
            disabled={!aiCmd.trim()}
            style={{
              flexShrink: 0, padding: "3px 10px", borderRadius: 6, cursor: aiCmd.trim() ? "pointer" : "default",
              background: aiCmd.trim() ? "rgba(0,240,255,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${aiCmd.trim() ? "rgba(0,240,255,0.35)" : "rgba(255,255,255,0.08)"}`,
              color: aiCmd.trim() ? "#00F0FF" : "rgba(255,255,255,0.25)",
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            Generate
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 gap-2 flex-wrap"
        style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background:`${activeLang?.color||"#00F0FF"}18` }}>
            <i className={`fa-brands ${activeLang?.icon??"fa-code"} text-[10px]`} style={{ color:activeLang?.color??"#00F0FF" }}/>
          </div>

          <CyberSelect value={lang} onValueChange={handleLangChange}
            options={LANGS.map(l=>({ value:l.value, label:l.label }))} placeholder="Language" small/>

          <CyberSelect value={theme} onValueChange={setTheme}
            options={THEMES} placeholder="Theme" small/>

          <span className="font-mono text-[10px] text-slate-500 hidden sm:block" style={{ letterSpacing:"0.12em" }}>⌘↵ run</span>
        </div>

        <div className="flex items-center gap-2">
          {output.length>0 && (
            <motion.button initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}}
              onClick={()=>setOutput([])} className="neon-btn !py-1 !px-2.5 text-[11px]" title="Clear output">
              <i className="fa-solid fa-trash-can text-[10px]"/>
            </motion.button>
          )}
          <motion.button data-testid="code-run" onClick={run} whileTap={{scale:0.93}}
            className="neon-btn primary !py-1.5 text-xs flex items-center gap-2" disabled={running}>
            {running
              ? <><i className="fa-solid fa-spinner fa-spin text-[10px]"/> Running</>
              : <><i className="fa-solid fa-play text-[10px]"/> Run</>
            }
          </motion.button>
        </div>
      </div>

      {/* Editor + Console */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Code textarea */}
        <div className="relative flex-1 overflow-hidden">
          {/* Line numbers */}
          <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col overflow-hidden pointer-events-none"
            style={{ background:"rgba(0,0,0,0.15)", borderRight:"1px solid rgba(255,255,255,0.04)", zIndex:2 }}>
            {code.split("\n").map((_,i)=>(
              <div key={i} className="font-mono text-[9px] text-slate-600 px-1.5 leading-7 select-none flex-shrink-0"
                style={{ lineHeight:"1.7rem" }}>
                {i+1}
              </div>
            ))}
          </div>
          <textarea ref={textareaRef} data-testid="code-input"
            value={code} onChange={e=>setCode(e.target.value)} onKeyDown={handleKeyDown}
            spellCheck={false} autoCapitalize="off" autoCorrect="off"
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm text-slate-200 outline-none resize-none scrollbar-none"
            style={{ background:themeEditorBg, tabSize:2, lineHeight:1.7, caretColor:"#00F0FF", letterSpacing:"0.01em", paddingLeft:48 }}/>
        </div>

        {/* Console */}
        <div className="flex-shrink-0 overflow-y-auto scrollbar-none"
          style={{ height:consoleH, borderTop:"1px solid rgba(255,255,255,0.07)", background:themeConsoleBg }}>
          <div className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(0,0,0,0.2)" }}>
            <div className="font-mono text-[9px] uppercase tracking-widest text-slate-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block"/>
              Console Output
            </div>
            <div className="flex gap-1">
              {[160,190,260].map(h=>(
                <button key={h} onClick={()=>setConsoleH(h)}
                  className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                  style={{ background:consoleH===h?"rgba(0,240,255,0.12)":"rgba(255,255,255,0.04)", color:consoleH===h?"#00F0FF":"#475569", border:"none", cursor:"pointer" }}>
                  {h===160?"S":h===190?"M":"L"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 space-y-1">
            {output.length===0&&!running && (
              <div className="text-slate-600 text-xs font-mono flex items-center gap-2 py-2">
                <i className="fa-solid fa-terminal text-[10px]"/>
                Ready. Press <kbd className="px-1.5 py-0.5 rounded text-[10px] border border-white/10 bg-white/5 mx-0.5">▶ Run</kbd> to execute JavaScript.
              </div>
            )}
            <AnimatePresence initial={false}>
              {output.map((o,i)=>{
                const style=LINE_STYLE[o.type]??LINE_STYLE.log;
                return (
                  <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
                    transition={{ delay:i*0.04, duration:0.18, ease:"easeOut" }}
                    className="flex items-start gap-2 font-mono text-xs" style={{ color:style.color }}>
                    <i className={`fa-solid ${style.icon} mt-0.5 flex-shrink-0 text-[10px] opacity-70`}/>
                    <pre className="whitespace-pre-wrap break-all leading-relaxed">{o.text}</pre>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
