import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PROVIDER_LABELS } from "../../lib/api";

const STATUS_COLOR = {
  healthy:       "#39FF14",
  cooldown:      "#FCEE09",
  unavailable:   "#FF003C",
  offline:       "#FF003C",
  rate_limited:  "#FCEE09",
};

export default function SystemStatusWidget() {
  const [providers, setProviders] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    const fetchProviders = () => {
      const t0 = Date.now();
      api.get("/ai/providers")
        .then((r) => { setProviders(r.data); setLatency(Date.now() - t0); })
        .catch(() => {});
    };
    fetchProviders();
    const iv = setInterval(fetchProviders, 30000);
    return () => clearInterval(iv);
  }, []);

  const providerList = providers
    ? Object.entries(providers).filter(([, v]) => v.hasKey)
    : [];

  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-1.5 select-none">
      {/* Online status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: online ? "#39FF14" : "#FF003C", boxShadow: `0 0 6px ${online ? "#39FF14" : "#FF003C"}` }}
          />
          <span className="text-[10px] font-mono" style={{ color: online ? "#39FF14" : "#FF003C" }}>
            {online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        {latency !== null && (
          <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
            {latency}ms
          </span>
        )}
      </div>

      <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Provider health */}
      <div className="flex flex-col gap-1 flex-1">
        {providerList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-[#00F0FF] animate-ping" />
          </div>
        ) : (
          providerList.map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                {PROVIDER_LABELS[key] || key}
              </span>
              <div className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: STATUS_COLOR[val.status] || "#94A3B8",
                    boxShadow: `0 0 4px ${STATUS_COLOR[val.status] || "#94A3B8"}80`,
                  }}
                />
                <span
                  className="text-[9px] font-mono"
                  style={{ color: STATUS_COLOR[val.status] || "#94A3B8" }}
                >
                  {val.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
