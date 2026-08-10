import { useVoiceSynthesis } from "../apps/Voice/hooks/useVoiceSynthesis";
import { preprocessForTTS } from "../lib/cortexTTSManager";

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
});
