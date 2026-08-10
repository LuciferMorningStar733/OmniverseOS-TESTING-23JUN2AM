import { useState, useRef, useCallback, useEffect } from "react";
import { speakCortex, preprocessForTTS } from "../../../lib/cortexTTSManager";
import { streamSpeak, isStreamTTSAvailable, getStreamVoiceId } from "../../../lib/streamTTS";
import { browserSpeak, cancelSpeech as cancelBrowserSpeech, isBrowserTTSSupported } from "../../../lib/browserTTS";

/**
 * Custom Hook: useVoiceSynthesis
 * Responsible for Fish Audio, Puter, StreamElements, and Gemini TTS provider orchestration,
 * speech generation ID tracking, staleness checks, audio playback, and cleanup.
 */
export function useVoiceSynthesis({ onSpeechStart, onSpeechEnd, onError }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);

  const speechGenerationRef = useRef(0);
  const cancelSpeechRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      speechGenerationRef.current += 1;
      if (cancelSpeechRef.current) {
        try {
          cancelSpeechRef.current();
        } catch {}
      }
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    speechGenerationRef.current += 1;
    if (cancelSpeechRef.current) {
      try {
        cancelSpeechRef.current();
      } catch {}
      cancelSpeechRef.current = null;
    }
    cancelBrowserSpeech();

    if (mountedRef.current) {
      setIsSpeaking(false);
      setActiveProvider(null);
    }
  }, []);

  const speak = useCallback(
    (text, settings = {}) => {
      if (!text || !text.trim()) return;

      // Increment generation ID to invalidate previous speech requests
      speechGenerationRef.current += 1;
      const currentGen = speechGenerationRef.current;

      stopSpeaking();

      const {
        voiceEngine = "stream",
        streamVoiceId = getStreamVoiceId(),
        rate = 1.0,
        pitch = 1.0,
        volume = 1.0,
      } = settings;

      const preprocessed = preprocessForTTS(text);
      if (!preprocessed) return;

      setIsSpeaking(true);

      const cancelObj = speakCortex(preprocessed, {
        generationRef: speechGenerationRef,
        speechGeneration: currentGen,
        voiceEngine,
        streamVoiceId,
        rate,
        pitch,
        volume,
        onStart: () => {
          if (!mountedRef.current || speechGenerationRef.current !== currentGen) return;
          setIsSpeaking(true);
          if (onSpeechStart) onSpeechStart();
        },
        onEnd: () => {
          if (!mountedRef.current || speechGenerationRef.current !== currentGen) return;
          setIsSpeaking(false);
          setActiveProvider(null);
          cancelSpeechRef.current = null;
          if (onSpeechEnd) onSpeechEnd();
        },
        onError: (err) => {
          if (!mountedRef.current || speechGenerationRef.current !== currentGen) return;
          setIsSpeaking(false);
          setActiveProvider(null);
          cancelSpeechRef.current = null;
          if (onError) onError(err);
        },
        onProviderUsed: (providerName) => {
          if (mountedRef.current && speechGenerationRef.current === currentGen) {
            setActiveProvider(providerName);
          }
        },
      });

      cancelSpeechRef.current = cancelObj?.cancel || null;
    },
    [stopSpeaking, onSpeechStart, onSpeechEnd, onError]
  );

  return {
    isSpeaking,
    activeProvider,
    speak,
    stopSpeaking,
    preprocessForTTS,
  };
}

export default useVoiceSynthesis;
