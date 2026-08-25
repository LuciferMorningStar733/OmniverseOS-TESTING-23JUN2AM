import {
  getMirrorHistoricalTimeline,
  getMirrorPresentAnalysis,
  getMirrorFutureTrajectories,
  getDigitalTwinSystemPrompt,
} from "../lib/cortexMirrorEngine";
import { APPS, getApp } from "../lib/apps";

describe("Omniverse Mirror Engine", () => {
  test("getMirrorHistoricalTimeline returns timeline array", () => {
    const timeline = getMirrorHistoricalTimeline();
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].title).toBeDefined();
    expect(timeline[0].dateStr).toBeDefined();
  });

  test("getMirrorPresentAnalysis returns observer metrics & insights", () => {
    const analysis = getMirrorPresentAnalysis();
    expect(analysis.statedGoal).toBeDefined();
    expect(analysis.priorityDriftScore).toBeGreaterThan(0);
    expect(Array.isArray(analysis.insights)).toBe(true);
    expect(analysis.insights.length).toBeGreaterThan(0);
  });

  test("getMirrorFutureTrajectories returns 4 trajectory options", () => {
    const trajectories = getMirrorFutureTrajectories();
    expect(trajectories).toHaveLength(4);
    expect(trajectories.map((t) => t.id)).toContain("traj-peak");
    expect(trajectories.map((t) => t.id)).toContain("traj-status-quo");
  });

  test("getDigitalTwinSystemPrompt generates grounded prompt for past and future modes", () => {
    const pastPrompt = getDigitalTwinSystemPrompt("past");
    expect(pastPrompt).toContain("Past Mark");

    const futurePrompt = getDigitalTwinSystemPrompt("future", "traj-peak");
    expect(futurePrompt).toContain("Future Mark");
  });

  test("apps registry includes mirror app", () => {
    const app = getApp("mirror");
    expect(app).toBeDefined();
    expect(app.name).toBe("Omniverse Mirror");
    expect(app.group).toBe("ai");
  });
});
