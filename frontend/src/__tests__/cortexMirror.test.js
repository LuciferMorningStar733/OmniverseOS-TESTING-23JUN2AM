import {
  getMirrorHistoricalTimeline,
  getMirrorPresentAnalysis,
  getMirrorFutureTrajectories,
  getDigitalTwinSystemPrompt,
  getAggregatedUserData,
} from "../lib/cortexMirrorEngine";
import { APPS, getApp } from "../lib/apps";

describe("Omniverse Mirror Engine & Evidence Model", () => {
  test("getAggregatedUserData retrieves memories, tasks, and notes", () => {
    const data = getAggregatedUserData();
    expect(data.memories).toBeDefined();
    expect(data.tasks).toBeDefined();
    expect(data.notes).toBeDefined();
  });

  test("getMirrorHistoricalTimeline returns timeline array and eras metadata", () => {
    const { timeline, eras } = getMirrorHistoricalTimeline();
    expect(Array.isArray(timeline)).toBe(true);
    expect(Array.isArray(eras)).toBe(true);
    if (eras.length > 0) {
      expect(eras[0].name).toBeDefined();
      expect(eras[0].dateRange).toBeDefined();
    }
  });

  test("getMirrorPresentAnalysis handles sparse data and provides evidence grounding", () => {
    const analysis = getMirrorPresentAnalysis();
    expect(analysis.statedGoal).toBeDefined();
    expect(Array.isArray(analysis.insights)).toBe(true);
    expect(analysis.projectGravity).toBeDefined();
    if (!analysis.hasInsufficientData) {
      expect(typeof analysis.priorityDriftScore).toBe("number");
    }
  });

  test("getMirrorFutureTrajectories returns dynamic trajectory simulations with Fact/Inference/Simulation breakdowns", () => {
    const trajectories = getMirrorFutureTrajectories();
    expect(trajectories).toHaveLength(4);
    for (const t of trajectories) {
      expect(t.simulationNotice).toBeDefined();
      expect(t.probability).toMatch(/%/);
      expect(t.breakdown).toBeDefined();
      expect(t.breakdown.fact).toBeDefined();
      expect(t.breakdown.inference).toBeDefined();
      expect(t.breakdown.simulation).toBeDefined();
    }
  });

  test("getDigitalTwinSystemPrompt includes disclaimers and user context", () => {
    const pastPrompt = getDigitalTwinSystemPrompt("past");
    expect(pastPrompt).toContain("Past Self");
    expect(pastPrompt).toContain("Disclaimer");

    const futurePrompt = getDigitalTwinSystemPrompt("future", "traj-peak");
    expect(futurePrompt).toContain("Future Self");
    expect(futurePrompt).toContain("Disclaimer");
  });

  test("apps registry includes mirror app", () => {
    const app = getApp("mirror");
    expect(app).toBeDefined();
    expect(app.name).toBe("Omniverse Mirror");
  });
});
