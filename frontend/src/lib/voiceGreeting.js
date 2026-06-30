/**
 * voiceGreeting.js
 * Speaks a JARVIS-style greeting using the browser's built-in Web Speech API.
 * Zero external dependencies, zero API keys.
 */

const PREFERRED_VOICES = [
  // Chrome / Edge desktop (best quality)
  "Google UK English Male",
  "Google UK English Female",
  "Microsoft David Desktop",
  "Microsoft Zira Desktop",
  // macOS
  "Daniel",
  "Samantha",
  // Android / generic
  "en-GB",
  "en-US",
];

/** Pick the best available English voice. */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  for (const preferred of PREFERRED_VOICES) {
    const match = voices.find(
      (v) =>
        v.name === preferred ||
        (v.lang && v.lang.startsWith("en") && v.name.includes(preferred))
    );
    if (match) return match;
  }

  // Fallback: any English voice
  const en = voices.find((v) => v.lang && v.lang.startsWith("en"));
  return en || voices[0] || null;
}

/**
 * Speak a greeting phrase.
 * @param {string} text   - The full sentence to speak.
 * @param {object} opts   - { rate, pitch, volume }
 * @returns {() => void}  - Cancel function.
 */
export function speakGreeting(text, opts = {}) {
  if (!window.speechSynthesis) return () => {};

  // Cancel any in-flight speech
  window.speechSynthesis.cancel();

  const utter        = new SpeechSynthesisUtterance(text);
  utter.rate         = opts.rate   ?? 0.88;   // slightly slower = more authoritative
  utter.pitch        = opts.pitch  ?? 0.82;   // slightly lower = JARVIS-like
  utter.volume       = opts.volume ?? 0.90;

  // Voice selection — may need to wait for voices to load
  const trySpeak = () => {
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    trySpeak();
  } else {
    // Voices not yet loaded — wait for the event (happens once per session)
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      trySpeak();
    };
  }

  return () => window.speechSynthesis.cancel();
}

/**
 * Build the full JARVIS greeting sentence from user data + optional weather.
 * @param {string|null} name    - First name of the user.
 * @param {object|null} weather - { desc, temp, city }
 */
export function buildGreetingText(name, weather) {
  const h = new Date().getHours();
  const period =
    h < 5  ? "night" :
    h < 12 ? "morning" :
    h < 17 ? "afternoon" : "evening";

  const nameClause = name ? `, ${name}` : "";
  let text = `Good ${period}${nameClause}. OmniverseOS is online and ready.`;

  if (weather && weather.desc) {
    const tempClause =
      weather.temp != null ? ` with a temperature of ${weather.temp} degrees Celsius` : "";
    text += ` Current conditions in ${weather.city}: ${weather.desc}${tempClause}.`;
  }

  return text;
}
