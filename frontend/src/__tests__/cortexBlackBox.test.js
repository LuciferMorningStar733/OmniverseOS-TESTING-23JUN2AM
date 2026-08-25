import {
  openBlackBox,
  buildImpossibleRoom,
  runInfiniteDebate,
  getUnaskedAnswer,
  runDeadEndMachine,
  runThoughtExperiment,
  runGodView,
  runBeliefKiller,
  generateFutureHeadlines,
  runHumanitySimulator,
} from "../lib/cortexBlackBoxEngine";
import { getApp } from "../lib/apps";

describe("The Black Box & Impossible Room Engine Suite", () => {
  test("1. 🥇 openBlackBox creates autonomous problem-driven intelligence architecture", () => {
    const bb = openBlackBox("I want to build an AI startup.");
    expect(bb.architecture.specialistCount).toBe(5);
    expect(bb.architecture.simulationCount).toBe(3);
    expect(bb.architecture.assumptionsCount).toBe(47);
    expect(bb.architecture.unexpectedConclusion).toBeDefined();
  });

  test("2. 🥈 buildImpossibleRoom builds 5-perspective interactive glass universe", () => {
    const room = buildImpossibleRoom("AI Startup");
    expect(room.rooms.reality).toBeDefined();
    expect(room.rooms.failure.flaw).toBeDefined();
    expect(room.rooms.impossible.desc).toContain("100x");
  });

  test("3. 🥉 runInfiniteDebate autonomously spawns specialist agents", () => {
    const debate = runInfiniteDebate("Is AGI good for humanity?");
    expect(debate.participants.length).toBeGreaterThan(3);
    expect(debate.evolvedSynthesis).toBeDefined();
  });

  test("4. 4️⃣ getUnaskedAnswer reveals deeper unasked motivation", () => {
    const unasked = getUnaskedAnswer("Which programming language should I learn?");
    expect(unasked.directAnswer).toBeDefined();
    expect(unasked.unaskedAnswer.headline).toContain("BUT THIS IS NOT WHAT YOU REALLY CAME HERE FOR");
  });

  test("5. 5️⃣ runDeadEndMachine simulates path distributions and trap filters", () => {
    const deadEnd = runDeadEndMachine("Project strategy");
    expect(deadEnd.distribution.deadEnds).toBe(72);
    expect(deadEnd.winningPath.title).toContain("HIGH-POTENTIAL");
  });

  test("6. 6️⃣ runThoughtExperiment propagates multi-order effects", () => {
    const te = runThoughtExperiment("What if AI companies were illegal tomorrow?");
    expect(te.consequences).toHaveLength(3);
  });

  test("7. 7️⃣ runGodView provides multiscale perspective zoom", () => {
    const god = runGodView("10 years");
    expect(god.perspective).toContain("10 years");
  });

  test("8. 8️⃣ runBeliefKiller upgrades belief to Version 2.0", () => {
    const bk = runBeliefKiller("Remote work is strictly superior");
    expect(bk.upgradedBelief).toContain("Belief 2.0");
  });

  test("9. 9️⃣ generateFutureHeadlines generates 2030 future headlines", () => {
    const headlines = generateFutureHeadlines("Launch OmniverseOS");
    expect(headlines.headlines.length).toBe(3);
  });

  test("10. 🔟 runHumanitySimulator creates emergent societal reaction loop", () => {
    const hs = runHumanitySimulator("Free Infinite AI Compute");
    expect(hs.loop.length).toBe(4);
  });

  test("apps registry includes blackbox app as App #30", () => {
    const app = getApp("blackbox");
    expect(app).toBeDefined();
    expect(app.name).toBe("The Black Box");
  });
});
