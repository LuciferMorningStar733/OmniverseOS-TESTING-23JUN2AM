import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import WindowsPhoneTile from "./WindowsPhoneTile";
import { getApp } from "../../lib/apps";

export default function WindowsPhoneLiveTiles({ onOpenApp, onNavigateToAppList, onOpenSearch }) {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, "0");
      setTimeStr(`${hrs}:${mins}`);

      const options = { weekday: "short", month: "short", day: "numeric" };
      setDateStr(now.toLocaleDateString("en-US", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        background: "#000000", // Authentic Windows Phone OLED Pitch Black Canvas
        color: "#ffffff",
        padding: "calc(68px + env(safe-area-inset-top, 0px)) 12px calc(80px + env(safe-area-inset-bottom, 0px)) 12px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', 'Outfit', -apple-system, sans-serif",
      }}
      data-testid="windows-phone-start"
    >
      {/* ── METRO TOP STATUS BAR ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px 16px 4px",
          color: "rgba(255,255,255,0.7)",
          fontSize: 11,
          fontFamily: "'Segoe UI', 'Outfit', sans-serif",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 700 }}>{timeStr || "12:00"}</span>
          <span>{dateStr || "Today"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#00A4EF", fontSize: 10, letterSpacing: "0.05em" }}>QUANTUM MESH</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <i className="fa-solid fa-wifi" style={{ fontSize: 11, color: "#ffffff" }} />
            <i className="fa-solid fa-bolt" style={{ fontSize: 11, color: "#39FF14" }} />
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ffffff" }}>94%</span>
          </div>
        </div>
      </div>

      {/* ── METRO PANORAMA PIVOT HEADER ───────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "0 4px 18px 4px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            fontFamily: "'Segoe UI', 'Outfit', sans-serif",
            color: "#ffffff",
            lineHeight: 1,
            textTransform: "lowercase",
          }}
        >
          start
        </h1>

        <button
          onClick={onNavigateToAppList}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            color: "rgba(255,255,255,0.85)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            fontFamily: "'Segoe UI', 'Outfit', sans-serif",
            textTransform: "lowercase",
            WebkitTapHighlightColor: "transparent",
            backdropFilter: "blur(12px)",
          }}
        >
          <span>all apps</span>
          <i className="fa-solid fa-arrow-right" style={{ fontSize: 10, color: "#00F0FF" }} />
        </button>
      </div>

      {/* ── LIVE TILES ASYMMETRIC GRID ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* 1. WIDE TILE: Cortex Core AI */}
        <WindowsPhoneTile
          app={getApp("chat")}
          size="wide"
          title="cortex neural core"
          icon="fa-brain"
          accentColor="#0078D7"
          badge="ACTIVE"
          statusText="Continuous multi-agent consciousness · 12ms ping"
          secondaryContent="14 episodic memories indexed. Zero cross-app canary leaks verified."
          canFlip={true}
          flipInterval={6000}
          onClick={() => onOpenApp("chat")}
          delay={0.02}
        />

        {/* 2. MEDIUM TILE: AI Chat */}
        <WindowsPhoneTile
          app={getApp("chat")}
          size="medium"
          title="ai chat"
          icon="fa-comments"
          accentColor="#00A4EF"
          badge="3"
          statusText="Streaming"
          secondaryContent="Multi-tier LLM routing with local fallback."
          canFlip={true}
          flipInterval={7000}
          onClick={() => onOpenApp("chat")}
          delay={0.04}
        />

        {/* 3. MEDIUM TILE: The Adversary */}
        <WindowsPhoneTile
          app={getApp("adversary")}
          size="medium"
          title="the adversary"
          icon="fa-crosshairs"
          accentColor="#E51400"
          badge="RED TEAM"
          statusText="Stress-Test"
          secondaryContent="Fatal demand vacuum & XSS exploit analysis active."
          canFlip={true}
          flipInterval={5500}
          onClick={() => onOpenApp("adversary")}
          delay={0.06}
        />

        {/* 4. WIDE TILE: War Room Deliberation Matrix */}
        <WindowsPhoneTile
          app={getApp("warroom")}
          size="wide"
          title="war room matrix"
          icon="fa-chess-king"
          accentColor="#F09609"
          badge="5 AGENTS"
          statusText="Deliberating: Investor, Customer, Competitor, Critic & Journalist"
          secondaryContent="92% agreement on handling unexpected network partitions."
          canFlip={true}
          flipInterval={6500}
          onClick={() => onOpenApp("warroom")}
          delay={0.08}
        />

        {/* 5. MEDIUM TILE: Image Gen Studio */}
        <WindowsPhoneTile
          app={getApp("image")}
          size="medium"
          title="image gen"
          icon="fa-image"
          accentColor="#8C00BF"
          statusText="FLUX / SDXL"
          secondaryContent="Cyberpunk HUD rings volumetric asset queue ready."
          canFlip={true}
          flipInterval={8000}
          onClick={() => onOpenApp("image")}
          delay={0.10}
        />

        {/* 6. MEDIUM TILE: Cortex Voice */}
        <WindowsPhoneTile
          app={getApp("voice")}
          size="medium"
          title="cortex voice"
          icon="fa-microphone"
          accentColor="#008272"
          badge="MIC"
          statusText="Speech STT"
          secondaryContent="Acoustic waveform modulation & speech telemetry."
          canFlip={true}
          flipInterval={7500}
          onClick={() => onOpenApp("voice")}
          delay={0.12}
        />

        {/* 7. MEDIUM TILE: Code Studio */}
        <WindowsPhoneTile
          app={getApp("code")}
          size="medium"
          title="code studio"
          icon="fa-code"
          accentColor="#107C41"
          badge="JS/PY"
          statusText="Syntax IDE"
          secondaryContent="Isolated execution sandbox with live preview."
          canFlip={true}
          flipInterval={9000}
          onClick={() => onOpenApp("code")}
          delay={0.14}
        />

        {/* 8. MEDIUM TILE: File Manager */}
        <WindowsPhoneTile
          app={getApp("files")}
          size="medium"
          title="files & storage"
          icon="fa-folder"
          accentColor="#2D7D9A"
          badge="SAFE"
          statusText="Workspace"
          secondaryContent="Deterministic filesystem sandbox integrity verified."
          canFlip={true}
          flipInterval={8500}
          onClick={() => onOpenApp("files")}
          delay={0.16}
        />

        {/* 9. MEDIUM TILE: Dead Reckoning */}
        <WindowsPhoneTile
          app={getApp("deadreckoning")}
          size="medium"
          title="dead reckoning"
          icon="fa-compass-drafting"
          accentColor="#D83B01"
          statusText="Monte Carlo"
          secondaryContent="Trajectory risk simulation under 20% packet loss."
          canFlip={true}
          flipInterval={6200}
          onClick={() => onOpenApp("deadreckoning")}
          delay={0.18}
        />

        {/* 10. MEDIUM TILE: Neural Matrix */}
        <WindowsPhoneTile
          app={getApp("matrix")}
          size="medium"
          title="neural matrix"
          icon="fa-project-diagram"
          accentColor="#6B21A8"
          badge="94%"
          statusText="Consensus"
          secondaryContent="Multi-model vector orthogonality calculated at 90°."
          canFlip={true}
          flipInterval={7200}
          onClick={() => onOpenApp("matrix")}
          delay={0.20}
        />

        {/* 11. SMALL TILES ROW (4 Compact 1x1 Tiles) */}
        <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <WindowsPhoneTile
            app={getApp("notes")}
            size="small"
            title="Notes"
            icon="fa-note-sticky"
            accentColor="#F59E0B"
            onClick={() => onOpenApp("notes")}
            delay={0.22}
          />
          <WindowsPhoneTile
            app={getApp("music")}
            size="small"
            title="Music"
            icon="fa-music"
            accentColor="#EC4899"
            onClick={() => onOpenApp("music")}
            delay={0.24}
          />
          <WindowsPhoneTile
            app={getApp("settings")}
            size="small"
            title="Settings"
            icon="fa-gear"
            accentColor="#64748B"
            onClick={() => onOpenApp("settings")}
            delay={0.26}
          />
          <WindowsPhoneTile
            app={getApp("tasks")}
            size="small"
            title="Tasks"
            icon="fa-list-check"
            accentColor="#107C41"
            onClick={() => onOpenApp("tasks")}
            delay={0.28}
          />
        </div>

        {/* 12. MEDIUM TILE: Project Genesis */}
        <WindowsPhoneTile
          app={getApp("projects")}
          size="medium"
          title="project genesis"
          icon="fa-diagram-project"
          accentColor="#D97706"
          badge="DNA"
          statusText="Architecture"
          secondaryContent="Autonomous roadmap milestones & zero-trust delivery."
          canFlip={true}
          flipInterval={8800}
          onClick={() => onOpenApp("projects")}
          delay={0.30}
        />

        {/* 13. MEDIUM TILE: Memory Palace */}
        <WindowsPhoneTile
          app={getApp("memory")}
          size="medium"
          title="memory palace"
          icon="fa-brain"
          accentColor="#008272"
          badge="14 VEC"
          statusText="Semantic"
          secondaryContent="Cosine similarity vector clustering active."
          canFlip={true}
          flipInterval={6800}
          onClick={() => onOpenApp("memory")}
          delay={0.32}
        />

        {/* 14. SMALL TILES ROW 2 (4 Compact 1x1 Tiles) */}
        <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <WindowsPhoneTile
            app={getApp("calendar")}
            size="small"
            title="Calendar"
            icon="fa-calendar"
            accentColor="#F7630C"
            onClick={() => onOpenApp("calendar")}
            delay={0.34}
          />
          <WindowsPhoneTile
            app={getApp("browser")}
            size="small"
            title="Browser"
            icon="fa-globe"
            accentColor="#0078D7"
            onClick={() => onOpenApp("browser")}
            delay={0.36}
          />
          <WindowsPhoneTile
            app={getApp("clipboard")}
            size="small"
            title="Clipboard"
            icon="fa-clipboard"
            accentColor="#818CF8"
            onClick={() => onOpenApp("clipboard")}
            delay={0.38}
          />
          <WindowsPhoneTile
            app={getApp("blackbox")}
            size="small"
            title="Black Box"
            icon="fa-box-open"
            accentColor="#00F0FF"
            onClick={() => onOpenApp("blackbox")}
            delay={0.40}
          />
        </div>

        {/* 15. MEDIUM TILE: Model Face-Off */}
        <WindowsPhoneTile
          app={getApp("faceoff")}
          size="medium"
          title="model face-off"
          icon="fa-bolt-lightning"
          accentColor="#00A4EF"
          badge="ARENA"
          statusText="Benchmark"
          secondaryContent="Side-by-side quantum computing reasoning arbiter."
          canFlip={true}
          flipInterval={7600}
          onClick={() => onOpenApp("faceoff")}
          delay={0.42}
        />

        {/* 16. MEDIUM TILE: Swarm Goal */}
        <WindowsPhoneTile
          app={getApp("swarm")}
          size="medium"
          title="swarm goal"
          icon="fa-share-nodes"
          accentColor="#4338CA"
          badge="3 AGENTS"
          statusText="Coordinator"
          secondaryContent="Distributed autonomous goal decomposition pipeline."
          canFlip={true}
          flipInterval={8200}
          onClick={() => onOpenApp("swarm")}
          delay={0.44}
        />

        {/* 17. WIDE TILE: OmniverseOS Kernel Diagnostics */}
        <WindowsPhoneTile
          size="wide"
          title="omniverseos 2.0 kernel"
          icon="fa-infinity"
          accentColor="#0C0D14"
          badge="60 FPS"
          statusText="FastAPI Port 8001 · SQLite Async · Zero Horizontal Overflow"
          secondaryContent="Zero-Trust Protocol verified. 242/242 tests passed."
          canFlip={true}
          flipInterval={9500}
          onClick={() => onOpenApp("dashboard")}
          delay={0.46}
        />
      </div>
    </div>
  );
}
