import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";
import { authApi } from "../lib/api";
import AuthBackground from "./Auth/AuthBackground";
import AuthCommandPalette from "./Auth/AuthCommandPalette";

export default function AuthScreen() {
  const { login, signup } = useOS();
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [authSuccessSequence, setAuthSuccessSequence] = useState(false);
  const [authStepText, setAuthStepText] = useState("");

  const [forgotSent, setForgotSent] = useState(false);
  const [slowMsg, setSlowMsg] = useState(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Reaction feedback states
  const [focusedField, setFocusedField] = useState(null);

  // Mouse Parallax Position
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  // Remembered Identity
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("omniverse_last_name") || localStorage.getItem("omniverse_user");
      if (stored) {
        setSavedName(stored.replace(/["']/g, ""));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleMouseMove = (e) => {
    setMousePos({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  };

  // Sound synthesis utility
  const playSound = (freq = 440, duration = 0.05) => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore audio context restrictions
    }
  };

  // Keyboard shortcut listener for Command Palette (⌘K or /)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      } else if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const timerA = useRef(null);
  const timerB = useRef(null);

  useEffect(() => {
    if (busy) {
      timerA.current = setTimeout(() => setSlowMsg("Connecting to server…"), 4000);
      timerB.current = setTimeout(
        () => setSlowMsg("Server is starting up — this can take up to a minute on first login."),
        14000
      );
    } else {
      clearTimeout(timerA.current);
      clearTimeout(timerB.current);
      setSlowMsg(null);
    }
    return () => {
      clearTimeout(timerA.current);
      clearTimeout(timerB.current);
    };
  }, [busy]);

  // Derived system reaction message
  const getSystemReaction = () => {
    if (busy) return "VERIFYING IDENTITY & RESTORING CONTEXT...";
    if (focusedField === "email") {
      if (email.includes("@") && email.includes(".")) return "IDENTITY FORMAT VERIFIED";
      if (email.length > 0) return "IDENTITY SIGNAL DETECTED";
      return "IDENTITY CHANNEL ACTIVE";
    }
    if (focusedField === "password") {
      if (password.length >= 4) return "ENCRYPTED CREDENTIALS RECEIVED";
      return "SECURE CREDENTIAL CHANNEL OPEN";
    }
    if (focusedField === "name") {
      return "USER DESIGNATION CHANNEL OPEN";
    }
    return "IDENTITY UNRECOGNIZED → AWAITING AUTHENTICATION";
  };

  const submit = async (e) => {
    e.preventDefault();
    playSound(600, 0.1);
    setBusy(true);

    try {
      if (mode === "login") {
        await login(email, password);
        triggerSuccessHandshake("Welcome back to OmniverseOS");
      } else if (mode === "signup") {
        await signup(email, password, name);
        triggerSuccessHandshake("Welcome to OmniverseOS");
      } else if (mode === "forgot") {
        const res = await authApi.forgotPassword(email);
        setForgotSent(true);
        toast.success("Reset instructions sent if email is registered");
        if (res?.dev_token) {
          setResetToken(res.dev_token);
          setTimeout(() => setMode("reset"), 1500);
        }
        setBusy(false);
      } else if (mode === "reset") {
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match");
          setBusy(false);
          return;
        }
        await authApi.resetPassword(resetToken, newPassword);
        toast.success("Password reset! You can now sign in.");
        setMode("login");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setBusy(false);
      }
    } catch (err) {
      setBusy(false);
      const isTimeout = err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout");
      toast.error(
        isTimeout
          ? "Server is starting up — please wait a moment and try again."
          : err?.response?.data?.detail || "Something went wrong"
      );
    }
  };

  const triggerSuccessHandshake = (msg) => {
    setAuthSuccessSequence(true);
    setAuthStepText("✓ IDENTITY VERIFIED");
    playSound(800, 0.15);

    setTimeout(() => {
      setAuthStepText("✓ CORTEX MEMORY LINKED");
      playSound(1000, 0.15);
    }, 250);

    setTimeout(() => {
      setAuthStepText("✓ PERSONAL ENVIRONMENT RESTORED");
      playSound(1200, 0.2);
    }, 500);

    setTimeout(() => {
      setAuthStepText("WELCOME BACK.");
      toast.success(msg);
    }, 750);
  };

  const handleCommandSelect = (cmdId) => {
    playSound(520, 0.08);
    if (cmdId === "login") setMode("login");
    if (cmdId === "signup") setMode("signup");
    if (cmdId === "forgot") setMode("forgot");
    if (cmdId === "guest") {
      setEmail("demo@omniverse.io");
      setPassword("demo123");
      setMode("login");
      toast.info("Guest credentials loaded. Press Initialize to enter.");
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#030408",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Outfit', sans-serif",
      }}
      data-testid="auth-screen"
    >
      {/* Living Intelligence Canvas Background */}
      <AuthBackground mousePos={mousePos} />

      {/* Audio Toggle Button */}
      <button
        onClick={() => setAudioEnabled(!audioEnabled)}
        title={audioEnabled ? "Disable Audio Synthesis" : "Enable Subtle Audio Feedback"}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 20,
          padding: "8px 14px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: audioEnabled ? "#00F0FF" : "rgba(255,255,255,0.4)",
          fontSize: 12,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          backdropFilter: "blur(12px)",
        }}
      >
        <i className={`fa-solid ${audioEnabled ? "fa-volume-high" : "fa-volume-xmark"}`} />
        <span style={{ fontSize: 10, fontFamily: "monospace" }}>{audioEnabled ? "AUDIO ON" : "MUTED"}</span>
      </button>

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 440,
          margin: "0 16px",
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: 32,
            borderRadius: 24,
            borderColor: "rgba(0, 240, 255, 0.25)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 240, 255, 0.15)",
            backdropFilter: "blur(30px)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle scanning light bar across top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #00F0FF, #A855F7, transparent)",
            }}
          />

          {/* System Status & Handshake Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #00F0FF, #FF003C)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)",
                }}
              >
                <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
                  OmniverseOS
                </div>
                <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)" }}>
                  // IDENTITY GATEWAY
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 20, background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.25)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#39FF14", boxShadow: "0 0 8px #39FF14" }} />
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#39FF14", fontWeight: 700 }}>ONLINE</span>
            </div>
          </div>

          {/* Dynamic System Reaction Indicator Banner */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(0, 240, 255, 0.05)",
              border: "1px solid rgba(0, 240, 255, 0.15)",
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#00F0FF",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="fa-solid fa-microchip fa-pulse" style={{ fontSize: 11 }} />
            <span>{getSystemReaction()}</span>
          </div>

          {/* Heading & Subtitle */}
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
            {mode === "login"
              ? savedName ? `Welcome back, ${savedName}` : "Welcome back"
              : mode === "signup"
              ? "Create Your Omniverse"
              : mode === "forgot"
              ? "Account Recovery"
              : "Reset Password"}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 20px", lineHeight: 1.4 }}>
            {mode === "login"
              ? "Authenticate to restore your personal intelligence environment."
              : mode === "signup"
              ? "Your environment will learn from your decisions, projects, and goals."
              : mode === "forgot"
              ? "Enter your email to transmit account recovery credentials."
              : "Choose a strong new password to secure your workspace."}
          </p>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            {authSuccessSequence ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: 24,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(0,240,255,0.15)", border: "1px solid #00F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fa-solid fa-check text-xl" style={{ color: "#00F0FF" }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#00F0FF", fontFamily: "monospace" }}>
                  {authStepText}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  Constructing intelligence workspace…
                </div>
              </motion.div>
            ) : mode === "forgot" && forgotSent ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    margin: "0 auto 12px",
                    background: "rgba(0,240,255,0.1)",
                    border: "1px solid rgba(0,240,255,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="fa-solid fa-envelope-circle-check text-2xl" style={{ color: "#00F0FF" }} />
                </div>
                <p style={{ color: "#fff", fontWeight: 700, margin: "0 0 4px" }}>Check your inbox</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Reset instructions are on the way.</p>
                <button
                  type="button"
                  onClick={() => { setForgotSent(false); setMode("login"); }}
                  style={{ marginTop: 16, color: "#00F0FF", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="auth-form">
                {/* Signup: Name Input */}
                {mode === "signup" && (
                  <div>
                    <label style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>
                      DESIGNATION (NAME)
                    </label>
                    <input
                      data-testid="auth-name-input"
                      required
                      value={name}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setName(e.target.value)}
                      className="input-cyber"
                      placeholder="e.g. Neo Anderson"
                    />
                  </div>
                )}

                {/* Email Input */}
                {mode !== "reset" && (
                  <div>
                    <label style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>
                      IDENTITY (EMAIL)
                    </label>
                    <input
                      data-testid="auth-email-input"
                      type="email"
                      required
                      value={email}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-cyber"
                      placeholder="you@omniverse.io"
                    />
                  </div>
                )}

                {/* Password Input */}
                {(mode === "login" || mode === "signup") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
                        CREDENTIAL (PASSWORD)
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => { setMode("forgot"); setForgotSent(false); }}
                          style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        data-testid="auth-password-input"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-cyber"
                        style={{ paddingRight: 36 }}
                        placeholder="••••••••"
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "rgba(255,255,255,0.4)",
                          cursor: "pointer",
                        }}
                      >
                        <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Reset Token & Passwords */}
                {mode === "reset" && (
                  <>
                    <div>
                      <label style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>RESET TOKEN</label>
                      <input required value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="input-cyber" placeholder="Paste reset token" />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>NEW PASSWORD</label>
                      <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>CONFIRM PASSWORD</label>
                      <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-cyber" placeholder="••••••••" minLength={4} />
                    </div>
                  </>
                )}

                {/* Reactive Energy Button */}
                <motion.button
                  data-testid="auth-submit-button"
                  disabled={busy}
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    width: "100%",
                    padding: "13px 20px",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #00F0FF, #A855F7)",
                    color: "#000",
                    fontSize: 13,
                    fontWeight: 900,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 0 24px rgba(0, 240, 255, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8,
                    transition: "all 0.2s ease",
                  }}
                >
                  {busy ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" />
                      AUTHENTICATING…
                    </>
                  ) : mode === "login" ? (
                    <>
                      INITIALIZE OMNIVERSE <i className="fa-solid fa-arrow-right" />
                    </>
                  ) : mode === "signup" ? (
                    <>
                      CREATE YOUR OMNIVERSE <i className="fa-solid fa-arrow-right" />
                    </>
                  ) : mode === "forgot" ? (
                    "SEND RESET LINK"
                  ) : (
                    "RESET PASSWORD"
                  )}
                </motion.button>

                {busy && slowMsg && (
                  <p style={{ fontSize: 11, textAlign: "center", fontFamily: "monospace", color: "rgba(0,240,255,0.7)", margin: "4px 0 0" }}>
                    {slowMsg}
                  </p>
                )}
              </form>
            )}
          </AnimatePresence>

          {/* Mode Switch Row */}
          {!forgotSent && !authSuccessSequence && (
            <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              {mode === "login" && (
                <>
                  New here?{" "}
                  <button
                    data-testid="auth-toggle-mode"
                    type="button"
                    onClick={() => { playSound(480, 0.05); setMode("signup"); }}
                    style={{ color: "#00F0FF", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                  >
                    Create an account
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button
                    data-testid="auth-toggle-mode"
                    type="button"
                    onClick={() => { playSound(480, 0.05); setMode("login"); }}
                    style={{ color: "#00F0FF", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                  >
                    Sign in
                  </button>
                </>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <button
                  type="button"
                  onClick={() => { playSound(480, 0.05); setMode("login"); setForgotSent(false); }}
                  style={{ color: "#00F0FF", background: "none", border: "none", cursor: "pointer" }}
                >
                  ← Back to sign in
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Command Palette Bar Trigger */}
        <div
          onClick={() => { playSound(500, 0.05); setCmdOpen(true); }}
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(255,255,255,0.45)",
            cursor: "pointer",
            padding: "8px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          data-testid="auth-command-palette-trigger"
        >
          <i className="fa-solid fa-terminal" style={{ color: "#00F0FF" }} />
          <span>⌘ ENTER COMMAND OR PRESS /</span>
        </div>
      </motion.div>

      {/* Command Palette Overlay */}
      <AuthCommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelectCommand={handleCommandSelect}
      />
    </div>
  );
}
