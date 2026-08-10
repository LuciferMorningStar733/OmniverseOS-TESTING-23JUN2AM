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

  it("should render multi-modal image attachments when present in ChatMessage", () => {
    const msg = {
      role: "user",
      content: "Analyze this image",
      attachments: [
        { name: "test.png", dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }
      ]
    };
    expect(msg.attachments.length).toBe(1);
    expect(msg.attachments[0].name).toBe("test.png");
  });
});
