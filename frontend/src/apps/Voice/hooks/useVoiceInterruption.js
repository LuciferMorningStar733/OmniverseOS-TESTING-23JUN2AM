import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Custom Hook: useVoiceInterruption
 * Manages barge-in detection:
 * When bargeInEnabled is ON and Cortex is speaking, detecting user speech
 * immediately stops audio playback and hands control back to speech recognition.
 */
export function useVoiceInterruption({
  bargeInEnabled = false,
  isSpeaking = false,
  onInterrupt,
}) {
  const [enabled, setEnabled] = useState(bargeInEnabled);
  const bargeRecogRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    setEnabled(bargeInEnabled);
  }, [bargeInEnabled]);

  const stopBargeInDetector = useCallback(() => {
    if (bargeRecogRef.current) {
      try {
        bargeRecogRef.current.abort();
      } catch {}
      bargeRecogRef.current = null;
    }
  }, []);

  const startBargeInDetector = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !enabled || !isSpeaking) return;

    stopBargeInDetector();

    try {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;

      recog.onresult = (event) => {
        if (!mountedRef.current) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0]?.transcript?.trim() || "";
          if (text.length > 1) {
            // User spoke while Cortex was talking — trigger barge-in interrupt!
            stopBargeInDetector();
            if (onInterrupt) onInterrupt();
            break;
          }
        }
      };

      recog.onerror = () => {
        stopBargeInDetector();
      };

      recog.onend = () => {
        bargeRecogRef.current = null;
      };

      bargeRecogRef.current = recog;
      recog.start();
    } catch {}
  }, [enabled, isSpeaking, onInterrupt, stopBargeInDetector]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled && isSpeaking) {
      startBargeInDetector();
    } else {
      stopBargeInDetector();
    }

    return () => {
      mountedRef.current = false;
      stopBargeInDetector();
    };
  }, [enabled, isSpeaking, startBargeInDetector, stopBargeInDetector]);

  return {
    bargeInEnabled: enabled,
    setBargeInEnabled: setEnabled,
    stopBargeInDetector,
    startBargeInDetector,
  };
}

export default useVoiceInterruption;
