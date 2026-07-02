import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../context/OSContext";

export default function NotificationCenter() {
  const { notifOpen, setNotifOpen, notifications, clearNotifications } = useOS();
  if (!notifOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-black/40"
        onClick={() => setNotifOpen(false)}
        data-testid="notification-center"
      >
        <motion.div
          initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
          transition={{ type: "spring", damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-14 bottom-3 w-80 glass rounded-2xl overflow-hidden window-shadow flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <div className="font-heading font-bold text-white">Notifications</div>
              <div className="mono-label opacity-60">// {notifications.length} pending</div>
            </div>
            <button onClick={clearNotifications} className="neon-btn !py-1 !px-2 text-[10px]">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notifications.length === 0 && (
              <div className="text-center text-slate-500 text-sm pt-12">
                <i className="fa-regular fa-bell-slash text-3xl opacity-30"></i>
                <div className="mt-3">All quiet on the network.</div>
              </div>
            )}
            {notifications.map((n) => (
              <div key={n.id} className="glass-light rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full`} style={{ background: n.type === "error" ? "#FF003C" : n.type === "success" ? "#39FF14" : "#00F0FF" }} />
                  <div className="text-sm font-medium text-white">{n.title}</div>
                </div>
                <div className="text-xs text-slate-400">{n.message}</div>
                <div className="mono-label opacity-50 mt-1">{new Date(n.time).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
