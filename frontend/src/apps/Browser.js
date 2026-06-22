// Curated, safe-to-link bookmarks. We do NOT embed user URLs in an iframe
// (clickjacking + SSRF surface). Clicking opens in a new tab.
import React from "react";

const BOOKMARKS = [
  { name: "MDN Web Docs", url: "https://developer.mozilla.org", color: "#00F0FF" },
  { name: "Hacker News", url: "https://news.ycombinator.com", color: "#FF003C" },
  { name: "GitHub Trending", url: "https://github.com/trending", color: "#39FF14" },
  { name: "Wikipedia", url: "https://en.wikipedia.org", color: "#FCEE09" },
  { name: "Arxiv", url: "https://arxiv.org", color: "#00F0FF" },
  { name: "Product Hunt", url: "https://www.producthunt.com", color: "#FF003C" },
];

export default function Browser() {
  return (
    <div className="p-6 h-full overflow-y-auto text-white" data-testid="browser-app">
      <div className="mono-label">// Bookmarks</div>
      <h2 className="font-heading text-2xl font-bold mb-4">Quick Links</h2>
      <p className="text-xs text-slate-500 mb-4 font-mono">
        // External sites open in a new tab. The OS does not embed arbitrary URLs (security policy).
      </p>
      <div className="grid grid-cols-3 gap-3">
        {BOOKMARKS.map((b) => (
          <a
            key={b.name}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`bookmark-${b.name.toLowerCase().replace(/\s+/g, "-")}`}
            className="glass-light rounded-xl p-5 hover:border-[#00F0FF]/40 transition flex items-center gap-3"
          >
            <i className="fa-solid fa-globe text-2xl" style={{ color: b.color }}></i>
            <div className="flex-1">
              <div className="text-sm font-medium">{b.name}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{new URL(b.url).hostname}</div>
            </div>
            <i className="fa-solid fa-arrow-up-right-from-square text-slate-500 text-xs"></i>
          </a>
        ))}
      </div>
    </div>
  );
}
