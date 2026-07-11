import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function CalendarWidget() {
  const [events, setEvents] = useState([]);
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();

  useEffect(() => {
    api.get("/events").then((r) => setEvents(r.data || [])).catch(() => {});
  }, []);

  // Build mini-calendar grid
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayDay  = today.getDate();

  // Next upcoming event
  const upcoming = events
    .filter((e) => new Date(e.date) >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  return (
    <div className="w-full h-full flex flex-col px-3 py-2 gap-2 select-none">
      <div className="text-[11px] font-mono font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
        {monthName}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className="aspect-square flex items-center justify-center text-[10px] font-mono rounded-full"
            style={{
              color: d === todayDay ? "#000" : d ? "rgba(255,255,255,0.55)" : "transparent",
              background: d === todayDay ? "#00F0FF" : "transparent",
              boxShadow: d === todayDay ? "0 0 10px rgba(0,240,255,0.6)" : "none",
              fontWeight: d === todayDay ? 700 : 400,
            }}
          >
            {d || ""}
          </div>
        ))}
      </div>

      {/* Upcoming event */}
      {upcoming ? (
        <div
          className="px-2 py-1.5 rounded-lg text-[10px] font-mono"
          style={{ background: "rgba(255,0,60,0.1)", border: "1px solid rgba(255,0,60,0.2)", color: "#FF003C" }}
        >
          <i className="fa-solid fa-circle text-[6px] mr-1.5" />
          {upcoming.title}
          <span className="ml-1 opacity-50">{new Date(upcoming.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      ) : (
        <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
          No upcoming events
        </div>
      )}
    </div>
  );
}
