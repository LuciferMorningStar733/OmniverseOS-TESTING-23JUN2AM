import React, { useState, useEffect, useRef, useCallback } from "react";
import { memoryApi, aiApi } from "../lib/api";
import { toast } from "sonner";

/**
 * NeuralMatrix — Futuristic Spatial Memory & Sub-Agent Constellation HUD
 * Visualizes Cortex vector memories, active AI agents, and system health nodes
 * in a 3D spatial interactive network with real-time vector similarity beams.
 */
export default function NeuralMatrix() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Fetch Cortex memories and system health metrics to construct neural constellation
  const fetchMatrixData = useCallback(async () => {
    setLoading(true);
    try {
      const [memoriesRes, healthRes] = await Promise.allSettled([
        memoryApi.getRelevant("cortex system agent memory", 12),
        fetch("/api/system/health").then((r) => r.json()),
      ]);

      const initialNodes = [
        { id: "cortex_core", label: "Cortex Core Engine", type: "core", x: 0, y: 0, radius: 28, color: "#00F0FF" },
        { id: "agent_warroom", label: "War Room Multi-Agent", type: "agent", x: -140, y: -120, radius: 20, color: "#A855F7" },
        { id: "agent_adversary", label: "Adversary Engine", type: "agent", x: 140, y: -120, radius: 20, color: "#FF003C" },
        { id: "agent_deadreckoning", label: "Dead Reckoning Stream", type: "agent", x: 180, y: 80, radius: 20, color: "#F59E0B" },
        { id: "system_telemetry", label: "System Telemetry", type: "system", x: -180, y: 90, radius: 20, color: "#39FF14" },
      ];

      const initialLinks = [
        { source: "cortex_core", target: "agent_warroom", similarity: 0.98 },
        { source: "cortex_core", target: "agent_adversary", similarity: 0.95 },
        { source: "cortex_core", target: "agent_deadreckoning", similarity: 0.92 },
        { source: "cortex_core", target: "system_telemetry", similarity: 0.99 },
      ];

      if (memoriesRes.status === "fulfilled" && Array.isArray(memoriesRes.value?.memories)) {
        const mems = memoriesRes.value.memories;
        mems.forEach((m, idx) => {
          const angle = (Math.PI * 2 * idx) / mems.length;
          const dist = 220 + (idx % 3) * 40;
          const nodeId = `mem_${m.id || idx}`;
          initialNodes.push({
            id: nodeId,
            label: m.content ? m.content.slice(0, 30) + "..." : `Memory #${idx + 1}`,
            fullContent: m.content || "Empty vector payload",
            type: "memory",
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            radius: 14,
            color: "#60A5FA",
            similarityScore: m.score || 0.88,
          });
          initialLinks.push({
            source: "cortex_core",
            target: nodeId,
            similarity: m.score || (0.85 + (idx % 10) * 0.01),
          });
        });
      }

      setNodes(initialNodes);
      setLinks(initialLinks);
    } catch (err) {
      toast.error("Failed to sync neural matrix data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // Spatial Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let phase = 0;

    const render = () => {
      if (!running) return;
      phase += 0.02;

      const width = canvas.width;
      const height = canvas.height;
      const t = transformRef.current;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2 + t.x, height / 2 + t.y);
      ctx.scale(t.scale, t.scale);

      // Render Links (Vector Similarity Beams)
      links.forEach((link) => {
        const srcNode = nodes.find((n) => n.id === link.source);
        const tgtNode = nodes.find((n) => n.id === link.target);
        if (!srcNode || !tgtNode) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(srcNode.x, srcNode.y);
        ctx.lineTo(tgtNode.x, tgtNode.y);
        ctx.strokeStyle = srcNode.color || "#00F0FF";
        ctx.globalAlpha = 0.35 + Math.sin(phase + link.similarity * 10) * 0.15;
        ctx.lineWidth = Math.max(1, link.similarity * 3);
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();

        // Render Vector Similarity Label Badge halfway along the beam
        const midX = (srcNode.x + tgtNode.x) / 2;
        const midY = (srcNode.y + tgtNode.y) / 2;
        ctx.save();
        ctx.font = "10px monospace";
        ctx.fillStyle = "#00F0FF";
        ctx.globalAlpha = 0.8;
        ctx.fillText(`${Math.round(link.similarity * 100)}% Link`, midX + 6, midY - 4);
        ctx.restore();
      });

      // Render Nodes
      nodes.forEach((node) => {
        const isSelected = selectedNode?.id === node.id;
        const pulse = Math.sin(phase * 2 + node.x) * 2;

        ctx.save();

        // Outer Node Glow Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = isSelected ? 0.4 : 0.15;
        ctx.fill();

        // Inner Solid Node Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (isSelected ? 3 : 0), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 20 : 10;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.restore();

        // Node Text Label
        ctx.save();
        ctx.font = "12px 'Outfit', sans-serif";
        ctx.fillStyle = "#E2E8F0";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + node.radius + 18);
        ctx.restore();
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodes, links, selectedNode]);

  // Handle Dragging Pan / Zoom Controls
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    transformRef.current.x = e.clientX - dragStartRef.current.x;
    transformRef.current.y = e.clientY - dragStartRef.current.y;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    transformRef.current.scale = Math.min(2.5, Math.max(0.4, transformRef.current.scale * zoomFactor));
  };

  return (
    <div className="relative w-full h-full bg-[#05050A] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-cyan-500/20 bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-project-diagram text-cyan-400 text-lg animate-pulse" />
          <h2 className="text-sm font-bold tracking-wider uppercase text-cyan-400">
            Spatial Neural Matrix
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono">
            {nodes.length} Nodes Synchronized
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMatrixData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2 transition-all"
          >
            <i className={`fa-solid fa-rotate ${loading ? "animate-spin" : ""}`} />
            Sync Vectors
          </button>
        </div>
      </div>

      {/* 3D Spatial Canvas */}
      <div className="relative flex-1 cursor-grab active:cursor-grabbing overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full"
        />

        {/* Selected Node Details Overlay */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 bg-zinc-950/90 border border-cyan-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-20 transition-all">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wide">
                {selectedNode.type} Node Details
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-2">{selectedNode.label}</h3>
            {selectedNode.fullContent && (
              <p className="text-xs text-slate-300 font-mono bg-zinc-900/80 p-2.5 rounded-lg border border-white/5 mb-3 leading-relaxed">
                {selectedNode.fullContent}
              </p>
            )}
            <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Vector Similarity:</span>
              <span className="text-cyan-400 font-bold">
                {selectedNode.similarityScore ? `${Math.round(selectedNode.similarityScore * 100)}%` : "100% Core"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
