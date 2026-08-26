import OmniverseField from "../components/OmniverseField";
import IntelligencePresence from "../components/IntelligencePresence";
import AdaptiveDock from "../components/AdaptiveDock";
import {
  recordWorkspaceCluster,
  getSuggestedWorkflow,
  getWorkspacePresets,
} from "../lib/workspaceMemoryEngine";

describe("OmniverseOS 2099 Visual & Experience Revolution", () => {
  test("exports OmniverseField component function", () => {
    expect(typeof OmniverseField).toBe("function");
  });

  test("exports IntelligencePresence component function", () => {
    expect(typeof IntelligencePresence).toBe("function");
  });

  test("exports AdaptiveDock component function", () => {
    expect(typeof AdaptiveDock).toBe("function");
  });

  test("workspaceMemoryEngine exposes workflow presets", () => {
    const presets = getWorkspacePresets();
    expect(presets.length).toBeGreaterThan(1);
    expect(presets[0].id).toBe("strategy");
  });

  test("recordWorkspaceCluster and getSuggestedWorkflow execute cleanly", () => {
    const wins = [{ app: "cortex" }, { app: "blackbox" }];
    recordWorkspaceCluster(wins);
    const suggested = getSuggestedWorkflow(wins);
    expect(suggested.id).toBeDefined();
  });
});
