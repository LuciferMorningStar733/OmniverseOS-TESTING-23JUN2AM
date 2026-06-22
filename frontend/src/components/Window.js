import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { getApp } from "../lib/apps";
import ErrorBoundary from "./ErrorBoundary";

export default function Window({ win, children }) {
  const { closeWindow, focusWindow, updateWindow, toggleMaximize, minimize, activeId } = useOS();
  const app = getApp(win.app);
  const isActive = activeId === win.id;
  
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (win.minimized) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: win.x, y: win.y, width: win.w, height: win.h }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: win.maximized ? 8 : win.x,
        y: win.maximized ? 0 : win.y,
        width: win.maximized ? viewport.w - 16 : win.w,
        height: win.maximized ? viewport.h - 96 : win.h
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      drag={!win.maximized}
      dragHandle=".window-handle"
      dragMomentum={false}
      dragConstraints={{ 
        top: 0, 
        left: -win.w + 100, 
        right: viewport.w - 100, 
        bottom: viewport.h - 100 
      }}
      onDragEnd={(_, info) => {
        updateWindow(win.id, { 
          x: win.x + info.offset.x, 
          y: win.y + info.offset.y 
        });
      }}
      onMouseDown={() => !isActive && focusWindow(win.id)}
      className={`absolute glass rounded-2xl overflow-hidden window-shadow ${isActive ? "ring-1 ring-[#00F0FF]/30" : "ring-1 ring-white/10"}`}
      style={{ zIndex: win.z, top: 0, left: 0 }} 
      data-testid={`window-${win.app}`}
    >
      <div className="window-handle h-11 flex items-center justify-between px-3 border-b border-white/10 bg-white/[0.03] cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <button
            data-testid={`window-close-${win.app}`}
            onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
            className="w-3 h-3 rounded-full bg-[#FF003C] hover:shadow-[0_0_8px_#FF003C] transition"
            title="Close"
          />
          <button
            data-testid={`window-min-${win.app}`}
            onClick={(e) => { e.stopPropagation(); minimize(win.id); }}
            className="w-3 h-3 rounded-full bg-[#FCEE09] hover:shadow-[0_0_8px_#FCEE09] transition"
            title="Minimize"
          />
          <button
            data-testid={`window-max-${win.app}`}
            onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
            className="w-3 h-3 rounded-full bg-[#39FF14] hover:shadow-[0_0_8px_#39FF14] transition"
            title="Maximize"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <i className={`fa-solid ${app.icon}`} style={{ color: app.color }}></i>
          <span className="font-mono uppercase tracking-widest text-slate-300">{app.name}</span>
        </div>
        <div className="w-16" />
      </div>

      <div className="w-full h-[calc(100%-44px)] overflow-hidden">
        <ErrorBoundary>
          <React.Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="font-mono text-xs tracking-widest text-[#00F0FF] animate-pulse">// LOADING MODULE…</div>
            </div>
          }>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </motion.div>
  );
}