import CortexPill from "../components/Mobile/CortexPill";
import MobileIntelligenceStacks from "../components/Mobile/MobileIntelligenceStacks";
import MobileSmartDock from "../components/Mobile/MobileSmartDock";
import MobileAIChat from "../components/Mobile/MobileAIChat";

describe("OmniverseOS Mobile Full 2099 Jarvis Suite", () => {
  test("CortexPill exports component function", () => {
    expect(typeof CortexPill).toBe("function");
  });

  test("MobileIntelligenceStacks exports component function", () => {
    expect(typeof MobileIntelligenceStacks).toBe("function");
  });

  test("MobileSmartDock exports component function", () => {
    expect(typeof MobileSmartDock).toBe("function");
  });

  test("MobileAIChat exports component function", () => {
    expect(typeof MobileAIChat).toBe("function");
  });
});
