import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";
import { authApi } from "../lib/api";

export default function AuthScreen() {
  const { login, signup } = useOS();
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot" | "reset"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy]         = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Welcome back to OmniverseOS");
      } else if (mode === "signup") {
        await signup(email, password, name);
        toast.success("Welcome to OmniverseOS");
      } else if (mode === "forgot") {
        const res = await authApi.forgotPassword(email);
        setForgotSent(true);
        toast.success("Reset instructions sent if email is registered");
        if (res?.dev_token) {
          console.info("[Dev] Reset token:", res.dev_token); // dev only
          setResetToken(res.dev_token);
          setTimeout(() => setMode("reset"), 1500);
        }
      } else if (mode === "reset") {
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        await authApi.resetPassword(resetToken, newPassword);
        toast.success("Password reset! You can now sign in.");
        setMode("login");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const slideVariants = {
    enter:  { opacity: 0, y: 12, scale: 0.98 },
    center: { opacity: 1, y: 0,  scale: 1    },
    exit:   { opacity: 0, y: -8, scale: 0.98 },
  };

  const headings = {
    login:  { title: "Welcome back",    sub: "Sign in to enter your workspace." },
    signup: { title: "Create account",  sub: "Create your OmniverseOS workspace."     },
    forgot: { title: "Reset password",  sub: "Enter your email to receive a reset link." },
    reset:  { title: "New password",    sub: "Choose a strong new password."          },
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
          {/* Logo row */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00F0FF,#FF003C)" }}>
              <i className="fa-solid fa-infinity text-black" />
            </div>
            <div>
              <div className="font-heading text-2xl font-black tracking-tight text-white">OmniverseOS</div>
              <div className="mono-label">// AI Operating System v1.0</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <h2 className="font-heading text-2xl font-bold text-white mt-5 mb-1">
                {headings[mode]?.title}
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                {headings[mode]?.sub}
              </p>

              {/* Forgot sent confirmation */}
              {mode === "forgot" && forgotSent ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.3)" }}>
                    <i className="fa-solid fa-envelope-circle-check text-2xl text-[#00F0FF]" />
                  </div>
                  <p className="text-white font-semibold mb-1">Check your inbox</p>
                  <p className="text-slate-400 text-sm">If that email is registered, reset instructions are on the way.</p>
                  <button type="button" onClick={() => { setForgotSent(false); setMode("login"); }} className="mt-5 text-[#00F0FF] hover:underline text-sm">
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-3" data-testid="auth-form">
                  {/* Signup: name field */}
                  {mode === "signup" && (
                    <div>
                      <label className="mono-label block mb-1">Name</label>
                      <input data-testid="auth-name-input" required value={name} onChange={(e) => setName(e.target.value)} className="input-cyber" placeholder="Neo Anderson" />
                    </div>
                  )}

                  {/* Email — shown in login, signup, forgot */}
                  {mode !== "reset" && (
                    <div>
                      <label className="mono-label block mb-1">Email</label>
                      <input data-testid="auth-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-cyber" placeholder="you@omniverse.io" />
                    </div>
                  )}

                  {/* Password — shown in login, signup */}
                  {(mode === "login" || mode === "signup") && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="mono-label">Password</label>
                        {mode === "login" && (
                          <button type="button" onClick={() => { setMode("forgot"); setForgotSent(false); }} className="text-[10px] font-mono text-slate-400 hover:text-[#00F0FF] transition-colors">
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <input data-testid="auth-password-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
                    </div>
                  )}

                  {/* Reset token — shown in reset mode */}
                  {mode === "reset" && (
                    <>
                      <div>
                        <label className="mono-label block mb-1">Reset Token</label>
                        <input required value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="input-cyber" placeholder="Paste reset token" />
                      </div>
                      <div>
                        <label className="mono-label block mb-1">New Password</label>
                        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
                      </div>
                      <div>
                        <label className="mono-label block mb-1">Confirm Password</label>
                        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
                      </div>
                    </>
                  )}

                  <button data-testid="auth-submit-button" disabled={busy} type="submit" className="neon-btn primary w-full justify-center mt-2 py-3">
                    {busy ? "…"
                      : mode === "login"   ? "Enter Workspace"
                      : mode === "signup"  ? "Create Workspace"
                      : mode === "forgot"  ? "Send Reset Link"
                      : "Reset Password"}
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom toggle row */}
          {!forgotSent && (
            <div className="mt-5 text-center text-sm text-slate-400">
              {mode === "login" && (
                <>New here?{" "}<button data-testid="auth-toggle-mode" type="button" onClick={() => setMode("signup")} className="text-[#00F0FF] hover:underline">Create an account</button></>
              )}
              {mode === "signup" && (
                <>Already have an account?{" "}<button data-testid="auth-toggle-mode" type="button" onClick={() => setMode("login")} className="text-[#00F0FF] hover:underline">Sign in</button></>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <button type="button" onClick={() => { setMode("login"); setForgotSent(false); }} className="text-[#00F0FF] hover:underline">
                  ← Back to sign in
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-center mt-4 mono-label opacity-60">
          // Press ⌘K anywhere to open the command palette
        </div>
      </motion.div>
    </div>
  );
}
