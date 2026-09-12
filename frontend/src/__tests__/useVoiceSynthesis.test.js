import { useVoiceSynthesis } from "../apps/Voice/hooks/useVoiceSynthesis";
import { speakCortex, preprocessForTTS, splitIntoSpeechChunks } from "../lib/cortexTTSManager";

describe("useVoiceSynthesis Hook Tests", () => {
  it("should export useVoiceSynthesis function", () => {
    expect(typeof useVoiceSynthesis).toBe("function");
  });

  it("should preprocess TTS text correctly stripping Markdown and CMD tags", () => {
    const raw = "Hello **world** [CMD:OPEN_APP] ```code```";
    const cleaned = preprocessForTTS(raw);

    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("[CMD:");
    expect(cleaned).toContain("Hello world");
  });

  it("should humanize technical acronyms, units, and remove emojis", () => {
    const raw = "The AI in Omniverse OS has a latency of 120ms for the API 🚀. Cost: $10.";
    const cleaned = preprocessForTTS(raw);

    expect(cleaned).toContain("A.I.");
    expect(cleaned).toContain("O.S.");
    expect(cleaned).toContain("120 milliseconds");
    expect(cleaned).toContain("A.P.I.");
    expect(cleaned).toContain("10 dollars");
    expect(cleaned).not.toContain("🚀");
  });

  it("should strip markdown table formatting and bullet symbols into conversational speech", () => {
    const raw = `| Feature | Status |
|---|---|
| Audio | Ready |
* Item 1
* Item 2`;
    const cleaned = preprocessForTTS(raw);

    expect(cleaned).not.toContain("|---|---|");
    expect(cleaned).toContain("Item 1.");
    expect(cleaned).toContain("Item 2.");
  });

  it("should split long text into speech chunks at sentence boundaries", () => {
    const longText = "First sentence here. Second sentence with important details. Third sentence closing the thought.";
    const chunks = splitIntoSpeechChunks(longText, 60);

    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("First sentence here.");
  });

  it("should return a cancel handle when speakCortex is invoked", () => {
    const res = speakCortex("Test synthesis", { voiceEngine: "fish" });
    expect(typeof res.cancel).toBe("function");
    res.cancel();
  });
});

