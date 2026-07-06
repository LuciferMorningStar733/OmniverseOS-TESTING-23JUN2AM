/**
 * useGhostWriter — Cortex ghost-writing engine
 *
 * Watches what you type. After 900ms of silence it streams a completion
 * in your own writing style, sourced from your existing notes.
 * Tab accepts. Escape or any keystroke cancels.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { aiApi } from "../lib/api";

const DEBOUNCE_MS   = 900;   // silence before triggering
const MIN_CHARS     = 14;    // don't trigger on very short text
const MAX_SAMPLES   = 4;     // writing style samples to inject
const SAMPLE_CHARS  = 300;   // chars per sample

function buildPrompt(value, samples) {
  const styleBlock = samples.length > 0
    ? `WRITING STYLE (match this person's exact voice, vocabulary, rhythm):\n${
        samples.map((s, i) => `[Sample ${i + 1}]\n${s}`).join("\n\n")
      }\n\n`
    : "";

  return (
    `You are an invisible ghost-writing assistant. ` +
    `Your ONLY job is to complete the text below.\n\n` +
    `RULES:\n` +
    `- Output ONLY the completion — the words that come AFTER what is already written.\n` +
    `- Do NOT repeat any part of the existing text.\n` +
    `- Match the author's voice, tone, and sentence rhythm exactly.\n` +
    `- Write 1–3 sentences. Stop naturally. Do not pad.\n` +
    `- No greetings, no explanations, no bullet points unless they were already using bullets.\n` +
    `- If the text ends mid-sentence, complete that sentence first.\n\n` +
    styleBlock +
    `TEXT TO COMPLETE (write what comes next, nothing else):\n${value}`
  );
}

export function useGhostWriter({ value, writingSamples = [], enabled = true }) {
  const [ghost,    setGhost]    = useState("");
  const [thinking, setThinking] = useState(false);
  const timerRef   = useRef(null);
  const abortRef   = useRef(null);
  const prevValRef = useRef(value);
  // Keep samples in a ref so the debounce effect doesn't re-run when
  // the notes array changes reference (which happens on every save).
  const samplesRef = useRef(writingSamples);
  samplesRef.current = writingSamples;

  /* Cancel everything — used on keystroke or unmount */
  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
    setGhost("");
    setThinking(false);
  }, []);

  /* Accept ghost text — returns the accepted string */
  const accept = useCallback(() => {
    const g = ghost;
    setGhost("");
    return g;
  }, [ghost]);

  useEffect(() => {
    if (!enabled) { cancel(); return; }

    // Any change → wipe existing ghost immediately so old text doesn't linger
    if (value !== prevValRef.current) {
      prevValRef.current = value;
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
      abortRef.current = null;
      setGhost("");
      setThinking(false);
    }

    // Too short to be meaningful
    if (!value || value.trim().length < MIN_CHARS) return;

    // Schedule
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      const samples = samplesRef.current
        .filter(Boolean)
        .map(s => s.trim())
        .filter(s => s.length > 30)
        .slice(0, MAX_SAMPLES)
        .map(s => s.slice(0, SAMPLE_CHARS));

      const prompt = buildPrompt(value, samples);

      setThinking(true);
      let completion = "";

      try {
        await aiApi.chatStreamResilient(
          {
            session_id: `ghost-${Date.now()}`,
            message:    prompt,
            provider:   "gemini",
            model:      "gemini-2.0-flash",
          },
          (chunk) => {
            completion += chunk;
            setGhost(completion);
          },
          null,
          controller.signal
        );
      } catch (e) {
        if (e?.name !== "AbortError") setGhost("");
      } finally {
        setThinking(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  // samplesRef is a ref — intentionally not in deps (updates via .current without triggering re-run)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, cancel]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  return { ghost, thinking, accept, cancel };
}
