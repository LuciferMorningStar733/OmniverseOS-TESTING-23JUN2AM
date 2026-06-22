import React from "react";
import { useOS } from "../context/OSContext";

export default function Settings() {
  const { user, logout } = useOS();
  return (
    <div className="p-6 text-white" data-testid="settings-app">
      <div className="mono-label">// Profile</div>
      <h2 className="font-heading text-2xl font-bold mb-5">Settings</h2>

      <div className="glass-light rounded-xl p-5 mb-3 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#FF003C] flex items-center justify-center text-2xl font-bold text-black">{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <div className="font-heading text-lg font-bold">{user?.name}</div>
          <div className="text-sm text-slate-400">{user?.email}</div>
          <div className="mono-label opacity-60 mt-1">Joined {new Date(user?.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="glass-light rounded-xl p-5 space-y-3 mb-3">
        <div className="mono-label">// System</div>
        {[
          ["Theme", "Cyberpunk Dark"],
          ["AI Model", "Claude Sonnet 4.6"],
          ["Storage", "MongoDB"],
          ["Build", "OmniverseOS v1.0.0"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm py-1">
            <span className="text-slate-400">{k}</span>
            <span className="font-mono text-[#00F0FF]">{v}</span>
          </div>
        ))}
      </div>

      <button onClick={logout} className="neon-btn danger w-full">
        <i className="fa-solid fa-right-from-bracket mr-2"></i>Logout
      </button>
    </div>
  );
}
