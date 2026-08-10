import { useState, useRef, useCallback, useEffect } from "react";

const SILENCE_TIMEOUT_MS = 2400; // Continuous listening: stop after 2.4s of silence
const NETWORK_RETRY_MAX = 2; // Transient network error retry limit

// Map language codes to regional BCP-47 variants
const BARE_LANG_DEFAULTS = {
  en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES", pt: "pt-BR",
  zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", ar: "ar-SA", hi: "hi-IN",
  it: "it-IT", ru: "ru-RU", nl: "nl-NL", pl: "pl-PL", sv: "sv-SE",
  da: "da-DK", fi: "fi-FI", nb: "nb-NO", tr: "tr-TR", id: "id-ID",
  vi: "vi-VN", th: "th-TH",
};

export function getSTTLanguage() {
  const candidates =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const lang of candidates) {
    if (!lang) continue;
    if (lang.includes("-")) return lang;
    const expanded = BARE_LANG_DEFAULTS[lang.toLowerCase()];
    if (expanded) return expanded;
  }
  return "en-US";
}

/**
 * Custom Hook: useVoiceRecognition
 * Manages Web Speech API SpeechRecognition lifecycle, auto-restart,
 * continuous listening, error resilience, and silence timers.
 */
export function useVoiceRecognition({
  onFinalTranscript,
  onInterimTranscript,
  onSpeechEnd,
  continuousConversation = true,
}) {
  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState("IDLE"); // IDLE | STARTING | LISTENING | PROCESSING | ERROR
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [sttError, setSttError] = useState(null);

  const recogRef = useRef(null);
  const intentionalStopRef = useRef(false);
  const networkRetryCountRef = useRef(0);
  const consecutiveRestartCountRef = useRef(0);
  const silenceTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(silenceTimerRef.current);
      if (recogRef.current) {
        try {
          recogRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    if (!continuousConversation) return;
    silenceTimerRef.current = setTimeout(() => {
      if (mountedRef.current && recogRef.current) {
        intentionalStopRef.current = true;
        try {
          recogRef.current.stop();
        } catch {}
        if (onSpeechEnd) onSpeechEnd();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [continuousConversation, onSpeechEnd]);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    clearTimeout(silenceTimerRef.current);
    if (recogRef.current) {
      try {
        recogRef.current.stop();
      } catch {}
    }
    if (mountedRef.current) {
      setIsListening(false);
      setVoiceState("IDLE");
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSttError("Speech recognition is not supported in this browser.");
      setVoiceState("ERROR");
      return false;
    }

    // Stop existing instance cleanly if running
    if (recogRef.current) {
      try {
        recogRef.current.onstart = null;
        recogRef.current.onresult = null;
        recogRef.current.onerror = null;
        recogRef.current.onend = null;
        recogRef.current.abort();
      } catch {}
      recogRef.current = null;
    }

    intentionalStopRef.current = false;
    networkRetryCountRef.current = 0;
    setSttError(null);
    setTranscript("");
    setInterimText("");
    setVoiceState("STARTING");

    try {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = getSTTLanguage();

      recog.onstart = () => {
        if (!mountedRef.current) return;
        setIsListening(true);
        setVoiceState("LISTENING");
        resetSilenceTimer();
      };

      recog.onresult = (event) => {
        if (!mountedRef.current) return;
        consecutiveRestartCountRef.current = 0; // Reset error counter on speech
        let finalStr = "";
        let interimStr = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalStr += text;
          } else {
            interimStr += text;
          }
        }

        if (interimStr) {
          setInterimText(interimStr);
          if (onInterimTranscript) onInterimTranscript(interimStr);
          resetSilenceTimer();
        }

        if (finalStr) {
          const cleanFinal = finalStr.trim();
          setTranscript((prev) => {
            const next = prev ? `${prev} ${cleanFinal}` : cleanFinal;
            if (onFinalTranscript) onFinalTranscript(next);
            return next;
          });
          setInterimText("");
          resetSilenceTimer();
        }
      };

      recog.onerror = (event) => {
        if (!mountedRef.current) return;
        const err = event.error;

        if (err === "no-speech") {
          clearTimeout(silenceTimerRef.current);
          return;
        }

        if (err === "network") {
          if (networkRetryCountRef.current < NETWORK_RETRY_MAX) {
            networkRetryCountRef.current += 1;
            setTimeout(() => {
              if (mountedRef.current && !intentionalStopRef.current) {
                try {
                  recog.start();
                } catch {}
              }
            }, 400);
            return;
          }
          setSttError("Network connection lost during speech recognition.");
          setVoiceState("ERROR");
        } else if (err === "not-allowed") {
          setSttError("Microphone access denied. Please check permissions.");
          setVoiceState("ERROR");
        } else if (err !== "aborted") {
          setSttError(`Speech recognition error: ${err}`);
          setVoiceState("ERROR");
        }

        setIsListening(false);
      };

      recog.onend = () => {
        if (!mountedRef.current) return;
        clearTimeout(silenceTimerRef.current);

        // Auto-restart continuous listening if ended unexpectedly by Chrome (no-speech, timeout, etc.)
        if (!intentionalStopRef.current && continuousConversation && consecutiveRestartCountRef.current < 5) {
          consecutiveRestartCountRef.current += 1;
          setTimeout(() => {
            if (mountedRef.current && !intentionalStopRef.current) {
              startListening();
            }
          }, 150);
          return;
        }

        setIsListening(false);
        setVoiceState("IDLE");
      };

      recogRef.current = recog;
      recog.start();
      return true;
    } catch (exc) {
      setSttError(`Failed to start microphone: ${exc.message}`);
      setIsListening(false);
      setVoiceState("ERROR");
      return false;
    }
  }, [continuousConversation, onFinalTranscript, onInterimTranscript, onSpeechEnd, resetSilenceTimer]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimText("");
  }, []);

  return {
    isListening,
    voiceState,
    transcript,
    interimText,
    sttError,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript,
  };
}

export default useVoiceRecognition;
