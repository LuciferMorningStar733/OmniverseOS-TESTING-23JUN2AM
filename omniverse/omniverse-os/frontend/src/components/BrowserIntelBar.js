import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * BrowserIntelBar — Priority 5 (Browser Intelligence)
 *
 * Detects context for the current URL and surfaces non-executing actions that,
 * when clicked, dispatch a `cortex:prompt` event consumed by AIChat.
 *
 * Detection is pure & deterministic — no network calls, no AI invocation.
 * Cortex remains explicit: nothing fires until the user clicks.
 */

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

function pathOf(url) {
  try { return new URL(url).pathname; }
  catch { return ""; }
}

/**
 * Returns an array of contextual actions for a URL.
 * Each action: { label, icon, prompt, color }
 */
function detectActions(url) {
  if (!url) return [];
  const host = hostOf(url);
  const path = pathOf(url);
  const actions = [];

  // ── GitHub ──────────────────────────────────────────────────────────────
  if (host === "github.com") {
    const segs = path.split("/").filter(Boolean);
    if (segs.length >= 2) {
      const repo = `${segs[0]}/${segs[1]}`;
      actions.push(
        { label: "Review Repository", icon: "fa-code-branch", color: "#00F0FF",
          prompt: `Review the GitHub repository ${repo} (${url}). Summarize its purpose, architecture, and notable strengths or risks.` },
        { label: "Explain Architecture", icon: "fa-sitemap", color: "#CF9EFF",
          prompt: `Explain the architecture of the GitHub repo ${repo} (${url}). Map the major modules, dependencies, and data flow.` },
        { label: "Generate Documentation", icon: "fa-file-lines", color: "#39FF14",
          prompt: `Draft a README / documentation outline for the GitHub repository ${repo} (${url}).` },
        { label: "Summarize Commits", icon: "fa-clock-rotate-left", color: "#FCEE09",
          prompt: `Summarize the recent commit activity and direction of the GitHub repository ${repo} (${url}).` },
      );
    }
  }

  // ── YouTube ─────────────────────────────────────────────────────────────
  else if (host === "youtube.com" || host === "youtu.be") {
    if (path.startsWith("/watch") || host === "youtu.be") {
      actions.push(
        { label: "Summarize Video", icon: "fa-closed-captioning", color: "#FF003C",
          prompt: `Summarize the key points of this YouTube video: ${url}` },
        { label: "Generate Notes", icon: "fa-note-sticky", color: "#FCEE09",
          prompt: `Generate structured study notes from this YouTube video: ${url}` },
      );
    } else if (path.startsWith("/results")) {
      actions.push(
        { label: "Refine Search", icon: "fa-magnifying-glass-plus", color: "#00F0FF",
          prompt: `Help me refine this YouTube search query: ${url}` },
      );
    }
  }

  // ── Stack Overflow ───────────────────────────────────────────────────────
  else if (host === "stackoverflow.com") {
    if (path.startsWith("/questions/")) {
      actions.push(
        { label: "Explain Accepted Answer", icon: "fa-circle-check", color: "#39FF14",
          prompt: `Explain the accepted answer on this Stack Overflow question in plain language with a runnable example: ${url}` },
        { label: "Show Alternatives", icon: "fa-shuffle", color: "#CF9EFF",
          prompt: `Suggest alternative approaches to the problem in this Stack Overflow question: ${url}` },
      );
    }
  }

  // ── MDN / dev docs ───────────────────────────────────────────────────────
  else if (host === "developer.mozilla.org" || host.startsWith("docs.")) {
    actions.push(
      { label: "Explain API", icon: "fa-book-open", color: "#00F0FF",
        prompt: `Explain the API described on this documentation page, with a minimal usage example: ${url}` },
      { label: "Sample Code", icon: "fa-code", color: "#39FF14",
        prompt: `Generate a small runnable code sample that exercises the API documented at: ${url}` },
    );
  }

  // ── Reddit ───────────────────────────────────────────────────────────────
  else if (host === "reddit.com") {
    if (path.includes("/comments/")) {
      actions.push(
        { label: "Summarize Discussion", icon: "fa-comments", color: "#FF6314",
          prompt: `Summarize the main points and consensus from this Reddit discussion: ${url}` },
        { label: "Extract Insights", icon: "fa-lightbulb", color: "#FCEE09",
          prompt: `Extract the most insightful comments and takeaways from this Reddit thread: ${url}` },
      );
    }
  }

  // ── Wikipedia ────────────────────────────────────────────────────────────
  else if (host === "en.wikipedia.org" && path.startsWith("/wiki/")) {
    actions.push(
      { label: "TL;DR", icon: "fa-bolt", color: "#FCEE09",
        prompt: `Give me a concise TL;DR of this Wikipedia article: ${url}` },
    );
  }

  // ── HackerNews ───────────────────────────────────────────────────────────
  else if (host === "news.ycombinator.com") {
    actions.push(
      { label: "Summarize Thread", icon: "fa-fire", color: "#FF6314",
        prompt: `Summarize this Hacker News thread, highlighting key arguments and links: ${url}` },
    );
  }

  return actions;
}

function dispatchPrompt(prompt) {
  window.dispatchEvent(new CustomEvent("cortex:prompt", { detail: { text: prompt } }));
}

export default function BrowserIntelBar({ url, onOpenChat }) {
  const actions = useMemo(() => detectActions(url), [url]);
  const host = useMemo(() => hostOf(url), [url]);

  if (!actions.length) return null;

  const handleClick = (a) => {
    onOpenChat?.();
    dispatchPrompt(a.prompt);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={host}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-none"
        data-testid="browser-intel-bar"
      >
        <span className="flex-shrink-0 flex items-center gap-1.5 mr-1 text-[10px] font-mono uppercase tracking-widest text-[#CF9EFF]/60">
          <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />
          Cortex Actions / {host}
        </span>
        {actions.map((a, i) => (
          <button
            key={i}
            data-testid={`intel-action-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => handleClick(a)}
            className="flex items-center gap-1.5 px-2.5 py-[5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] hover:border-[#CF9EFF]/35 transition-all text-[11px] font-mono whitespace-nowrap flex-shrink-0"
            style={{ color: "#E2E8F0" }}
          >
            <i className={`fa-solid ${a.icon} text-[10px]`} style={{ color: a.color }} />
            <span>{a.label}</span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
