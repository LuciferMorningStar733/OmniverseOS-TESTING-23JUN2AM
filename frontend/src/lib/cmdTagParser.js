/**
 * cmdTagParser — Parses [CMD:TYPE:ARG] tags embedded in AI response text.
 *
 * The AI embeds these tags inline in its streamed response to trigger real OS
 * actions (open/close/focus apps, navigate URLs) without requiring the user to
 * rephrase as an explicit command.
 *
 * Supported tags:
 *   [CMD:OPEN_APP:appId]        — open an OS application
 *   [CMD:CLOSE_APP:appId]       — close an OS application
 *   [CMD:FOCUS_APP:appId]       — bring an OS application to the foreground
 *   [CMD:OPEN_URL:https://...]  — open a URL in the browser
 *
 * Valid app IDs (must match OSContext registry):
 *   chat, notes, tasks, calendar, files, music, videos, browser,
 *   settings, dashboard, analytics, finance, code, image, voice,
 *   memory, clipboard, watchlist, nebula
 */

const CMD_TAG_RE = /\[CMD:(OPEN_APP|CLOSE_APP|FOCUS_APP|OPEN_URL):([^\]]+)\]/g;

/**
 * Parse CMD tags from raw AI response text.
 *
 * @param {string} text  Raw assistant message (may contain CMD tags)
 * @returns {{ commands: Array<{type: string, arg: string}>, clean: string }}
 *   commands — ordered list of extracted commands
 *   clean    — text with all CMD tags removed (safe to display)
 */
export function parseCmdTags(text) {
  if (!text) return { commands: [], clean: text || "" };

  const commands = [];

  const clean = text
    .replace(CMD_TAG_RE, (_, type, arg) => {
      commands.push({ type, arg: arg.trim() });
      return "";
    })
    // Collapse any double-spaces left behind by tag removal
    .replace(/  +/g, " ")
    .trim();

  return { commands, clean };
}

/**
 * Execute a parsed list of CMD commands using OS primitives.
 *
 * Errors from individual commands are swallowed — CMD execution is a
 * best-effort side-effect and must never crash the chat stream.
 *
 * @param {Array<{type: string, arg: string}>} commands
 * @param {{ openApp: Function, closeWindow: Function, focusWindow: Function, windows: Array }} os
 */
export function executeCmdCommands(commands, { openApp, closeWindow, focusWindow, windows } = {}) {
  for (const { type, arg } of commands) {
    try {
      switch (type) {
        case "OPEN_APP":
          openApp?.(arg);
          break;

        case "CLOSE_APP": {
          const win = windows?.find((w) => w.app === arg);
          if (win) closeWindow?.(win.id);
          break;
        }

        case "FOCUS_APP": {
          const win = windows?.find((w) => w.app === arg);
          if (win) focusWindow?.(win.id);
          else openApp?.(arg); // open it if it wasn't already
          break;
        }

        case "OPEN_URL":
          // Open the browser app first, then dispatch a navigation event that
          // Browser.js can listen to for the actual URL load.
          openApp?.("browser");
          window.dispatchEvent(
            new CustomEvent("cortex:navigate", { detail: { url: arg } })
          );
          break;

        default:
          break;
      }
    } catch {
      // Silently ignore per-command failures — non-critical path
    }
  }
}
