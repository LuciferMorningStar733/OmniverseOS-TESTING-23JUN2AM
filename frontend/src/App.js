import React from "react";
import "./App.css";
import { OSProvider, useOS } from "./context/OSContext";
import { WidgetManagerProvider } from "./widgets/WidgetManagerContext";
import AuthScreen from "./components/AuthScreen";
import Desktop from "./components/Desktop";
import { Toaster } from "sonner";

const Shell = () => {
  const { user, loading } = useOS();
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#05050A]">
        <div className="font-mono text-xs tracking-[0.3em] text-[#00F0FF] animate-pulse">
          BOOTING OMNIVERSE-OS…
        </div>
      </div>
    );
  }
  return user ? <Desktop /> : <AuthScreen />;
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
