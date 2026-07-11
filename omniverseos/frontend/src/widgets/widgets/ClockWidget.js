import React, { useEffect, useState } from "react";

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const day = now.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const date = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2 select-none">
      <div
        className="font-mono font-bold leading-none tabular-nums"
        style={{ fontSize: 34, color: "#00F0FF", textShadow: "0 0 20px rgba(0,240,255,0.5)" }}
      >
        {hh}:{mm}
      </div>
      <div
        className="font-mono text-xs tabular-nums"
        style={{ color: "rgba(0,240,255,0.45)" }}
      >
        :{ss}
      </div>
      <div className="text-[10px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
        {day} · {date}
      </div>
    </div>
  );
}
