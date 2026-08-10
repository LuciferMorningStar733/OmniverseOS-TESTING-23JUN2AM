import { useChatStream } from "../apps/AIChat/hooks/useChatStream";
import { ContextChips } from "../apps/AIChat/components/ContextChips";

describe("AIChat Sub-module Unit Tests", () => {
  it("should export useChatStream hook function", () => {
    expect(typeof useChatStream).toBe("function");
  });

  it("should export ContextChips component function", () => {
    expect(typeof ContextChips).toBe("function");
  });
});
