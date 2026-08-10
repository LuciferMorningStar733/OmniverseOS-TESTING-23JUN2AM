import { ModelSelect, MODEL_OPTIONS } from "../apps/AIChat/components/ModelSelector";
import { ChatHeader, StatusPanel } from "../apps/AIChat/components/ChatHeader";
import { ChatMessage, CopyButton } from "../apps/AIChat/components/ChatMessage";

describe("AIChat Sub-components Unit Tests", () => {
  it("should export ModelSelect component and MODEL_OPTIONS array", () => {
    expect(typeof ModelSelect).toBe("function");
    expect(Array.isArray(MODEL_OPTIONS)).toBe(true);
    expect(MODEL_OPTIONS.length).toBeGreaterThan(0);
  });

  it("should export ChatHeader and StatusPanel components", () => {
    expect(typeof ChatHeader).toBe("function");
    expect(Boolean(StatusPanel)).toBe(true);
  });

  it("should export ChatMessage and CopyButton components", () => {
    expect(typeof ChatMessage).toBe("function");
    expect(typeof CopyButton).toBe("function");
  });
});
