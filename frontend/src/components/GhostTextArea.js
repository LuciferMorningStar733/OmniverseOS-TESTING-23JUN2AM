/**
 * GhostTextArea — drop-in textarea replacement with Cortex ghost writing.
 *
 * Renders a mirror div behind the real textarea.
 * The mirror shows the real text (transparent) + ghost text (cyan) in the
 * same font/padding so ghost text appears exactly at the cursor position.
 *
 * Tab   → accept ghost text
 * Esc   → cancel ghost text
 * typing → cancels and re-triggers after 900ms pause
 */
import React, { useRef, useCallback, useLayoutEffect, useState } from "react";
import { useGhostWriter } from "../hooks/useGhostWriter";
import { motion, AnimatePresence } from "framer-motion";

const GHOST_COLOR   = "rgba(0,240,255,0.38)";
const THINKING_COLOR = "rgba(0,240,255,0.5)";

export default function GhostTextArea({
  value          = "",
  onChange,
  writingSamples = [],
  className      = "",
  wrapperClassName = "",
  style          = {},
  placeholder,
  caretColor,
  onKeyDown: externalKeyDown,
  ...rest
}) {
  const textareaRef = useRef(null);
  const mirrorRef   = useRef(null);

  // Track computed padding so mirror matches textarea exactly
  const [pad, setPad] = useState({ top: 16, right: 16, bottom: 16, left: 16 });

  useLayoutEffect(() => {
    if (!textareaRef.current) return;
    const cs = window.getComputedStyle(textareaRef.current);
    setPad({
      top:    parseFloat(cs.paddingTop)    || 16,
      right:  parseFloat(cs.paddingRight)  || 16,
      bottom: parseFloat(cs.paddingBottom) || 16,
      left:   parseFloat(cs.paddingLeft)   || 16,
    });
  }, [className]);

  const { ghost, thinking, accept, cancel } = useGhostWriter({
    value,
    writingSamples,
    enabled: true,
  });

  // Sync scroll: mirror scrolls with textarea so ghost text stays aligned
  const syncScroll = useCallback(() => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Tab" && ghost) {
      e.preventDefault();
      const accepted = accept();
      onChange?.({ target: { value: value + accepted } });
      return;
    }
    if (e.key === "Escape" && (ghost || thinking)) {
      e.preventDefault();
      cancel();
      return;
    }
    // Any printable key cancels current ghost so it re-streams fresh after pause
    if (ghost && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      cancel();
    }
    externalKeyDown?.(e);
  }, [ghost, thinking, accept, cancel, onChange, value, externalKeyDown]);

  const handleChange = useCallback((e) => {
    onChange?.(e);
  }, [onChange]);

  /* Shared layout props between mirror and textarea — must be identical */
  const sharedStyle = {
    fontFamily:     style.fontFamily  || "inherit",
    fontSize:       style.fontSize    || "0.875rem",   // text-sm
    lineHeight:     style.lineHeight  || "1.625",       // leading-relaxed
    letterSpacing:  style.letterSpacing,
    wordBreak:      "break-word",
    whiteSpace:     "pre-wrap",
    overflowWrap:   "break-word",
    paddingTop:     pad.top,
    paddingRight:   pad.right,
    paddingBottom:  pad.bottom,
    paddingLeft:    pad.left,
  };

  const hasGhost = Boolean(ghost);
  const showHint = hasGhost || thinking;

  return (
    <div
      className={`relative min-h-0 ${wrapperClassName}`}
      style={{ flex: 1, display: "flex", flexDirection: "column" }}
    >
      {/* ── Mirror div (behind textarea) ─────────────────────────── */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        style={{
          ...sharedStyle,
          position:       "absolute",
          inset:          0,
          overflow:       "hidden",
          pointerEvents:  "none",
          userSelect:     "none",
          zIndex:         0,
        }}
      >
        {/* Real text — transparent so textarea's white text shows through */}
        <span style={{ color: "transparent" }}>{value}</span>

        {/* Ghost text — streams in one character at a time */}
        <AnimatePresence>
          {ghost && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                color:      GHOST_COLOR,
                fontStyle:  "italic",
                whiteSpace: "pre-wrap",
              }}
            >
              {ghost}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Real textarea (on top, transparent bg) ────────────────── */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        className={className}
        placeholder={!hasGhost ? placeholder : ""}
        style={{
          ...style,
          ...sharedStyle,
          position:   "relative",
          zIndex:     1,
          background: "transparent",
          color:      "#fff",
          caretColor: caretColor || "#00F0FF",
          resize:     "none",
          outline:    "none",
          width:      "100%",
          flex:       1,
          minHeight:  0,
          /* Override padding with computed values to match mirror */
          padding: `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
        }}
        {...rest}
      />

      {/* ── Ghost / thinking indicator ────────────────────────────── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position:      "absolute",
              bottom:        pad.bottom + 4,
              right:         pad.right,
              display:       "flex",
              alignItems:    "center",
              gap:           6,
              zIndex:        2,
              pointerEvents: "none",
            }}
          >
            {thinking && !hasGhost && (
              <span style={{
                display:      "flex",
                alignItems:   "center",
                gap:          5,
                fontSize:     10,
                color:        THINKING_COLOR,
                fontFamily:   "monospace",
                background:   "rgba(0,240,255,0.05)",
                border:       "1px solid rgba(0,240,255,0.12)",
                borderRadius: 4,
                padding:      "2px 7px",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: THINKING_COLOR,
                  animation: "omni-ghost-pulse 1s ease-in-out infinite",
                  display: "inline-block",
                }} />
                cortex writing…
              </span>
            )}

            {hasGhost && (
              <span style={{
                fontSize:     10,
                color:        THINKING_COLOR,
                fontFamily:   "monospace",
                background:   "rgba(0,240,255,0.06)",
                border:       "1px solid rgba(0,240,255,0.18)",
                borderRadius: 4,
                padding:      "2px 8px",
                letterSpacing: "0.03em",
              }}>
                ⇥ tab to accept · esc to dismiss
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Keyframe for thinking dot ─────────────────────────────── */}
      <style>{`
        @keyframes omni-ghost-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
