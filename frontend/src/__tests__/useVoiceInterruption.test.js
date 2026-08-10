import { useVoiceInterruption } from "../apps/Voice/hooks/useVoiceInterruption";

describe("useVoiceInterruption Hook Tests", () => {
  it("should export useVoiceInterruption function", () => {
    expect(typeof useVoiceInterruption).toBe("function");
  });
});
