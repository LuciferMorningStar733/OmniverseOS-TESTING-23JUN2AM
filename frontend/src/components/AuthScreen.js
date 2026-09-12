import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../context/OSContext";
import { toast } from "sonner";
import { authApi } from "../lib/api";
import { Omniverse3DEngine } from "./3D/Omniverse3DEngine";
import { CortexCommandSurface } from "./3D/CortexCommandSurface";
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

  // 3D Engine State
  const [scrollProgress, setScrollProgress] = useState(0);
  const [highlightedApps, setHighlightedApps] = useState([]);
  const containerRef = useRef(null);

  // Reaction feedback states
  const [focusedField, setFocusedField] = useState(null);

  // Mounted guard
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track scroll position inside 3D scroll container
  const handleScroll = (e) => {
    const el = e.target;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(el.scrollTop / maxScroll);
    }
  };

  const scrollToGateway = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Mouse Parallax Position
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
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
    toast.success(msg);
    if (!isMountedRef.current) return;
    setAuthSuccessSequence(true);
    setAuthStepText("✓ IDENTITY VERIFIED");
    playSound(800, 0.15);

    setTimeout(() => {
      if (isMountedRef.current) {
        setAuthStepText("✓ CORTEX MEMORY LINKED");
        playSound(1000, 0.15);
      }
    }, 250);

    setTimeout(() => {
      if (isMountedRef.current) {
        setAuthStepText("✓ PERSONAL ENVIRONMENT RESTORED");
        playSound(1200, 0.2);
      }
    }, 500);

    setTimeout(() => {
      if (isMountedRef.current) {
        setAuthStepText("WELCOME BACK.");
      }
    }, 750);
  };

  const handleCommandSelect = (cmdId) => {
    playSound(520, 0.08);
    if (cmdId === "login") { setMode("login"); scrollToGateway(); }
    if (cmdId === "signup") { setMode("signup"); scrollToGateway(); }
    if (cmdId === "forgot") { setMode("forgot"); scrollToGateway(); }
    if (cmdId === "guest") {
      setEmail("demo@omniverse.io");
      setPassword("omniverse123");
      setMode("login");
      scrollToGateway();
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
        background: "#030712",
        overflow: "hidden",
        fontFamily: "'Outfit', sans-serif",
      }}
      data-testid="auth-screen"
    >
      {/* 3D WebGL Engine Layer */}
      <Omniverse3DEngine 
        scrollProgress={scrollProgress}
        highlightedAppIds={highlightedApps}
      />

      {/* Top Header Bar */}
      <header style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(180deg, rgba(3,7,18,0.8) 0%, transparent 100%)",
        pointerEvents: "auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "linear-gradient(135deg, #00F0FF, #7B2FFF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)"
          }}>
            <i className="fa-solid fa-infinity" style={{ color: "#000", fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
              OmniverseOS <span style={{ fontSize: 11, color: "#00F0FF", marginLeft: 4 }}>2.0</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)" }}>
              // IMMERSIVE 3D AI OPERATING ENVIRONMENT
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={scrollToGateway}
            style={{
              background: "linear-gradient(135deg, rgba(0,240,255,0.15) 0%, rgba(123,47,255,0.15) 100%)",
              border: "1px solid rgba(0,240,255,0.4)",
              borderRadius: "12px",
              padding: "8px 18px",
              color: "#00F0FF",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 0 15px rgba(0,240,255,0.2)"
            }}
          >
            <span>ENTER OMNIVERSEOS</span>
            <i className="fa-solid fa-arrow-right" />
          </button>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? "Disable Audio Synthesis" : "Enable Audio Feedback"}
            style={{
              padding: "8px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: audioEnabled ? "#00F0FF" : "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <i className={`fa-solid ${audioEnabled ? "fa-volume-high" : "fa-volume-xmark"}`} />
            <span style={{ fontSize: 10, fontFamily: "monospace" }}>{audioEnabled ? "AUDIO ON" : "MUTED"}</span>
          </button>
        </div>
      </header>

      {/* Main 3D Scroll-Driven Storyline Scroll Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 10,
          scrollBehavior: "smooth"
        }}
      >
        {/* HERO SECTION */}
        <section style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: "80px",
          paddingLeft: "20px",
          paddingRight: "20px"
        }}>
          <div style={{ width: "100%", maxWidth: "800px", textAlign: "center", marginBottom: "32px" }}>
            <CortexCommandSurface 
              onExecutePrompt={(apps) => setHighlightedApps(apps)}
            />
          </div>

          <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#00F0FF", letterSpacing: "0.2em", display: "flex", alignItems: "center", gap: 8 }}>
            <span>SCROLL TO EXPLORE THE 3D UNIVERSE</span>
            <i className="fa-solid fa-chevron-down fa-bounce" />
          </div>
        </section>

        {/* 6 INTERACTIVE STORYTELLING SECTIONS */}
        <section style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{
            background: "rgba(8, 18, 38, 0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(0, 240, 255, 0.2)",
            borderRadius: "24px",
            padding: "32px",
            maxWidth: "600px",
            color: "#fff"
          }}>
            <h3 style={{ color: "#00F0FF", fontSize: "13px", fontFamily: "monospace", letterSpacing: "0.15em", margin: "0 0 8px" }}>
              02 // THE WORKSPACE CONSTELLATION
            </h3>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 12px" }}>30 Applications in One 3D Orbit</h2>
            <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: "1.6" }}>
              OmniverseOS is not a disjointed set of tools. Every application orbits the central Cortex Core, sharing state, context, memory, and cognitive intelligence seamlessly.
            </p>
          </div>
        </section>

        <section style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{
            background: "rgba(8, 18, 38, 0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(168, 85, 247, 0.2)",
            borderRadius: "24px",
            padding: "32px",
            maxWidth: "600px",
            color: "#fff"
          }}>
            <h3 style={{ color: "#A855F7", fontSize: "13px", fontFamily: "monospace", letterSpacing: "0.15em", margin: "0 0 8px" }}>
              03 // RELATIONAL CONTEXT MATRIX
            </h3>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 12px" }}>AI Does Not Live in a Chatbox</h2>
            <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: "1.6" }}>
              Context flows through active relational filaments. Your notes, projects, tasks, calendar events, and files form a continuous semantic graph that feeds decision making.
            </p>
          </div>
        </section>

        <section style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{
            background: "rgba(8, 18, 38, 0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(57, 255, 20, 0.2)",
            borderRadius: "24px",
            padding: "32px",
            maxWidth: "600px",
            color: "#fff"
          }}>
            <h3 style={{ color: "#39FF14", fontSize: "13px", fontFamily: "monospace", letterSpacing: "0.15em", margin: "0 0 8px" }}>
              04 // CORTEX NEURAL REASONING
            </h3>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 12px" }}>First-Principles Synthesis</h2>
            <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: "1.6" }}>
              Cortex processes multi-layered workspace signals, identifying hidden bottlenecks, proposing strategic paths, and executing operations autonomously across your system.
            </p>
          </div>
        </section>

        {/* FINAL SECTION: SPATIAL AUTHENTICATION GATEWAY */}
        <section style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px"
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 440
            }}
          >
            <div
              className="glass-panel"
              style={{
                padding: 32,
                borderRadius: 24,
                borderColor: "rgba(0, 240, 255, 0.35)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(0, 240, 255, 0.2)",
                backdropFilter: "blur(30px)",
                position: "relative",
                overflow: "hidden",
                background: "rgba(8, 18, 38, 0.85)"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "linear-gradient(90deg, transparent, #00F0FF, #A855F7, transparent)",
                }}
              />

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
                      // CORTEX GATEWAY 2.0
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 20, background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.25)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#39FF14", boxShadow: "0 0 8px #39FF14" }} />
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "#39FF14", fontWeight: 700 }}>ONLINE</span>
                </div>
              </div>

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

              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
                {mode === "login"
                  ? savedName ? `Welcome back, ${savedName}` : "Cortex Gateway"
                  : mode === "signup"
                  ? "Initialize Your Omniverse"
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
                      Constructing 3D spatial workspace…
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
        </section>
      </div>

      <AuthCommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelectCommand={handleCommandSelect}
      />
    </div>
  );
}
