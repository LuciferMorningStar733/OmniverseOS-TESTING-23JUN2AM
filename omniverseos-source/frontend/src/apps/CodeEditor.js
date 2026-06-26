import React, { useState } from "react";

const LANGS = ["javascript", "python", "html", "css", "json"];

const starter = `// OmniverseOS Code Editor
// Press Run to execute (sandboxed eval for JS)

function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("First 10 Fibonacci:", Array.from({length: 10}, (_, i) => fibonacci(i)));
`;

export default function CodeEditor() {
  const [code, setCode] = useState(starter);
  const [lang, setLang] = useState("javascript");
  const [output, setOutput] = useState([]);

  const run = () => {
    if (lang !== "javascript") {
      setOutput([{ type: "info", text: `Execution for ${lang} not supported in sandbox` }]);
      return;
    }
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => { logs.push({ type: "log", text: args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") }); origLog(...args); };
    try {
      const fn = new Function(code);
      const result = fn();
      if (result !== undefined) logs.push({ type: "return", text: String(result) });
    } catch (e) {
      logs.push({ type: "error", text: e.message });
    }
    console.log = origLog;
    setOutput(logs.length ? logs : [{ type: "info", text: "Executed (no output)" }]);
  };

  return (
    <div className="flex flex-col h-full text-white" data-testid="code-app">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-code text-[#39FF14]"></i>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="input-cyber !py-1 !w-auto text-xs">
            {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button data-testid="code-run" onClick={run} className="neon-btn primary !py-1.5 text-xs"><i className="fa-solid fa-play mr-2"></i>Run</button>
      </div>
      <div className="flex-1 grid grid-rows-[1fr_180px] overflow-hidden">
        <textarea
          data-testid="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="bg-[#05050A] p-4 font-mono text-sm text-slate-200 outline-none resize-none"
          style={{ tabSize: 2 }}
        />
        <div className="border-t border-white/10 bg-black/40 p-3 overflow-y-auto font-mono text-xs space-y-1">
          <div className="mono-label opacity-60 mb-1">// Console Output</div>
          {output.length === 0 && <div className="text-slate-600">Ready.</div>}
          {output.map((o, i) => (
            <div key={i} className={o.type === "error" ? "text-[#FF003C]" : o.type === "return" ? "text-[#39FF14]" : "text-slate-300"}>
              <span className="text-slate-600 mr-2">{">"}</span>{o.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
