import React, { useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";

export default function AuthScreen() {
  const { login, signup } = useOS();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, name);
      toast.success(`Welcome ${mode === "login" ? "back" : "to OmniverseOS"}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#05050A] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-aurora" />
      <div className="absolute inset-0 scanline" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass rounded-2xl p-8 window-shadow">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00F0FF,#FF003C)" }}>
              <i className="fa-solid fa-infinity text-black"></i>
            </div>
            <div>
              <div className="font-heading text-2xl font-black tracking-tight text-white">OmniverseOS</div>
              <div className="mono-label">// AI Operating System v1.0</div>
            </div>
          </div>

          <p className="text-slate-400 text-sm mt-4 mb-6 leading-relaxed">
            {mode === "login" ? "Authenticate to enter your workspace." : "Create your sovereign workspace."}
          </p>

          <form onSubmit={submit} className="space-y-3" data-testid="auth-form">
            {mode === "signup" && (
              <div>
                <label className="mono-label block mb-1">Name</label>
                <input data-testid="auth-name-input" required value={name} onChange={(e) => setName(e.target.value)} className="input-cyber" placeholder="Neo Anderson" />
              </div>
            )}
            <div>
              <label className="mono-label block mb-1">Email</label>
              <input data-testid="auth-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-cyber" placeholder="you@omniverse.io" />
            </div>
            <div>
              <label className="mono-label block mb-1">Password</label>
              <input data-testid="auth-password-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
            </div>

            <button data-testid="auth-submit-button" disabled={busy} type="submit" className="neon-btn primary w-full justify-center mt-2 py-3">
              {busy ? "…" : mode === "login" ? "Enter Workspace" : "Create Workspace"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-400">
            {mode === "login" ? "New here?" : "Already authenticated?"}{" "}
            <button data-testid="auth-toggle-mode" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-[#00F0FF] hover:underline">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>

        <div className="text-center mt-4 mono-label opacity-60">
          // Press Cmd+K anywhere to open the command palette
        </div>
      </motion.div>
    </div>
  );
}
