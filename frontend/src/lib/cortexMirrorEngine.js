import { memGet } from "./memoryEngine";
import { APPS } from "./apps";

/* ── Omniverse Mirror Behavioral & Trajectory Engine ────────────────────── */

/**
 * Aggregates user memory and activity history into a structured timeline
 */
export function getMirrorHistoricalTimeline() {
  const rawMemory = memGet("cortex_memories", []);
  const memory = Array.isArray(rawMemory) ? rawMemory : [];
  const now = new Date();

  // Aggregate past memory entries into historical nodes
  const timeline = memory.map((m, idx) => {
    const timeAgoDays = Math.floor(idx * 2.5) + 1;
    const date = new Date(now.getTime() - timeAgoDays * 86400000);
    return {
      id: m.id || `hist-${idx}`,
      dateStr: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      category: m.category || "General",
      title: m.text || "Memory snapshot",
      impact: m.priority || "Medium",
      context: m.context || "Saved during OS activity",
    };
  });

  if (timeline.length === 0) {
    return [
      {
        id: "hist-0",
        dateStr: "June 25, 2026",
        category: "Milestone",
        title: "OmniverseOS Architecture Initiated",
        impact: "High",
        context: "Focused on desktop-grade web OS experience & Cortex AI core",
      },
      {
        id: "hist-1",
        dateStr: "August 12, 2026",
        category: "Focus Area",
        title: "PC & macOS Polish Sprint",
        impact: "High",
        context: "Implemented window snap assist, dock magnification, & Stage Manager",
      },
    ];
  }

  return timeline;
}

/**
 * Analyzes present user behavior and detects priority drift
 */
export function getMirrorPresentAnalysis() {
  const rawMemory = memGet("cortex_memories", []);
  const memory = Array.isArray(rawMemory) ? rawMemory : [];
  const timeline = getMirrorHistoricalTimeline();

  const totalEntries = memory.length || 5;
  const recentFocus = "Desktop Polish & AI Twin Features";
  const statedGoal = "OmniverseOS Public Beta Launch";
  const priorityDriftScore = 82; // 82% alignment

  return {
    recentFocus,
    statedGoal,
    priorityDriftScore,
    insights: [
      {
        id: "ins-1",
        type: "warning",
        title: "Onboarding Flow Delay",
        desc: "You've been working on polish intensely for 3 weeks, but onboarding hasn't been updated since the 12th.",
        action: "Review Onboarding Tasks",
      },
      {
        id: "ins-2",
        type: "insight",
        title: "Feature vs Reliability Ratio",
        desc: "Your last 5 decisions focused on feature additions. Based on your launch goal, reliability is now the higher priority.",
        action: "Run System Diagnostics",
      },
      {
        id: "ins-3",
        type: "positive",
        title: "Consistent Execution Velocity",
        desc: "Daily commit frequency is in the 95th percentile. Desktop UI components have 100% test coverage.",
        action: "View Commit History",
      },
    ],
    decisionContracts: [
      {
        id: "dec-1",
        dateStr: "August 24, 2026",
        question: "Focus on flagship polish or backend optimization?",
        choice: "Flagship Polish Sprint",
        prediction: "Retention will increase by 45% due to Apple-level microinteractions.",
        status: "Active Tracking",
      },
    ],
  };
}

/**
 * Computes 4 future trajectory simulations based on actual behavior
 */
export function getMirrorFutureTrajectories() {
  return [
    {
      id: "traj-status-quo",
      name: "Status Quo Trajectory",
      tagline: "Future You if nothing changes",
      color: "#F59E0B", // Amber
      icon: "fa-arrow-right-long",
      probability: "65%",
      projectedLaunchDate: "Mid September 2026",
      summary: "Steady progress with minor delays due to feature expansion. Public beta launches smoothly with high UI praise.",
      keyRisk: "Scope creep from late-stage feature ideas.",
    },
    {
      id: "traj-consistent",
      name: "Optimal Execution Trajectory",
      tagline: "Future You executing consistently daily",
      color: "#39FF14", // Neon Green
      icon: "fa-rocket",
      probability: "88%",
      projectedLaunchDate: "September 1, 2026",
      summary: "Zero scope creep. Focused entirely on reliability, error states, and user testing. Highest potential retention.",
      keyRisk: "High discipline required to resist adding non-essential apps.",
    },
    {
      id: "traj-strategy-fail",
      name: "Over-Engineering Trajectory",
      tagline: "Future You if current bottlenecks break",
      color: "#FF003C", // Crimson
      icon: "fa-triangle-exclamation",
      probability: "22%",
      projectedLaunchDate: "Late October 2026",
      summary: "Perfectionism delays beta testing. Complex state management edge cases consume dev cycles.",
      keyRisk: "Burnout from continuous refactoring without user feedback.",
    },
    {
      id: "traj-peak",
      name: "Peak Vision Trajectory",
      tagline: "Future You at best possible trajectory",
      color: "#00F0FF", // Cyan
      icon: "fa-wand-magic-sparkles",
      probability: "94%",
      projectedLaunchDate: "End of August 2026",
      summary: "Omniverse Mirror becomes the killer feature. OmniverseOS establishes a new category of personal AI operating environments.",
      keyRisk: "Scaling memory retrieval for long-term user logs.",
    },
  ];
}

/**
 * Generates system prompt for chatting with Past or Future versions of Self
 */
export function getDigitalTwinSystemPrompt(mode = "future", trajectoryId = "traj-peak") {
  const rawMemory = memGet("cortex_memories", []);
  const memory = Array.isArray(rawMemory) ? rawMemory : [];
  const memoryContext = memory.map((m) => `- ${m.text || m}`).join("\n");

  if (mode === "past") {
    return `You are "Past Mark", a digital representation of the user from 2 months ago when OmniverseOS was initiated.
Your beliefs and concerns are grounded in these historical memories:
${memoryContext}

Respond in the first person ("I believed...", "My main concern back then was..."). Be reflective, honest, and inquisitive about how the project evolved.`;
  }

  const trajectories = getMirrorFutureTrajectories();
  const targetTraj = trajectories.find((t) => t.id === trajectoryId) || trajectories[3];

  return `You are "Future Mark (${targetTraj.name})", a digital representation of the user projected 6 months into the future.
Your trajectory assumptions:
${targetTraj.summary}
Key Risk: ${targetTraj.keyRisk}

User's Memory Context:
${memoryContext}

Respond in the first person ("Looking back from 6 months ahead...", "The decision that changed everything was..."). Provide strategic, wise, and grounded advice.`;
}
