import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as SelectPrimitive from "@radix-ui/react-select";

/* ─────────────────────────────────────────────────────────────────────────────
   CyberSelect — themed Radix Select for the OS aesthetic
   ───────────────────────────────────────────────────────────────────────────── */
function CyberSelect({ value, onValueChange, options, placeholder, small }) {
  const triggerStyle = {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 8, cursor: "pointer",
    padding: small ? "3px 10px" : "6px 12px",
    color: "#fff",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: small ? 11 : 12,
    letterSpacing: "0.04em",
    transition: "border-color 0.18s, box-shadow 0.18s",
    outline: "none", userSelect: "none",
    whiteSpace: "nowrap",
  };
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        style={triggerStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.45)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(0,240,255,0.12)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          style={{
            background: "rgba(8,10,18,0.96)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(0,240,255,0.18)",
            borderRadius: 12, padding: "6px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,240,255,0.08)",
            zIndex: 9999, minWidth: 160,
            animation: "selectSlide 0.16s ease",
          }}
        >
          <SelectPrimitive.Viewport>
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value ?? opt}
                value={opt.value ?? opt}
                style={{ outline: "none" }}
              >
                {({ isSelected }) => (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                    color: isSelected ? "#00F0FF" : "rgba(255,255,255,0.85)",
                    background: isSelected ? "rgba(0,240,255,0.08)" : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? "rgba(0,240,255,0.08)" : "transparent"; }}
                  >
                    <SelectPrimitive.ItemText>{opt.label ?? opt}</SelectPrimitive.ItemText>
                    {isSelected && <i className="fa-solid fa-check" style={{ fontSize: 10, color: "#00F0FF" }} />}
                  </div>
                )}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Language config
   ───────────────────────────────────────────────────────────────────────────── */
const LANGS = [
  { value: "javascript", label: "JavaScript", icon: "fa-js", color: "#FCEE09" },
  { value: "python",     label: "Python",     icon: "fa-python", color: "#39FF14" },
  { value: "html",       label: "HTML",       icon: "fa-html5", color: "#FF6B35" },
  { value: "css",        label: "CSS",        icon: "fa-css3-alt", color: "#00F0FF" },
  { value: "json",       label: "JSON",       icon: "fa-brackets-curly", color: "#C778DD" },
];

const STARTERS = {
  javascript: `// OmniverseOS Code Editor
// Press ▶ Run to execute (sandboxed eval)

function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = Array.from({ length: 10 }, (_, i) => fibonacci(i));
console.log("Fibonacci sequence:", result);
console.log("Sum:", result.reduce((a, b) => a + b, 0));
`,
  python: `# Python syntax preview only (sandbox is JS)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = [fibonacci(i) for i in range(10)]
print("Fibonacci:", result)
`,
  html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Preview</title>
  </head>
  <body>
    <h1>Hello from OmniverseOS</h1>
    <p>HTML preview mode.</p>
  </body>
</html>`,
  css: `/* CSS preview mode */
:root {
  --cyan: #00f0ff;
  --bg: #080a12;
}

body {
  background: var(--bg);
  color: var(--cyan);
  font-family: 'JetBrains Mono', monospace;
}`,
  json: `{
  "app": "OmniverseOS",
  "version": "2.0.0",
  "features": ["AI Chat", "Voice", "Browser", "Finance"],
  "theme": {
    "primary": "#00F0FF",
    "accent": "#FF003C"
  }
}`,
};

/* ─────────────────────────────────────────────────────────────────────────────
   Console line colours
   ───────────────────────────────────────────────────────────────────────────── */
const LINE_STYLE = {
  error:  { color: "#FF003C", icon: "fa-circle-xmark" },
  return: { color: "#39FF14", icon: "fa-arrow-turn-down" },
  info:   { color: "#00F0FF", icon: "fa-circle-info" },
  log:    { color: "#C8D3E0", icon: "fa-terminal" },
};

/* ─────────────────────────────────────────────────────────────────────────────
   CodeEditor
   ───────────────────────────────────────────────────────────────────────────── */
export default function CodeEditor() {
  const [lang, setLang]       = useState("javascript");
  const [code, setCode]       = useState(STARTERS.javascript);
  const [output, setOutput]   = useState([]);
  const [running, setRunning] = useState(false);
  const textareaRef           = useRef(null);

  const activeLang = LANGS.find((l) => l.value === lang);

  const handleLangChange = useCallback((next) => {
    setLang(next);
    setCode(STARTERS[next] ?? "");
    setOutput([]);
  }, []);

  const run = useCallback(() => {
    if (lang !== "javascript") {
      setOutput([{ type: "info", text: `Live execution for ${lang} is not supported in the sandbox. Showing syntax preview.` }]);
      return;
    }
    setRunning(true);
    setOutput([]);

    setTimeout(() => {
      const logs = [];
      const origLog     = console.log;
      const origWarn    = console.warn;
      const origError   = console.error;

      console.log   = (...args) => logs.push({ type: "log",   text: args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ") });
      console.warn  = (...args) => logs.push({ type: "info",  text: args.map(String).join(" ") });
      console.error = (...args) => logs.push({ type: "error", text: args.map(String).join(" ") });

      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(code);
        const result = fn();
        if (result !== undefined) logs.push({ type: "return", text: String(result) });
      } catch (e) {
        logs.push({ type: "error", text: e.message });
      }

      console.log   = origLog;
      console.warn  = origWarn;
      console.error = origError;

      setOutput(logs.length ? logs : [{ type: "info", text: "Executed successfully — no output." }]);
      setRunning(false);
    }, 80);
  }, [code, lang]);

  /* Tab key inserts 2 spaces */
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el  = e.currentTarget;
      const s   = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.substring(0, s) + "  " + code.substring(end);
      setCode(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run();
  }, [code, run]);

  return (
    <div className="flex flex-col h-full text-white" data-testid="code-app">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3">
          <i
            className={`fa-brands ${activeLang?.icon ?? "fa-code"} text-sm`}
            style={{ color: activeLang?.color ?? "#00F0FF" }}
          />
          <CyberSelect
            value={lang}
            onValueChange={handleLangChange}
            options={LANGS.map((l) => ({ value: l.value, label: l.label }))}
            placeholder="Language"
            small
          />
          <span
            className="font-mono text-[10px] text-slate-500 hidden sm:block"
            style={{ letterSpacing: "0.12em" }}
          >
            ⌘↵ to run
          </span>
        </div>

        <div className="flex items-center gap-2">
          {output.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setOutput([])}
              className="neon-btn !py-1 !px-2.5 text-[11px]"
              title="Clear output"
            >
              <i className="fa-solid fa-trash-can text-[10px]" />
            </motion.button>
          )}
          <motion.button
            data-testid="code-run"
            onClick={run}
            whileTap={{ scale: 0.93 }}
            className="neon-btn primary !py-1.5 text-xs flex items-center gap-2"
            disabled={running}
          >
            {running
              ? <><i className="fa-solid fa-spinner fa-spin text-[10px]" /> Running</>
              : <><i className="fa-solid fa-play text-[10px]" /> Run</>
            }
          </motion.button>
        </div>
      </div>

      {/* ── Editor + Console split ───────────────────────────────── */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateRows: "1fr 190px" }}>

        {/* Code textarea */}
        <div className="relative overflow-hidden">
          <textarea
            ref={textareaRef}
            data-testid="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm text-slate-200 outline-none resize-none scrollbar-none"
            style={{
              background: "rgba(0,0,0,0.35)",
              tabSize: 2,
              lineHeight: 1.7,
              caretColor: "#00F0FF",
              letterSpacing: "0.01em",
            }}
          />
        </div>

        {/* Console output */}
        <div
          className="overflow-y-auto p-3 space-y-1 scrollbar-none"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.5)" }}
        >
          <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
            Console Output
          </div>

          {output.length === 0 && !running && (
            <div className="text-slate-600 text-xs font-mono flex items-center gap-2 py-2">
              <i className="fa-solid fa-terminal text-[10px]" />
              Ready. Press <kbd className="px-1.5 py-0.5 rounded text-[10px] border border-white/10 bg-white/5 mx-0.5">▶ Run</kbd> to execute.
            </div>
          )}

          <AnimatePresence initial={false}>
            {output.map((o, i) => {
              const style = LINE_STYLE[o.type] ?? LINE_STYLE.log;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18, ease: "easeOut" }}
                  className="flex items-start gap-2 font-mono text-xs"
                  style={{ color: style.color }}
                >
                  <i className={`fa-solid ${style.icon} mt-0.5 flex-shrink-0 text-[10px] opacity-70`} />
                  <pre className="whitespace-pre-wrap break-all leading-relaxed">{o.text}</pre>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
