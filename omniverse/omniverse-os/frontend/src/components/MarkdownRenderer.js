import React, { useCallback, useState } from "react";
import { toast } from "sonner";

/* ── Lightweight Markdown Renderer for OmniverseOS ──────────────────────────
   Handles: headers, bold, italic, inline-code, code-blocks, ordered/unordered
   lists, blockquotes, tables, horizontal rules, and hyperlinks.
   Streaming-safe: renders whatever partial text exists at any moment.
   ─────────────────────────────────────────────────────────────────────────── */

// ── Code block copy button ──────────────────────────────────────────────────
function CodeCopyBtn({ code }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Copy failed");
    });
  }, [code]);

  return (
    <button
      onClick={handle}
      title="Copy code"
      style={{
        position: "absolute", top: 8, right: 8,
        display: "flex", alignItems: "center", gap: 4,
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 10,
        fontFamily: "monospace",
        border: copied
          ? "1px solid rgba(57,255,20,0.4)"
          : "1px solid rgba(255,255,255,0.12)",
        background: copied
          ? "rgba(57,255,20,0.12)"
          : "rgba(255,255,255,0.06)",
        color: copied ? "#39FF14" : "rgba(255,255,255,0.45)",
        cursor: "pointer",
        transition: "all 0.18s ease",
        zIndex: 2,
      }}
    >
      <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} style={{ fontSize: 9 }} />
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Keyword highlighting map for code blocks ────────────────────────────────
const KEYWORD_COLOR  = "#CF9EFF";  // purple — keywords
const STRING_COLOR   = "#A8FF80";  // green — strings
const COMMENT_COLOR  = "#555E75";  // muted — comments
const NUMBER_COLOR   = "#FCEE09";  // yellow — numbers
const FUNCTION_COLOR = "#00F0FF";  // cyan — functions / tags
const OPERATOR_COLOR = "#FF6B6B";  // red — operators

function syntaxHighlight(code, lang) {
  // Escape HTML first
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (!lang || lang === "text" || lang === "plain") return escaped;

  let result = escaped;

  // Comments
  result = result.replace(/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g,
    `<span style="color:${COMMENT_COLOR}">$1</span>`);

  // Strings (double and single quoted, with escaped quotes inside)
  result = result.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    `<span style="color:${STRING_COLOR}">$1</span>`);

  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g,
    `<span style="color:${NUMBER_COLOR}">$1</span>`);

  const jsKeywords = /\b(const|let|var|function|return|if|else|for|while|do|class|import|export|default|from|async|await|try|catch|finally|throw|new|this|typeof|instanceof|in|of|null|undefined|true|false|void|delete|switch|case|break|continue|yield)\b/g;
  const pyKeywords = /\b(def|class|return|if|elif|else|for|while|try|except|finally|import|from|as|with|pass|break|continue|raise|lambda|None|True|False|and|or|not|in|is|global|nonlocal|del|yield|async|await)\b/g;
  const htmlKeywords = /\b(html|head|body|div|span|p|a|ul|ol|li|h1|h2|h3|img|input|form|button|script|style|link|meta)\b/g;

  if (["js", "jsx", "ts", "tsx", "javascript", "typescript"].includes(lang)) {
    result = result.replace(jsKeywords, `<span style="color:${KEYWORD_COLOR}">$1</span>`);
    result = result.replace(/\b([A-Z][A-Za-z0-9]+)\b/g, `<span style="color:${FUNCTION_COLOR}">$1</span>`);
  } else if (["py", "python"].includes(lang)) {
    result = result.replace(pyKeywords, `<span style="color:${KEYWORD_COLOR}">$1</span>`);
    result = result.replace(/\b([a-z_][a-z_0-9]*)\s*(?=\()/g, `<span style="color:${FUNCTION_COLOR}">$1</span>`);
  } else if (["html", "xml"].includes(lang)) {
    result = result.replace(htmlKeywords, `<span style="color:${KEYWORD_COLOR}">$1</span>`);
  } else if (["css", "scss"].includes(lang)) {
    result = result.replace(/([.#][a-zA-Z_-][a-zA-Z0-9_-]*)/g, `<span style="color:${FUNCTION_COLOR}">$1</span>`);
    result = result.replace(/([:,;{}()])/g, `<span style="color:${OPERATOR_COLOR}">$1</span>`);
  } else if (["sh", "bash", "shell", "zsh"].includes(lang)) {
    result = result.replace(/\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|curl|npm|yarn|pnpm|git|docker|pip|python|node)\b/g,
      `<span style="color:${KEYWORD_COLOR}">$1</span>`);
    result = result.replace(/(\$[A-Z_a-z][A-Z_a-z0-9]*)/g, `<span style="color:${FUNCTION_COLOR}">$1</span>`);
  }

  return result;
}

// ── Inline parser — bold, italic, inline code, links ───────────────────────
function parseInline(text) {
  const parts = [];
  let i = 0;

  while (i < text.length) {
    // Inline code `…`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        parts.push(
          <code key={i} style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: "0.82em",
            padding: "1px 6px",
            borderRadius: 4,
            background: "rgba(0,240,255,0.08)",
            border: "1px solid rgba(0,240,255,0.18)",
            color: "#00F0FF",
            whiteSpace: "pre",
          }}>
            {text.slice(i + 1, end)}
          </code>
        );
        i = end + 1;
        continue;
      }
    }

    // Links [label](url)
    if (text[i] === "[") {
      const labelEnd = text.indexOf("]", i + 1);
      if (labelEnd !== -1 && text[labelEnd + 1] === "(") {
        const urlEnd = text.indexOf(")", labelEnd + 2);
        if (urlEnd !== -1) {
          const label = text.slice(i + 1, labelEnd);
          const url   = text.slice(labelEnd + 2, urlEnd);
          parts.push(
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
              color: "#00F0FF",
              textDecoration: "underline",
              textDecorationColor: "rgba(0,240,255,0.4)",
              textUnderlineOffset: 2,
              display: "inline-flex", alignItems: "center", gap: 3,
              transition: "color 0.15s, text-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#5FF8FF";
              e.currentTarget.style.textShadow = "0 0 8px rgba(0,240,255,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#00F0FF";
              e.currentTarget.style.textShadow = "none";
            }}
            >
              {label}
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9, opacity: 0.6 }} />
            </a>
          );
          i = urlEnd + 1;
          continue;
        }
      }
    }

    // Bare URLs
    const urlMatch = text.slice(i).match(/^(https?:\/\/[^\s\])"]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      let host = url;
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
      parts.push(
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
          color: "#00F0FF",
          textDecoration: "underline",
          textDecorationColor: "rgba(0,240,255,0.4)",
          textUnderlineOffset: 2,
          display: "inline-flex", alignItems: "center", gap: 3,
          wordBreak: "break-all",
          transition: "color 0.15s",
        }}>
          {host}
          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9, opacity: 0.6 }} />
        </a>
      );
      i += url.length;
      continue;
    }

    // Bold **text** or __text__
    const boldStars = text.slice(i).match(/^\*\*(.+?)\*\*/s);
    const boldUnder = text.slice(i).match(/^__(.+?)__/s);
    const bold = boldStars || boldUnder;
    if (bold) {
      parts.push(<strong key={i} style={{ color: "#E2E8F0", fontWeight: 700 }}>{bold[1]}</strong>);
      i += bold[0].length;
      continue;
    }

    // Italic *text* or _text_
    const italicStar  = text.slice(i).match(/^\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s);
    const italicUnder = text.slice(i).match(/^_(?!_)(.+?)(?<!_)_(?!_)/s);
    const italic = italicStar || italicUnder;
    if (italic) {
      parts.push(<em key={i} style={{ color: "#CBD5E1", fontStyle: "italic" }}>{italic[1]}</em>);
      i += italic[0].length;
      continue;
    }

    // Accumulate plain text
    const next = Math.min(
      ...["`", "[", "*", "_", "h"].map((c) => {
        const idx = text.indexOf(c, i);
        return idx === -1 ? Infinity : idx;
      }).filter((n) => n > i),
      Infinity
    );
    const slice = next === Infinity ? text.slice(i) : text.slice(i, next);
    // Check for bare URL starting with h
    if (slice.startsWith("h")) {
      parts.push(slice[0]);
      i += 1;
    } else if (slice.length === 0) {
      parts.push(text[i]);
      i += 1;
    } else {
      parts.push(slice);
      i += slice.length;
    }
  }

  return parts.length > 0 ? parts : [text];
}

// ── Block-level renderer ────────────────────────────────────────────────────
function renderBlocks(text) {
  const lines  = text.split("\n");
  const result = [];
  let i        = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ```lang\n...\n```
    const fenceMatch = line.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      const lang    = fenceMatch[1].toLowerCase();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      const raw = codeLines.join("\n");
      const highlighted = syntaxHighlight(raw, lang);

      result.push(
        <div key={`cb-${i}`} style={{
          position: "relative",
          margin: "12px 0",
          borderRadius: 10,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(0,240,255,0.12)",
          overflow: "hidden",
        }}>
          {/* Header bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 10px 5px 12px",
            background: "rgba(0,240,255,0.04)",
            borderBottom: "1px solid rgba(0,240,255,0.08)",
          }}>
            <span style={{
              fontSize: 10, fontFamily: "monospace",
              color: "rgba(0,240,255,0.45)",
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>
              {lang || "code"}
            </span>
            <CodeCopyBtn code={raw} />
          </div>
          {/* Code */}
          <pre style={{
            margin: 0, padding: "12px 14px",
            fontSize: 12, lineHeight: 1.65,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            color: "#C8D3E0",
            overflowX: "auto",
            whiteSpace: "pre",
          }}>
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </div>
      );
      continue;
    }

    // ── Horizontal rule --- or ***
    if (/^[-*_]{3,}\s*$/.test(line)) {
      result.push(
        <hr key={`hr-${i}`} style={{
          border: "none", margin: "16px 0",
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent)",
        }} />
      );
      i++;
      continue;
    }

    // ── Headings # ## ###
    const headMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headMatch) {
      const level = headMatch[1].length;
      const label = headMatch[2];
      const sizes = ["1.4em","1.25em","1.12em","1em","0.95em","0.9em"];
      result.push(
        <div key={`h-${i}`} style={{
          fontSize: sizes[level - 1] || "1em",
          fontWeight: level <= 2 ? 800 : 700,
          fontFamily: "'Outfit', sans-serif",
          color: level === 1 ? "#00F0FF" : level === 2 ? "#E2E8F0" : "#CBD5E1",
          margin: level <= 2 ? "18px 0 8px" : "12px 0 5px",
          letterSpacing: level <= 2 ? "-0.01em" : "normal",
          lineHeight: 1.25,
          borderBottom: level <= 2 ? "1px solid rgba(0,240,255,0.12)" : "none",
          paddingBottom: level <= 2 ? 6 : 0,
          textShadow: level === 1 ? "0 0 20px rgba(0,240,255,0.2)" : "none",
        }}>
          {parseInline(label)}
        </div>
      );
      i++;
      continue;
    }

    // ── Blockquote > …
    if (line.startsWith("> ")) {
      const bqLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        bqLines.push(lines[i].slice(2));
        i++;
      }
      result.push(
        <div key={`bq-${i}`} style={{
          borderLeft: "3px solid rgba(0,240,255,0.4)",
          paddingLeft: 12, margin: "8px 0",
          color: "rgba(255,255,255,0.6)",
          fontStyle: "italic",
          background: "rgba(0,240,255,0.03)",
          borderRadius: "0 6px 6px 0",
          padding: "8px 12px",
        }}>
          {bqLines.map((bl, bi) => (
            <p key={bi} style={{ margin: "2px 0", lineHeight: 1.55 }}>{parseInline(bl)}</p>
          ))}
        </div>
      );
      continue;
    }

    // ── Unordered list - or * or +
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ""));
        i++;
      }
      result.push(
        <ul key={`ul-${i}`} style={{ margin: "6px 0", paddingLeft: 0, listStyle: "none" }}>
          {items.map((it, ii) => (
            <li key={ii} style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              marginBottom: 4, lineHeight: 1.55, color: "#CBD5E1",
            }}>
              <span style={{
                flexShrink: 0, width: 5, height: 5, borderRadius: "50%",
                background: "#00F0FF", marginTop: 7,
                boxShadow: "0 0 5px rgba(0,240,255,0.5)",
              }} />
              <span>{parseInline(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Ordered list 1. 2. …
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const items = [];
      let   num   = 1;
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s+/, ""));
        i++;
      }
      result.push(
        <ol key={`ol-${i}`} style={{ margin: "6px 0", paddingLeft: 0, listStyle: "none" }}>
          {items.map((it, ii) => (
            <li key={ii} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              marginBottom: 4, lineHeight: 1.55, color: "#CBD5E1",
            }}>
              <span style={{
                flexShrink: 0, minWidth: 20, height: 20,
                borderRadius: 4,
                background: "rgba(0,240,255,0.1)",
                border: "1px solid rgba(0,240,255,0.2)",
                color: "#00F0FF",
                fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ii + 1}
              </span>
              <span style={{ paddingTop: 2 }}>{parseInline(it)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Table | col | col |
    if (line.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      // filter separator row (|---|---|)
      const rows = tableLines.filter((r) => !r.match(/^\|[\s|:-]+\|$/));
      const parsedRows = rows.map((r) =>
        r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
      );
      if (parsedRows.length > 0) {
        const [header, ...body] = parsedRows;
        result.push(
          <div key={`tbl-${i}`} style={{ overflowX: "auto", margin: "10px 0" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
            }}>
              <thead>
                <tr>
                  {header.map((cell, ci) => (
                    <th key={ci} style={{
                      padding: "6px 10px", textAlign: "left",
                      background: "rgba(0,240,255,0.07)",
                      borderBottom: "1px solid rgba(0,240,255,0.2)",
                      color: "#00F0FF", fontWeight: 700, fontSize: 11,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}>
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: "5px 10px", color: "#CBD5E1",
                        background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      }}>
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // ── Empty line → spacer
    if (line.trim() === "") {
      result.push(<div key={`sp-${i}`} style={{ height: 8 }} />);
      i++;
      continue;
    }

    // ── Plain paragraph
    result.push(
      <p key={`p-${i}`} style={{
        margin: "2px 0", lineHeight: 1.7, color: "#CBD5E1",
        wordBreak: "break-word",
      }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return result;
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function MarkdownRenderer({ content, streaming }) {
  if (!content) {
    if (streaming) {
      return <span style={{ color: "#00F0FF", animation: "pulse 1s ease-in-out infinite" }}>▊</span>;
    }
    return null;
  }

  return (
    <div style={{ fontSize: 13, lineHeight: 1.7, color: "#CBD5E1" }}>
      {renderBlocks(content)}
    </div>
  );
}
