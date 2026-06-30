import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { OSProvider, useOS } from "./context/OSContext";
import { WidgetManagerProvider } from "./widgets/WidgetManagerContext";
import AuthScreen  from "./components/AuthScreen";
import BootScreen  from "./components/BootScreen";
import Desktop     from "./components/Desktop";
import { Toaster } from "sonner";

const Shell = () => {
  const { user, loading } = useOS();

  /*
   * Show the cinematic boot sequence only on a fresh interactive login —
   * NOT when the page reloads with an already-authenticated session.
   *
   * We track whether `loading` was already FALSE when the user transitioned
   * from null → value.  If loading was still TRUE at that moment the session
   * was auto-restored from a saved token (page reload) — no boot needed.
   * If loading was FALSE the user just submitted the login form — show boot.
   *
   * The Desktop mounts *behind* the BootScreen so it's ready the instant
   * the boot animation fades out (no flash, no layout jump).
   */
  const prevLoadingRef = useRef(loading);
  const prevUserRef    = useRef(user);
  const [bootUser, setBootUser] = useState(null);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    const prevUser   = prevUserRef.current;
    prevLoadingRef.current = loading;
    prevUserRef.current    = user;

    if (prevUser === null && user !== null && !wasLoading) {
      setBootUser(user);
    }
  }, [user, loading]);

  /* ── Render ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#05050A]">
        <div className="font-mono text-xs tracking-[0.3em] text-[#00F0FF] animate-pulse">
          OMNIVERSE-OS…
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  /*
   * Both Desktop and BootScreen render simultaneously.
   * Desktop is invisible behind the boot overlay; boot fades out on top.
   * This eliminates any layout flash or loading delay on reveal.
   */
  return (
    <>
      <Desktop />
      {bootUser && (
        <BootScreen
          user={bootUser}
          onComplete={() => setBootUser(null)}
        />
      )}
    </>
  );
};

function App() {
  return (
    <div className="App">
      <OSProvider>
        <WidgetManagerProvider>
          <Shell />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(10,10,15,0.85)",
                border: "1px solid rgba(0,240,255,0.25)",
                color: "#E2E8F0",
                backdropFilter: "blur(20px)",
                fontFamily: "Outfit, sans-serif",
              },
            }}
          />
        </WidgetManagerProvider>
      </OSProvider>
    </div>
  );
}

export default App;
