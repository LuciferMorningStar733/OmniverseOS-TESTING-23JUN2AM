import React, { useState, useEffect, useCallback } from "react";

export function SystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/health");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || "Failed to fetch system telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const isHealthy = data?.status === "healthy";

  return (
    <div className="h-full w-full bg-[#060810] text-slate-100 p-5 overflow-y-auto font-sans flex flex-col gap-5">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
            <i className="fa-solid fa-heart-pulse text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-white">System Telemetry & Health</h2>
            <p className="text-xs font-mono text-slate-400">OmniverseOS Telemetry Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-[#00F0FF]/10 hover:border-[#00F0FF]/30 hover:text-[#00F0FF] transition-all flex items-center gap-1.5"
          >
            <i className={`fa-solid fa-rotate ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <div className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 border ${
            isHealthy
              ? "bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isHealthy ? "bg-[#39FF14] animate-pulse" : "bg-amber-400"}`} />
            <span className="uppercase font-bold tracking-wider">{data?.status || "Connecting..."}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation text-sm" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Database Latency Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Database (MongoDB)</span>
            <i className="fa-solid fa-database text-[#00F0FF]" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {data?.database?.latency_ms ? `${data.database.latency_ms} ms` : "--"}
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Status:</span>
            <span className="text-[#39FF14]">{data?.database?.status || "Unknown"}</span>
          </div>
        </div>

        {/* Rate Limiter Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Rate Limiter</span>
            <i className="fa-solid fa-[#00F0FF] fa-shield-halved" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#00F0FF]">
            {data?.rate_limiter?.type || "--"}
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Mode:</span>
            <span className="text-slate-200">{data?.rate_limiter?.mode || "Active"}</span>
          </div>
        </div>

        {/* Collections Overview */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Indexed Records</span>
            <i className="fa-solid fa-[#00F0FF] fa-[#00F0FF] fa-folder-tree" />
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-200 mt-1">
            <div>
              <span className="text-slate-400 block text-[10px]">Notes</span>
              <span className="font-bold text-white">{data?.database?.collections?.notes ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Tasks</span>
              <span className="font-bold text-white">{data?.database?.collections?.tasks ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Memories</span>
              <span className="font-bold text-[#00F0FF]">{data?.database?.collections?.memories ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Provider Health Matrix */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col gap-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i className="fa-solid fa-microchip text-[#00F0FF]" />
          <span>AI Provider Cluster Matrix</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data?.ai_providers && Object.entries(data.ai_providers).map(([key, prov]) => (
            <div key={key} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-white capitalize">{key}</div>
                <div className="text-[10px] font-mono text-slate-400">{prov.display || key}</div>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${prov.available ? "bg-[#39FF14] shadow-[0_0_8px_#39FF14]" : "bg-red-500"}`} />
            </div>
          ))}
        </div>
      </div>

      {lastRefreshed && (
        <div className="text-right text-[10px] font-mono text-slate-500">
          Last updated: {lastRefreshed}
        </div>
      )}
    </div>
  );
}

export default SystemHealth;
