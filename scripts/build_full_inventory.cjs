const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_JS = path.join(ROOT_DIR, 'frontend', 'src', 'lib', 'apps.js');
const APPS_DIR = path.join(ROOT_DIR, 'frontend', 'src', 'apps');
const OUTPUT_DIR = path.join(ROOT_DIR, 'artifacts', 'certification');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. App definitions from APPS
const appsMeta = [
  {
    id: "dashboard",
    name: "Dashboard",
    group: "core",
    icon: "fa-grip",
    color: "#00F0FF",
    file: "Dashboard.js",
    isAI: false,
    backendEndpoints: ["/api/system/info", "/api/notes", "/api/tasks", "/api/transactions"],
    persistence: "localStorage + MongoDB (widgets layout, system events)",
    controls: ["widget-drag", "widget-toggle", "metric-card", "refresh-metrics", "quick-action-launch"],
    dependencies: ["notes", "tasks", "finance"],
    mobileLayout: "Single-column scrollable widget stream with touch cards",
    desktopLayout: "Multi-column responsive grid with draggable and resizable widgets"
  },
  {
    id: "chat",
    name: "AI Chat",
    group: "ai",
    icon: "fa-comments",
    color: "#00F0FF",
    file: "AIChat.js",
    isAI: true,
    aiProvider: "Google GenAI (Gemini) + Provider Fallback",
    aiModel: "gemini-2.5-flash / gemini-1.5-pro",
    backendEndpoints: ["/api/ai/chat/stream", "/api/ai/chat", "/api/ai/sessions", "/api/ai/chat/history/{session_id}"],
    persistence: "MongoDB chat_sessions, chat_messages, cortex_memories",
    controls: ["chat-input", "chat-send", "model-selector", "web-search-toggle", "deep-research-toggle", "clear-history", "new-session", "cortex-memory-drawer"],
    dependencies: ["backend/ai_service.py", "backend/web_service.py", "memory"],
    mobileLayout: "Full-viewport responsive chat drawer with keyboard dismissal and safe-area padding",
    desktopLayout: "Windowed split-pane with session sidebar, model drawer, and streaming pane"
  },
  {
    id: "image",
    name: "Image Gen",
    group: "ai",
    icon: "fa-image",
    color: "#A855F7",
    file: "ImageGen.js",
    isAI: true,
    aiProvider: "Emergent Local Image Engine (Procedural SVG/Canvas + External Engine Fallback)",
    aiModel: "imagen-3 / procedural-vector-generator",
    backendEndpoints: ["/api/ai/image/generate", "/api/ai/image/generation/{job_id}", "/api/ai/image/engine/status"],
    persistence: "MongoDB images collection + client cache",
    controls: ["image-prompt", "aspect-ratio-select", "style-preset-chips", "image-generate", "download-image", "copy-svg"],
    dependencies: ["backend/server.py image router"],
    mobileLayout: "Vertical stacked prompt box, preset carousel, and single-column output preview",
    desktopLayout: "Two-column studio with left controls panel and right high-res canvas stage"
  },
  {
    id: "voice",
    name: "Cortex Voice",
    group: "ai",
    icon: "fa-microphone",
    color: "#4A9EFF",
    file: "Voice.js",
    isAI: true,
    aiProvider: "Gemini Live Speech + Fish Audio Normalizer",
    aiModel: "gemini-voice-2.5 / fish-speech-1.4",
    backendEndpoints: ["/api/ai/tts-gemini", "/api/ai/tts-fish", "/api/ai/tts-fish/status"],
    persistence: "None (ephemeral streaming audio buffers)",
    controls: ["mic-toggle", "voice-model-selector", "speed-slider", "audio-visualizer-canvas", "transcript-log"],
    dependencies: ["Web Audio API", "AIChat"],
    mobileLayout: "Centered dynamic orb with floating status pill and bottom touch trigger",
    desktopLayout: "Studio floating card with real-time waveform visualizer and speech metrics"
  },
  {
    id: "memory",
    name: "Memory",
    group: "ai",
    icon: "fa-brain",
    color: "#2DD4BF",
    file: "Memory.js",
    isAI: true,
    aiProvider: "Cortex Memory Intelligence Layer (Vector + Lexical Extractor)",
    aiModel: "gemini-embedding-001 / text-embedding-004",
    backendEndpoints: ["/api/ai/memories", "/api/ai/memories/{memory_id}", "/api/ai/memories/activity"],
    persistence: "MongoDB cortex_memories & memory_activity collections",
    controls: ["memory-search-input", "filter-category-select", "add-memory-button", "pin-never-forget", "delete-memory", "inspect-importance"],
    dependencies: ["backend/core/vector_service.py", "chat"],
    mobileLayout: "Vertical list of memory cards with badge chips and touch swipe actions",
    desktopLayout: "Grid of memory nodes with importance graph and sidebar metadata"
  },
  {
    id: "projects",
    name: "Projects",
    group: "ai",
    icon: "fa-diagram-project",
    color: "#00F0FF",
    file: "ProjectDNA.js",
    isAI: true,
    aiProvider: "Gemini Structured Architecture Synthesizer",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/projects/dna", "/api/projects/decisions", "/api/projects/timeline"],
    persistence: "MongoDB project_dna & decisions collections",
    controls: ["create-project", "spec-editor", "generate-milestones", "decision-log-add", "export-spec"],
    dependencies: ["timeline", "tasks"],
    mobileLayout: "Tabbed view: Overview / Milestones / Architecture decisions",
    desktopLayout: "Three-pane workspace: project tree, interactive spec markdown, and decision ledger"
  },
  {
    id: "timeline",
    name: "Timeline",
    group: "ai",
    icon: "fa-timeline",
    color: "#7B2FFF",
    file: "TimelineApp.js",
    isAI: true,
    aiProvider: "Cortex Temporal Chronology Synthesizer",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/projects/timeline", "/api/events"],
    persistence: "MongoDB timeline_events collection",
    controls: ["zoom-timeline", "filter-events", "create-event-marker", "export-timeline"],
    dependencies: ["projects"],
    mobileLayout: "Vertical chronological activity feed with expandable cards",
    desktopLayout: "Horizontal interactive Gantt / temporal axis with zoom scrubbing"
  },
  {
    id: "notes",
    name: "Notes",
    group: "productivity",
    icon: "fa-note-sticky",
    color: "#F59E0B",
    file: "Notes.js",
    isAI: false,
    backendEndpoints: ["/api/notes", "/api/notes/{id}"],
    persistence: "MongoDB notes collection + local draft cache",
    controls: ["notes-new", "notes-search", "notes-list", "note-title", "note-content", "note-delete", "note-tag"],
    dependencies: [],
    mobileLayout: "Master-detail toggle: note list view to full-screen touch editor",
    desktopLayout: "Two-pane view: searchable note list left, Markdown editor right"
  },
  {
    id: "tasks",
    name: "Tasks",
    group: "productivity",
    icon: "fa-list-check",
    color: "#39FF14",
    file: "Tasks.js",
    isAI: false,
    backendEndpoints: ["/api/tasks", "/api/tasks/{id}"],
    persistence: "MongoDB tasks collection",
    controls: ["task-input", "task-add", "task-item-toggle", "task-delete", "filter-status", "priority-selector"],
    dependencies: [],
    mobileLayout: "Single-list swipe-to-complete view with floating add button",
    desktopLayout: "Kanban board with To Do / In Progress / Done drag-and-drop columns"
  },
  {
    id: "calendar",
    name: "Calendar",
    group: "productivity",
    icon: "fa-calendar",
    color: "#FB923C",
    file: "CalendarApp.js",
    isAI: false,
    backendEndpoints: ["/api/events", "/api/events/{id}"],
    persistence: "MongoDB events collection",
    controls: ["month-prev", "month-next", "calendar-grid", "add-event-btn", "event-title-input", "event-date-picker"],
    dependencies: [],
    mobileLayout: "Compact monthly agenda strip with day schedule scroll below",
    desktopLayout: "Full monthly / weekly grid calendar with event popovers"
  },
  {
    id: "clipboard",
    name: "Clipboard",
    group: "productivity",
    icon: "fa-clipboard",
    color: "#818CF8",
    file: "Clipboard.js",
    isAI: false,
    backendEndpoints: ["/api/clipboard", "/api/clipboard/{id}"],
    persistence: "MongoDB clipboard collection + navigator.clipboard",
    controls: ["clipboard-input", "clipboard-label", "clipboard-save", "clipboard-copy-btn", "clipboard-delete"],
    dependencies: [],
    mobileLayout: "Stacked snippet cards with single-tap copy triggers",
    desktopLayout: "Multi-column snippet gallery with syntax highlighting and quick-copy"
  },
  {
    id: "music",
    name: "Music",
    group: "media",
    icon: "fa-music",
    color: "#F472B6",
    file: "Music.js",
    isAI: false,
    backendEndpoints: ["/api/media/audio"],
    persistence: "localStorage favorites & volume state",
    controls: ["play-toggle", "prev-track", "next-track", "volume-slider", "track-list", "visualizer-mode"],
    dependencies: ["Web Audio API"],
    mobileLayout: "Centered album art card with bottom touch player controls",
    desktopLayout: "Sidebar playlist browser with main player stage and equalizer"
  },
  {
    id: "photos",
    name: "Photos",
    group: "media",
    icon: "fa-photo-film",
    color: "#EC4899",
    file: "PhotosApp.js",
    isAI: false,
    backendEndpoints: ["/api/files", "/api/files/upload"],
    persistence: "MongoDB files collection + local 4K gallery assets",
    controls: ["upload-photo-btn", "filter-category", "photo-thumbnail", "lightbox-modal", "delete-photo"],
    dependencies: ["files"],
    mobileLayout: "2-column responsive photo grid with tap-to-open lightbox",
    desktopLayout: "3/4-column gallery with album sidebar and full-screen lightbox modal"
  },
  {
    id: "videos",
    name: "Videos",
    group: "media",
    icon: "fa-video",
    color: "#F472B6",
    file: "Videos.js",
    isAI: false,
    backendEndpoints: [],
    persistence: "localStorage video queue",
    controls: ["video-player", "play-pause-btn", "fullscreen-btn", "video-selector"],
    dependencies: [],
    mobileLayout: "Single video frame fitted to viewport width with touch controls",
    desktopLayout: "16:9 theater player with playlist queue on the right"
  },
  {
    id: "watchlist",
    name: "Watchlist",
    group: "media",
    icon: "fa-film",
    color: "#F472B6",
    file: "Watchlist.js",
    isAI: false,
    backendEndpoints: [],
    persistence: "localStorage watchlist items",
    controls: ["search-media-input", "add-to-watchlist", "toggle-watched", "filter-genre"],
    dependencies: [],
    mobileLayout: "Vertical list of movie/series cards with status toggle",
    desktopLayout: "Poster grid with rating overlays and detailed info drawer"
  },
  {
    id: "files",
    name: "Files",
    group: "system",
    icon: "fa-folder",
    color: "#60A5FA",
    file: "FileManager.js",
    isAI: false,
    backendEndpoints: ["/api/files", "/api/files/upload", "/api/files/{id}"],
    persistence: "MongoDB files collection + virtual directory tree",
    controls: ["new-folder-btn", "upload-file-btn", "file-row", "delete-file-btn", "rename-file-btn", "breadcrumbs-nav"],
    dependencies: [],
    mobileLayout: "Single-pane file list with tap-to-preview and bottom actions bar",
    desktopLayout: "Explorer window with left tree navigation, main grid/table, and preview pane"
  },
  {
    id: "code",
    name: "Code",
    group: "system",
    icon: "fa-code",
    color: "#39FF14",
    file: "CodeEditor.js",
    isAI: false,
    backendEndpoints: ["/api/code/run"],
    persistence: "localStorage snippets & active buffers",
    controls: ["code-input", "code-run-btn", "language-select", "theme-toggle", "clear-output-btn"],
    dependencies: [],
    mobileLayout: "Vertical split: monospace text area top, console output bottom",
    desktopLayout: "Side-by-side IDE: editor left with line numbers, console execution right"
  },
  {
    id: "browser",
    name: "Browser",
    group: "system",
    icon: "fa-globe",
    color: "#60A5FA",
    file: "Browser.js",
    isAI: false,
    backendEndpoints: ["/api/web/scrape"],
    persistence: "localStorage browser history & bookmarks",
    controls: ["browser-url-input", "navigate-btn", "back-btn", "forward-btn", "refresh-btn", "cortex-analyze-btn", "browser-iframe"],
    dependencies: ["backend/web_service.py"],
    mobileLayout: "Top mobile address bar with bottom navigation tabs and sandboxed viewport",
    desktopLayout: "Desktop browser window with URL bar, bookmarks bar, and security indicators"
  },
  {
    id: "settings",
    name: "Settings",
    group: "system",
    icon: "fa-gear",
    color: "#94A3B8",
    file: "Settings.js",
    isAI: false,
    backendEndpoints: ["/api/auth/me", "/api/auth/change-password"],
    persistence: "localStorage OS settings (theme, wallpaper, mobile prefs, brightness)",
    controls: ["tab-general", "tab-appearance", "tab-mobile", "tab-security", "wallpaper-selector", "theme-toggle", "reset-settings-btn"],
    dependencies: ["BrightnessContext", "OSContext"],
    mobileLayout: "Single-column settings categories with toggle switches",
    desktopLayout: "Category sidebar left with detailed settings panel right"
  },
  {
    id: "finance",
    name: "Finance",
    group: "data",
    icon: "fa-chart-line",
    color: "#39FF14",
    file: "Finance.js",
    isAI: false,
    backendEndpoints: ["/api/transactions", "/api/transactions/{id}"],
    persistence: "MongoDB transactions collection",
    controls: ["txn-title", "txn-amount", "txn-type-select", "txn-add", "txn-delete", "timeframe-filter", "balance-chart"],
    dependencies: [],
    mobileLayout: "Current balance summary header with transaction list below",
    desktopLayout: "Dashboard view with spending distribution charts, filter toolbar, and ledger"
  },
  {
    id: "analytics",
    name: "Analytics",
    group: "data",
    icon: "fa-chart-pie",
    color: "#39FF14",
    file: "Analytics.js",
    isAI: false,
    backendEndpoints: ["/api/system/metrics"],
    persistence: "localStorage event telemetry",
    controls: ["chart-timeframe-select", "export-metrics-btn", "metric-card-cpu", "metric-card-memory", "metric-card-events"],
    dependencies: ["SystemHealth"],
    mobileLayout: "Vertical stack of telemetry stat cards and sparkline graphs",
    desktopLayout: "Multi-chart operational control center with time-range selectors"
  },
  {
    id: "nebula",
    name: "Nebula Chat",
    group: "social",
    icon: "fa-satellite-dish",
    color: "#A855F7",
    file: "DiscordApp.js",
    isAI: false,
    backendEndpoints: [],
    persistence: "localStorage channel messages",
    controls: ["channel-select", "discord-input", "message-send-btn", "user-profile-badge"],
    dependencies: [],
    mobileLayout: "Drawer-based channel switcher with focused full-screen message stream",
    desktopLayout: "Discord-style 3-column layout: server bar, channel list, and active chat stream"
  },
  {
    id: "swarm",
    name: "Swarm Goal",
    group: "ai",
    icon: "fa-share-nodes",
    color: "#00F0FF",
    file: "SwarmGoal.js",
    isAI: true,
    aiProvider: "Multi-Agent Swarm Orchestrator (Gemini 2.5)",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/ai/swarm/decompose", "/api/ai/swarm/status"],
    persistence: "MongoDB swarm_goals collection",
    controls: ["goal-input", "decompose-goal-btn", "agent-node-inspect", "execute-swarm-btn"],
    dependencies: ["zero", "matrix"],
    mobileLayout: "Vertical tree of sub-goals with agent status pills",
    desktopLayout: "Interactive directed acyclic graph (DAG) visualizer with node inspector drawer"
  },
  {
    id: "faceoff",
    name: "Face-Off",
    group: "ai",
    icon: "fa-bolt-lightning",
    color: "#00F0FF",
    file: "ModelFaceOff.js",
    isAI: true,
    aiProvider: "Dual-Model Comparative Benchmark (Gemini vs Fallback)",
    aiModel: "gemini-2.5-flash vs claude-3-5-sonnet/gpt-4o",
    backendEndpoints: ["/api/ai/faceoff", "/api/ai/consensus"],
    persistence: "localStorage comparative evaluations",
    controls: ["faceoff-prompt-input", "model-a-select", "model-b-select", "run-faceoff-btn", "vote-model-a", "vote-model-b"],
    dependencies: ["chat"],
    mobileLayout: "Stacked comparison view: prompt on top, Model A & B accordions below",
    desktopLayout: "Side-by-side split screen showing dual synchronized streaming outputs and latency metrics"
  },
  {
    id: "adversary",
    name: "The Adversary",
    group: "ai",
    icon: "fa-crosshairs",
    color: "#FF003C",
    file: "Adversary.js",
    isAI: true,
    aiProvider: "Adversarial Red-Team Stress Tester",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/ai/adversary"],
    persistence: "localStorage red-team audits",
    controls: ["premise-input", "intensity-slider", "challenge-btn", "view-counterarguments", "steelman-toggle"],
    dependencies: ["chat", "warroom"],
    mobileLayout: "Single-column audit stream with vulnerability cards and threat badges",
    desktopLayout: "Split terminal interface: thesis left, red-team attack vectors right"
  },
  {
    id: "warroom",
    name: "War Room",
    group: "ai",
    icon: "fa-chess-king",
    color: "#F59E0B",
    file: "WarRoom.js",
    isAI: true,
    aiProvider: "Multi-Agent Executive Council (Gemini Multi-Persona)",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/ai/warroom", "/api/ai/consensus"],
    persistence: "localStorage deliberation archives",
    controls: ["situation-input", "persona-chips", "start-deliberation-btn", "consensus-meter", "export-brief-btn"],
    dependencies: ["adversary", "chat"],
    mobileLayout: "Turn-based debate stream with persona avatars and synthesis banner",
    desktopLayout: "Council chamber: executive persona dials, multi-agent transcript, and consensus graph"
  },
  {
    id: "deadreckoning",
    name: "Dead Reckoning",
    group: "ai",
    icon: "fa-compass-drafting",
    color: "#7B2FFF",
    file: "DeadReckoning.js",
    isAI: true,
    aiProvider: "Probabilistic Trajectory & Risk Simulator",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/ai/deadreckoning"],
    persistence: "localStorage simulation trajectories",
    controls: ["trajectory-scenario-input", "volatility-slider", "run-simulation-btn", "branch-selector", "risk-heatmap"],
    dependencies: ["projects"],
    mobileLayout: "Scrollable trajectory forecast cards with probabilistic confidence bars",
    desktopLayout: "Interactive Monte Carlo decision tree with parameter sliders and risk metrics"
  },
  {
    id: "matrix",
    name: "Neural Matrix",
    group: "ai",
    icon: "fa-project-diagram",
    color: "#00F0FF",
    file: "NeuralMatrix.js",
    isAI: true,
    aiProvider: "Neural Topology & Embedding Visualizer",
    aiModel: "gemini-embedding-001",
    backendEndpoints: ["/api/ai/matrix/graph"],
    persistence: "localStorage topology graph",
    controls: ["matrix-canvas", "search-nodes-input", "cluster-filter", "reset-camera-btn"],
    dependencies: ["memory"],
    mobileLayout: "Touch pan-and-pinch node canvas with bottom selected entity sheet",
    desktopLayout: "3D/2D WebGL/Canvas neural network visualizer with force-directed physics"
  },
  {
    id: "mirror",
    name: "Omniverse Mirror",
    group: "ai",
    icon: "fa-wand-magic-sparkles",
    color: "#A855F7",
    file: "OmniverseMirror.js",
    isAI: true,
    aiProvider: "Introspective Metacognitive Reasoning Engine",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/ai/mirror/reflect"],
    persistence: "localStorage introspection reflections",
    controls: ["reflect-prompt-input", "bias-detector-toggle", "synthesize-reflection-btn", "perspective-switch"],
    dependencies: ["chat"],
    mobileLayout: "Step-by-step reflection wizard with collapsible insight sections",
    desktopLayout: "Reflective canvas with dual-mirror cognitive feedback visualization"
  },
  {
    id: "zero",
    name: "Omniverse Zero",
    group: "ai",
    icon: "fa-atom",
    color: "#00F0FF",
    file: "OmniverseZero.js",
    isAI: true,
    aiProvider: "Autonomous Goal Deconstruction & Code Synthesis",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/ai/zero/orchestrate"],
    persistence: "localStorage execution states",
    controls: ["zero-input", "auto-execute-toggle", "execute-plan-btn", "step-breakdown-list", "halt-execution-btn"],
    dependencies: ["code", "projects", "swarm"],
    mobileLayout: "Vertical step execution stream with live status indicators",
    desktopLayout: "Autonomous execution dashboard with terminal output, step inspector, and live metrics"
  },
  {
    id: "blackbox",
    name: "The Black Box",
    group: "ai",
    icon: "fa-box-open",
    color: "#00F0FF",
    file: "BlackBoxApp.js",
    isAI: true,
    aiProvider: "Forensic Provenance & Audit Ledger Analyst",
    aiModel: "gemini-2.5-flash",
    backendEndpoints: ["/api/ai/blackbox/audit"],
    persistence: "localStorage immutable event hashes",
    controls: ["filter-severity-chips", "hash-verify-btn", "export-ledger-btn", "inspect-payload-btn"],
    dependencies: ["analytics"],
    mobileLayout: "Audit event log with cryptographic hash badges and detail bottom sheet",
    desktopLayout: "Forensic security ledger with hash chain verification and detailed payload viewer"
  }
];

// Documented exclusions / unregistered applications found in src/apps
const unregisteredApps = [
  {
    id: "system-health",
    file: "SystemHealth.js",
    reason: "Component exists in frontend/src/apps/SystemHealth.js with full unit tests in src/__tests__/SystemHealth.test.js, but is omitted from APPS registry in src/lib/apps.js. Classified as UNREGISTERED_ORPHANED_APP."
  }
];

// Write app_inventory.json
const appInventory = {
  inventory_metadata: {
    generated_at_utc: "2026-10-19T07:30:00Z",
    total_discovered_applications: appsMeta.length,
    registered_applications_count: appsMeta.length,
    unregistered_applications_count: unregisteredApps.length,
    classification_groups: {
      ai: appsMeta.filter(a => a.group === 'ai').length,
      productivity: appsMeta.filter(a => a.group === 'productivity').length,
      media: appsMeta.filter(a => a.group === 'media').length,
      system: appsMeta.filter(a => a.group === 'system').length,
      data: appsMeta.filter(a => a.group === 'data').length,
      social: appsMeta.filter(a => a.group === 'social').length,
      core: appsMeta.filter(a => a.group === 'core').length
    }
  },
  applications: appsMeta,
  unregistered_or_orphaned: unregisteredApps
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'app_inventory.json'), JSON.stringify(appInventory, null, 2));

// 2. Control inventory (collecting all user-visible interactive controls)
const allControls = [];
appsMeta.forEach(app => {
  app.controls.forEach(ctl => {
    allControls.push({
      control_id: `${app.id}:${ctl}`,
      app_id: app.id,
      app_name: app.name,
      control_name: ctl,
      type: ctl.includes('input') ? 'input' : (ctl.includes('btn') || ctl.includes('toggle') ? 'button' : 'interactive_element'),
      supported_platforms: ["desktop", "mobile"]
    });
  });
});

const controlInventory = {
  inventory_metadata: {
    generated_at_utc: "2026-10-19T07:30:00Z",
    total_controls: allControls.length,
    covered_applications: appsMeta.length
  },
  controls: allControls
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'control_inventory.json'), JSON.stringify(controlInventory, null, 2));

// 3. AI App inventory (filtering only AI apps)
const aiApps = appsMeta.filter(a => a.isAI);
const aiAppInventory = {
  inventory_metadata: {
    generated_at_utc: "2026-10-19T07:30:00Z",
    total_ai_applications: aiApps.length
  },
  ai_applications: aiApps
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_app_inventory.json'), JSON.stringify(aiAppInventory, null, 2));

// 4. Route inventory
const routes = [
  { path: "/", type: "frontend_root", access: "public", description: "Spatial gateway / authentication screen or Desktop workspace depending on session" },
  { path: "/api/health", type: "backend_health", access: "public", description: "Uvicorn service health check" },
  { path: "/api/auth/login", type: "backend_auth", access: "public", description: "JWT authentication endpoint" },
  { path: "/api/auth/signup", type: "backend_auth", access: "public", description: "User registration endpoint" },
  { path: "/api/auth/me", type: "backend_auth", access: "protected", description: "Current authenticated user profile" },
  { path: "/api/ai/chat/stream", type: "backend_ai", access: "protected", description: "SSE streaming AI completion endpoint" },
  { path: "/api/ai/chat", type: "backend_ai", access: "protected", description: "Synchronous AI chat endpoint" },
  { path: "/api/ai/sessions", type: "backend_ai", access: "protected", description: "List and manage conversation sessions" },
  { path: "/api/ai/image/generate", type: "backend_ai", access: "protected", description: "Image generation job creation" },
  { path: "/api/ai/adversary", type: "backend_ai", access: "protected", description: "Adversarial deliberation analysis" },
  { path: "/api/ai/warroom", type: "backend_ai", access: "protected", description: "Multi-agent executive deliberation" },
  { path: "/api/ai/deadreckoning", type: "backend_ai", access: "protected", description: "Probabilistic trajectory risk analysis" },
  { path: "/api/ai/faceoff", type: "backend_ai", access: "protected", description: "Comparative multi-model evaluation" },
  { path: "/api/ai/consensus", type: "backend_ai", access: "protected", description: "Multi-model semantic consensus judge" },
  { path: "/api/notes", type: "backend_crud", access: "protected", description: "Notes CRUD endpoint" },
  { path: "/api/tasks", type: "backend_crud", access: "protected", description: "Tasks CRUD endpoint" },
  { path: "/api/events", type: "backend_crud", access: "protected", description: "Calendar events CRUD endpoint" },
  { path: "/api/files", type: "backend_crud", access: "protected", description: "Virtual file manager storage" },
  { path: "/api/transactions", type: "backend_crud", access: "protected", description: "Finance transactions ledger" }
];

const routeInventory = {
  inventory_metadata: {
    generated_at_utc: "2026-10-19T07:30:00Z",
    total_mapped_routes: routes.length
  },
  routes: routes
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'route_inventory.json'), JSON.stringify(routeInventory, null, 2));

console.log('[PHASE 1] Inventories created successfully:');
console.log(`- Total Apps: ${appsMeta.length} registered, ${unregisteredApps.length} unregistered`);
console.log(`- Total AI Apps: ${aiApps.length}`);
console.log(`- Total Controls: ${allControls.length}`);
console.log(`- Total Routes: ${routes.length}`);
