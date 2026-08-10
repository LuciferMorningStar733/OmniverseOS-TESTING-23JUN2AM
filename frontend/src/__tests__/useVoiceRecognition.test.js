import React from "react";
import { useVoiceRecognition, getSTTLanguage } from "../apps/Voice/hooks/useVoiceRecognition";

describe("useVoiceRecognition Hook Logic Tests", () => {
  it("should export helper getSTTLanguage and return valid language string", () => {
    const lang = getSTTLanguage();
    expect(typeof lang).toBe("string");
    expect(lang.length).toBeGreaterThan(0);
  });

  it("should export useVoiceRecognition function", () => {
    expect(typeof useVoiceRecognition).toBe("function");
  });
});
