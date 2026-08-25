import { memGet } from "./memoryEngine";
import { APPS } from "./apps";

/* ── Omniverse Mirror Behavioral & Trajectory Engine ────────────────────── */

/**
 * Helper to retrieve all aggregated user data from localStorage
 */
export function getAggregatedUserData() {
  const rawMemory = memGet("cortex_memories", []);
  const memories = Array.isArray(rawMemory) ? rawMemory : [];

  let tasks = [];
  try {
    const rawTasks = localStorage.getItem("omniverse_tasks");
    tasks = rawTasks ? JSON.parse(rawTasks) : [];
  } catch {
    tasks = [];
  }

  let notes = [];
  try {
    const rawNotes = localStorage.getItem("omniverse_notes");
    notes = rawNotes ? JSON.parse(rawNotes) : [];
  } catch {
    notes = [];
  }

  return { memories, tasks, notes };
}

/**
 * Aggregates user memory and activity history into a structured timeline
 */
export function getMirrorHistoricalTimeline() {
  const { memories, notes, tasks } = getAggregatedUserData();
  const now = new Date();
  const timeline = [];

  // 1. Process Cortex Memories
  memories.forEach((m, idx) => {
    const timeStamp = m.timestamp || (now.getTime() - (idx + 1) * 86400000);
    const date = new Date(timeStamp);
    timeline.push({
      id: m.id || `mem-${idx}`,
      timestamp: timeStamp,
      dateStr: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      category: m.category || "Memory",
      title: typeof m === "string" ? m : (m.text || "Cortex Memory Snapshot"),
      impact: m.priority || "Medium",
      context: "Recorded by Cortex Memory Core",
      source: "cortex_memory",
    });
  });

  // 2. Process Completed Tasks
  tasks.filter((t) => t.completed).forEach((t, idx) => {
    const timeStamp = t.completedAt || (now.getTime() - (idx + 2) * 43200000);
    const date = new Date(timeStamp);
    timeline.push({
      id: `task-${t.id || idx}`,
      timestamp: timeStamp,
      dateStr: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      category: "Task Milestone",
      title: `Completed: ${t.text || t.title}`,
      impact: "Medium",
      context: `Category: ${t.category || "General"}`,
      source: "task_completion",
    });
  });

  // Sort chronologically (newest first)
  timeline.sort((a, b) => b.timestamp - a.timestamp);
  return timeline;
}

/**
 * Analyzes present user behavior with real data & evidence grounding
 */
export function getMirrorPresentAnalysis() {
  const { memories, tasks, notes } = getAggregatedUserData();
  const totalEvidenceCount = memories.length + tasks.length + notes.length;

  if (totalEvidenceCount < 3) {
    return {
      hasInsufficientData: true,
      totalEvidenceCount,
      recentFocus: "Initialization Phase",
      statedGoal: "Build Digital Twin History",
      priorityDriftScore: null,
      confidenceLabel: "Emerging Pattern",
      insights: [
        {
          id: "ins-init-1",
          type: "insight",
          title: "Digital Twin Initialization",
          desc: "Omniverse Mirror needs at least 3 saved notes, completed tasks, or Cortex memories to detect behavioral patterns.",
          action: "Create First Note",
          evidence: {
            conclusion: "Insufficient record history for statistical alignment scoring.",
            confidence: "Low",
            evidence_count: totalEvidenceCount,
            evidence_items: memories.slice(0, 3).map((m) => m.text || "Memory item"),
            data_time_range: "Recent 7 Days",
            inference_type: "Cold Start Initializer",
          },
        },
      ],
      decisionContracts: [],
    };
  }

  // Calculate alignment score based on completed task ratio & memory count
  const completedTasks = tasks.filter((t) => t.completed).length;
  const taskRatio = tasks.length > 0 ? (completedTasks / tasks.length) : 0.8;
  const alignmentScore = Math.min(98, Math.max(52, Math.round(taskRatio * 40 + 55)));

  const insights = [];

  if (tasks.length > 0 && completedTasks < tasks.length / 2) {
    insights.push({
      id: "ins-dyn-1",
      type: "warning",
      title: "Task Execution Backlog",
      desc: `You have ${tasks.length - completedTasks} open tasks pending completion across active categories.`,
      action: "Review Pending Tasks",
      evidence: {
        conclusion: "Task creation velocity exceeds completion velocity.",
        confidence: "Strong Pattern",
        evidence_count: tasks.length,
        evidence_items: tasks.filter((t) => !t.completed).slice(0, 3).map((t) => t.text || t.title),
        data_time_range: "30 Days",
        inference_type: "Execution Velocity Analysis",
      },
    });
  }

  insights.push({
    id: "ins-dyn-2",
    type: "positive",
    title: "Cortex Memory Accumulation",
    desc: `Cortex has indexed ${memories.length} persistent contextual memories supporting digital twin simulations.`,
    action: "View Cortex Memories",
    evidence: {
      conclusion: "Sufficient memory density for high-confidence trajectory modeling.",
      confidence: "Strong Pattern",
      evidence_count: memories.length,
      evidence_items: memories.slice(0, 3).map((m) => m.text || "Memory item"),
      data_time_range: "Full History",
      inference_type: "Memory Density Audit",
    },
  });

  return {
    hasInsufficientData: false,
    totalEvidenceCount,
    recentFocus: "Flagship Polish & AI Twin Features",
    statedGoal: "OmniverseOS Launch Readiness",
    priorityDriftScore: alignmentScore,
    confidenceLabel: totalEvidenceCount > 10 ? "High Confidence" : "Moderate Confidence",
    insights,
    decisionContracts: [
      {
        id: "dec-1",
        dateStr: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        question: "Focus on flagship polish or backend refactoring?",
        choice: "Flagship Polish & Evidence Grounding",
        prediction: "Product quality audit score will increase to 9.7/10.",
        status: "Active Tracking",
      },
    ],
  };
}

/**
 * Computes 4 future trajectory simulations based on actual behavior metrics
 */
export function getMirrorFutureTrajectories() {
  const { memories, tasks } = getAggregatedUserData();
  const totalItems = memories.length + tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;

  const completionPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 75;

  return [
    {
      id: "traj-status-quo",
      name: "Status Quo Trajectory",
      tagline: "Future You if current velocity holds",
      color: "#F59E0B",
      icon: "fa-arrow-right-long",
      probability: `${Math.max(45, 100 - completionPercent)}%`,
      projectedLaunchDate: "Mid September 2026",
      summary: `Based on your current task completion rate of ${completionPercent}%, steady progress continues with minor delays.`,
      keyRisk: "Unplanned scope expansion during final sprint.",
      simulationNotice: "Simulation based on current observed velocity — not a prediction.",
    },
    {
      id: "traj-consistent",
      name: "Optimal Execution Trajectory",
      tagline: "Future You executing consistently daily",
      color: "#39FF14",
      icon: "fa-rocket",
      probability: `${Math.min(92, completionPercent + 20)}%`,
      projectedLaunchDate: "September 1, 2026",
      summary: "Zero scope creep. Daily execution focused entirely on bug fixes and automated test coverage.",
      keyRisk: "High discipline required to resist non-essential apps.",
      simulationNotice: "Requires maintaining 100% daily task resolution.",
    },
    {
      id: "traj-strategy-fail",
      name: "Over-Engineering Trajectory",
      tagline: "Future You if bottlenecks break",
      color: "#FF003C",
      icon: "fa-triangle-exclamation",
      probability: `${Math.max(12, 35 - Math.floor(totalItems / 2))}%`,
      projectedLaunchDate: "Late October 2026",
      summary: "Perfectionism delays public testing while edge cases consume dev cycles.",
      keyRisk: "Burnout from continuous refactoring without user feedback.",
      simulationNotice: "Hypothetical risk scenario based on feature expansion.",
    },
    {
      id: "traj-peak",
      name: "Peak Vision Trajectory",
      tagline: "Future You at best possible trajectory",
      color: "#00F0FF",
      icon: "fa-wand-magic-sparkles",
      probability: `${Math.min(96, Math.max(80, totalItems * 5))}%`,
      projectedLaunchDate: "End of August 2026",
      summary: "Omniverse Mirror establishes a new category of personal AI operating environments.",
      keyRisk: "Scaling memory retrieval for long-term user logs.",
      simulationNotice: "Plausible peak outcome assuming flawless execution.",
    },
  ];
}

/**
 * Generates system prompt for chatting with Past or Future versions of Self
 */
export function getDigitalTwinSystemPrompt(mode = "future", trajectoryId = "traj-peak") {
  const { memories, notes, tasks } = getAggregatedUserData();
  const memoryContext = memories.map((m) => `- ${typeof m === "string" ? m : m.text}`).join("\n");
  const taskContext = tasks.slice(0, 5).map((t) => `- Task: ${t.text || t.title} (${t.completed ? "Done" : "Pending"})`).join("\n");
  const noteContext = notes.slice(0, 3).map((n) => `- Note: ${n.title || "Untitled"}`).join("\n");

  const fullContext = [memoryContext, taskContext, noteContext].filter(Boolean).join("\n");

  if (mode === "past") {
    return `You are "Past Self", a digital representation of the user reconstructed from earlier records in OmniverseOS.
Records & Historical Memory Context:
${fullContext || "No previous records found. User just initiated OmniverseOS."}

Disclaimer: State clearly that you are reconstructing historical perspective from recorded data.
Respond in the first person ("I believed...", "My main concern then was..."). Be grounded, reflective, and honest.`;
  }

  const trajectories = getMirrorFutureTrajectories();
  const targetTraj = trajectories.find((t) => t.id === trajectoryId) || trajectories[3];

  return `You are "Future Self (${targetTraj.name})", a digital twin projected into the future based on current behavioral records.
Trajectory Summary: ${targetTraj.summary}
Key Risk: ${targetTraj.keyRisk}
User Evidence Context:
${fullContext || "New user session."}

Disclaimer: Remind the user this is a trajectory simulation, not a guaranteed prediction.
Respond in the first person ("Looking back from 6 months ahead..."). Provide strategic, wise advice.`;
}
