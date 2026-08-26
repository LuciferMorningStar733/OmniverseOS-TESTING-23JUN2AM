import {
  analyzeTypingSignals,
  getCoreProblemNodes,
  getOmniverseRealities,
  getIntelligenceCollisions,
  getHiddenCenterOfGravity,
  getFutureCollisionModel,
  getOmniverseVerdictPhased,
  openBlackBox,
} from "../lib/cortexBlackBoxEngine";
import { getApp } from "../lib/apps";

describe("The Black Box Cinematic Intelligence Engine Suite", () => {
  test("1. analyzeTypingSignals detects live typing signals", () => {
    const analysis = analyzeTypingSignals("Should I build an AI app or delay launch?");
    expect(analysis.signals.length).toBeGreaterThan(1);
    expect(analysis.wordCount).toBeGreaterThan(0);
  });

  test("2. getCoreProblemNodes generates central and orbiting concept nodes", () => {
    const core = getCoreProblemNodes("How to scale OmniverseOS");
    expect(core.coreTitle).toBeDefined();
    expect(core.orbitingNodes.length).toBe(7);
  });

  test("3. getOmniverseRealities provides spatial realities and tension nodes", () => {
    const realities = getOmniverseRealities();
    expect(realities.realities.length).toBe(5);
    expect(realities.realities[0].variables.length).toBeGreaterThan(0);
  });

  test("4. getIntelligenceCollisions models live specialist agent dialogue", () => {
    const collisions = getIntelligenceCollisions();
    expect(collisions.exchanges.length).toBe(4);
    expect(collisions.exchanges[1].speaker).toBe("Adversarial Red Teamer");
  });

  test("5. getHiddenCenterOfGravity reveals screenshot-worthy insight", () => {
    const gravity = getHiddenCenterOfGravity("Should I build startup X?");
    expect(gravity.statedQuestion).toBeDefined();
    expect(gravity.hiddenInsight).toContain("confidence problem");
    expect(gravity.whyItMatters).toBeDefined();
  });

  test("6. getFutureCollisionModel synthesizes diverging timelines", () => {
    const future = getFutureCollisionModel();
    expect(future.futures.length).toBe(4);
    const synthesis = future.synthesizeCollision(future.futures[0], future.futures[1]);
    expect(synthesis).toContain("Collision between");
  });

  test("7. getOmniverseVerdictPhased provides step-by-step earned verdict", () => {
    const verdict = getOmniverseVerdictPhased();
    expect(verdict.whatYouThink).toBeDefined();
    expect(verdict.highestLeverageDecision).toBeDefined();
    expect(verdict.firstAction).toBeDefined();
  });

  test("backwards compatibility openBlackBox function", () => {
    const bb = openBlackBox("AI Startup");
    expect(bb.architecture.unexpectedConclusion).toBeDefined();
  });

  test("apps registry exposes Black Box app", () => {
    const app = getApp("blackbox");
    expect(app).toBeDefined();
    expect(app.name).toBe("The Black Box");
  });
});
