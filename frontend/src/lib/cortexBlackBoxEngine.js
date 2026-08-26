/* ── The Black Box Cinematic Intelligence Engine ─────────────────────────── */

/**
 * Phase 1: Live typing signal analysis
 */
export function analyzeTypingSignals(input = "") {
  const text = input.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const lower = text.toLowerCase();

  const signals = [];
  if (wordCount > 0) signals.push("SIGNAL DETECTED");
  if (lower.includes("should i") || lower.includes("or") || lower.includes("versus")) signals.push("DECISION TENSION DETECTED");
  if (lower.includes("build") || lower.includes("code") || lower.includes("app")) signals.push("TECHNICAL SPECIFICATION INDEXED");
  if (lower.includes("quit") || lower.includes("delay") || lower.includes("fail")) signals.push("CONTRADICTION FOUND");
  if (wordCount >= 5) signals.push("3 ASSUMPTIONS FORMING");
  if (wordCount >= 10) signals.push("CAUSAL GRAPH INITIALIZING");

  return { wordCount, signals: signals.length ? signals : ["AWAITING INPUT SIGNAL"] };
}

/**
 * Phase 2: Orbiting Core Problem Nodes
 */
export function getCoreProblemNodes(input = "") {
  const text = input.trim() || "General Strategic Problem";
  const coreTitle = text.slice(0, 45) + (text.length > 45 ? "..." : "");

  return {
    coreTitle,
    orbitingNodes: [
      { id: "goal", label: "DECLARED GOAL", desc: "User seeks rapid execution & clear direction.", color: "#00F0FF" },
      { id: "fear", label: "FEAR NODE", desc: "Risk of building a product that power users ignore.", color: "#FF003C" },
      { id: "assumption", label: "UNTESTED ASSUMPTION", desc: "Assuming the solution requires new features rather than a hero landing.", color: "#F59E0B" },
      { id: "constraint", label: "REAL CONSTRAINT", desc: "Time & onboarding drop-off within the first 10 seconds.", color: "#FB923C" },
      { id: "unknown", label: "CRITICAL UNKNOWN", desc: "What decision forces a user to choose OmniverseOS over ChatGPT?", color: "#A855F7" },
      { id: "contradiction", label: "CONTRADICTION", desc: "Desire for simplicity vs adding multi-tab dashboard options.", color: "#FF003C" },
      { id: "opportunity", label: "HERO OPPORTUNITY", desc: "The Black Box: A single-input intelligence universe reconstructor.", color: "#39FF14" },
    ],
  };
}

/**
 * Phase 3: Spatial Omniverse Realities
 */
export function getOmniverseRealities(input = "") {
  return {
    realities: [
      { id: "current", name: "CURRENT REALITY", status: "Active Baseline", color: "#00F0FF", desc: "User is evaluating options through standard LLM chat interfaces.", variables: ["Chatbot fatigue", "Fragmented notes"] },
      { id: "hidden", name: "HIDDEN REALITY", status: "Underlying Dynamic", color: "#A855F7", desc: "The core challenge is confidence & positioning, not feature quantity.", variables: ["Unspoken career goals", "Execution velocity"] },
      { id: "failure", name: "FAILURE REALITY", status: "Warning Path", color: "#FF003C", desc: "Building another dashboard grid causes 80% user drop-off.", variables: ["Scope creep", "UI complexity"] },
      { id: "optimal", name: "OPTIMAL REALITY", status: "High-Leverage", color: "#39FF14", desc: "1-click Black Box entrance creates viral, screenshot-worthy adoption.", variables: ["Instant wow factor", "Zero friction"] },
      { id: "unknown", name: "UNKNOWN REALITY", status: "Emergent Horizon", color: "#F59E0B", desc: "The problem creates its own intelligence universe upon input.", variables: ["Autonomous agents", "Causal graph"] },
    ],
  };
}

/**
 * Phase 4: Live Intelligence Collision (Agent Conflict)
 */
export function getIntelligenceCollisions(input = "") {
  return {
    exchanges: [
      {
        speaker: "Causal Architect",
        avatar: "fa-diagram-project",
        color: "#00F0FF",
        claim: "The user's real bottleneck is scope expansion across secondary features.",
      },
      {
        speaker: "Adversarial Red Teamer",
        avatar: "fa-crosshairs",
        color: "#FF003C",
        challenge: "REJECTED. Scope expansion is a symptom. The real bottleneck is lack of a single signature moat feature.",
      },
      {
        speaker: "Information Theorist",
        avatar: "fa-eye",
        color: "#A855F7",
        evidence: "Both models agree on friction. But information gain is maximized by making the Black Box an unfolding spatial event.",
      },
      {
        speaker: "Systems Strategist",
        avatar: "fa-chess",
        color: "#39FF14",
        resolution: "AGREED. Transform The Black Box into a 7-phase interactive intelligence journey.",
      },
    ],
  };
}

/**
 * Phase 5: Hidden Center of Gravity (The "Wait, What?" Moment)
 */
export function getHiddenCenterOfGravity(input = "") {
  const text = input.trim();
  const statedQuestion = text
    ? `"${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`
    : '"How do I build a successful AI application?"';

  return {
    statedQuestion,
    hiddenInsight: "You came here asking a feature question. The system discovered you are solving a confidence problem.",
    whyItMatters: "Users don't switch products for incremental features. They switch when a product thinks about their problem in a fundamentally different way.",
  };
}

/**
 * Phase 6: Diverging Future Timelines & Timeline Collision Engine
 */
export function getFutureCollisionModel(input = "") {
  const futures = [
    { id: "statusQuo", name: "STATUS QUO", probability: "45%", trigger: "Maintain conventional dashboard tabs", consequence: "Steady adoption, but high churn to default tools", requiredBelief: "Users want standard dashboard cards" },
    { id: "optimalExec", name: "OPTIMAL EXECUTION", probability: "88%", trigger: "Deploy 7-Phase Cinematic Black Box", consequence: "Instant viral word-of-mouth & high retention", requiredBelief: "The problem creates its own intelligence universe" },
    { id: "hiddenFailure", name: "HIDDEN FAILURE", probability: "15%", trigger: "Overcomplicate onboarding with 10 parallel steps", consequence: "Users drop off before seeing core value", requiredBelief: "Users will sit through long tutorials" },
    { id: "unexpectedOpp", name: "UNEXPECTED OPPORTUNITY", probability: "72%", trigger: "Position Black Box as primary hero landing", consequence: "OmniverseOS becomes the premier intelligence workspace", requiredBelief: "First 3 seconds dictate product perception" },
  ];

  const synthesizeCollision = (futureA, futureB) => {
    return `Collision between ${futureA.name} and ${futureB.name}: Divergence occurs at the first 3 seconds of onboarding. ${futureA.name} relies on "${futureA.requiredBelief}", whereas ${futureB.name} succeeds because "${futureB.requiredBelief}".`;
  };

  return { futures, synthesizeCollision };
}

/**
 * Phase 7: The Omniverse Verdict (Earned Synthesis)
 */
export function getOmniverseVerdictPhased(input = "") {
  return {
    whatYouThink: "You came here assuming you needed more dashboard cards and complex agent tabs.",
    whatSystemFound: "The system found that user engagement peaks when intelligence unfolds step-by-step as a spatial experience.",
    highestLeverageDecision: "Bet 100% on The Black Box as a 7-phase cinematic intelligence event.",
    whatYouAreMissing: "The first 3 seconds of user experience dictate whether a product is perceived as prototype or launch-ready.",
    costOfDoingNothing: "Remaining trapped in conventional SaaS card grid design patterns.",
    firstAction: "Execute Phase 1 through Phase 7 interactive spatial navigation in OmniverseOS.",
  };
}

// Backwards compatibility exports
export function openBlackBox(input = "") {
  return {
    input,
    wordCount: input.trim() ? input.trim().split(/\s+/).length : 0,
    architecture: {
      specialistCount: 5,
      simulationCount: 3,
      assumptionsCount: 47,
      contradictionCount: 2,
      unknownsCount: 2,
      specialistPerspectives: [
        { role: "Causal Architect", insight: "Traced primary root cause to unverified assumption." },
        { role: "Adversarial Red Teamer", insight: "Identified failure mode under high load." },
      ],
      unexpectedConclusion: "Your problem is not sent to AI. Your problem creates its own universe.",
    },
  };
}

export function buildImpossibleRoom(input = "") {
  return {
    idea: input || "AI Startup",
    rooms: {
      reality: { title: "REALITY ROOM", status: "Verified", desc: "What is actually true: User demand exists for evidence-grounded AI." },
      failure: { title: "FAILURE ROOM", status: "Fatal Flaw Found", flaw: "High onboarding friction causes drop-off." },
      future: { title: "FUTURE ROOM", status: "Plausible Peak", desc: "OmniverseOS becomes premier personal intelligence OS." },
      competition: { title: "COMPETITION ROOM", status: "Analyzed", desc: "OmniverseOS moats around causal, temporal, and adversarial synthesis." },
      impossible: { title: "IMPOSSIBLE 100X ROOM", status: "Shifted", desc: "Your problem creates its own intelligence universe." },
    },
  };
}

export function runInfiniteDebate(t) {
  return { topic: t || "AGI", participants: [{ name: "Alpha", stance: "Accelerate" }], evolvedSynthesis: "Debate evolved autonomously." };
}

export function getUnaskedAnswer(q) {
  return { question: q, directAnswer: "TypeScript/React", unaskedAnswer: { headline: "BUT THIS IS NOT WHAT YOU REALLY CAME HERE FOR.", deeperInsight: "You have a career leverage problem." } };
}

export function runDeadEndMachine(i) {
  return { distribution: { deadEnds: 72, traps: 18, mediocre: 7, highPotential: 3 }, winningPath: { title: "🟢 HIGH-POTENTIAL: Build Cinematic Black Box", reason: "Creates immediate viral differentiation." } };
}

export function runThoughtExperiment(s) {
  return { scenario: s, consequences: [{ order: "1st Order", desc: "Local models surge 500%." }] };
}

export function runGodView(z) { return { zoomLevel: z, perspective: "10-year horizon perspective." }; }
export function runBeliefKiller(b) { return { originalBelief: b, upgradedBelief: "Belief 2.0" }; }
export function generateFutureHeadlines(a) { return { action: a, headlines: [{ year: "2030", text: "🟢 Unknown Startup Becomes Leader" }] }; }
export function runHumanitySimulator(t) { return { technology: t, loop: [{ actor: "Public", reaction: "Shift energy to hyper-personalized projects." }] }; }
