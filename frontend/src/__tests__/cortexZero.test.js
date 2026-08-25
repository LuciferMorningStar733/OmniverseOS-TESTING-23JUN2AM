import {
  processOmniverseZero,
  runAIWarRoomPanel,
  collidePossibilities,
  getWhatAmIMissing,
  getProblemTimeMachine,
  getDontSolveItYetEngine,
  getOmniverseBranches,
  runFinalBossAudit,
  getImpossibleSynthesis,
  getOmniverseVerdict,
} from "../lib/cortexZeroEngine";
import { getApp } from "../lib/apps";

describe("Omniverse Zero & 10 Moat Systems Engine", () => {
  test("1. 🥇 processOmniverseZero extracts Facts, Assumptions, Unknowns and Killer Output", () => {
    const zero = processOmniverseZero("I want to build a startup that automates code testing.");
    expect(zero.map.facts.length).toBeGreaterThan(0);
    expect(zero.map.assumptions.length).toBeGreaterThan(0);
    expect(zero.map.unknowns.length).toBeGreaterThan(0);
    expect(zero.killerOutput.statedProblem).toBeDefined();
    expect(zero.killerOutput.realProblem).toContain("You came here asking about");
  });

  test("2. 🥈 runAIWarRoomPanel generates 5-agent debate and what everyone missed", () => {
    const warRoom = runAIWarRoomPanel("Should I focus on launch or feature expansion?");
    expect(warRoom.panel).toHaveLength(5);
    expect(warRoom.debate.length).toBeGreaterThan(2);
    expect(warRoom.thingEveryoneMissed).toBeDefined();
  });

  test("3. 🥉 collidePossibilities forced synthesis between 2 items", () => {
    const collider = collidePossibilities("Voice AI", "Personal Memory");
    expect(collider.connections.length).toBe(4);
    expect(collider.topConnection.rating).toBe("High Potential");
  });

  test("4. 4️⃣ getWhatAmIMissing detects blind spots and missed questions", () => {
    const missing = getWhatAmIMissing("Should I build this app?");
    expect(missing.blindSpots.length).toBe(3);
    expect(missing.theMissedQuestion).toBeDefined();
  });

  test("5. 5️⃣ getProblemTimeMachine reconstructs timeline and escape points", () => {
    const timeMachine = getProblemTimeMachine("Project deadline is slipping");
    expect(timeMachine.timeline.length).toBe(4);
  });

  test("6. 6️⃣ getDontSolveItYetEngine computes information gain metrics", () => {
    const dontSolve = getDontSolveItYetEngine("Complex problem");
    expect(dontSolve.knownPercent).toBe(80);
    expect(dontSolve.warning).toContain("DON'T SOLVE THIS YET");
    expect(dontSolve.questionThatChangesEverything).toBeDefined();
  });

  test("7. 7️⃣ getOmniverseBranches evaluates Path A vs Path B", () => {
    const branches = getOmniverseBranches();
    expect(branches.pathA.bestCase).toBeDefined();
    expect(branches.pathB.bestCase).toBeDefined();
    expect(branches.recommendation).toBeDefined();
  });

  test("8. 8️⃣ runFinalBossAudit ranks the single highest-leverage discovery", () => {
    const boss = runFinalBossAudit("OmniverseOS repository");
    expect(boss.audits.length).toBe(3);
    expect(boss.theWinner.title).toContain("THE WINNER");
  });

  test("9. 9️⃣ getImpossibleSynthesis combines 4 inputs into an Idea Genome", () => {
    const synth = getImpossibleSynthesis(["Memory", "Debate", "Causal Graph", "Zero Input Box"]);
    expect(synth.items).toHaveLength(4);
    expect(synth.ideaGenome).toContain("Omniverse Zero ∞");
  });

  test("10. 🔟 getOmniverseVerdict generates The Bet, Why, and Next 24 Hours", () => {
    const verdict = getOmniverseVerdict("Final launch decision");
    expect(verdict.theBet).toBeDefined();
    expect(verdict.why).toBeDefined();
    expect(verdict.next24Hours).toBeDefined();
  });

  test("apps registry includes zero app as App #29", () => {
    const app = getApp("zero");
    expect(app).toBeDefined();
    expect(app.name).toBe("Omniverse Zero");
  });
});
