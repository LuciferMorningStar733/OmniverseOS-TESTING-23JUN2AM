import { useEffect, useRef } from 'react';
import { useContextBarStore } from '@/stores/contextBarStore';
import type { AppContext, WindowContext } from '@/types/context';

interface UseFocusTrackingProps {
  apps: AppContext[];
  getWindowInfo: (appId: string) => WindowContext | null;
}

export const useFocusTracking = ({ apps, getWindowInfo }: UseFocusTrackingProps) => {
  const setCurrentApp = useContextBarStore((state) => state.setCurrentApp);
  const setActiveWindow = useContextBarStore((state) => state.setActiveWindow);
  const lastActiveRef = useRef<string | null>(null);
  
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      const activeWindow = document.querySelector('[data-window-active="true"]');
      const appId = activeWindow.getAttribute('data-app-id');
      
      if (appId && appId !== lastActiveRef.current) {
        lastActiveRef.current = appId;
        
        const app = apps.find((a) => a.id === appId);
        if (app) {
          setCurrentApp(app);
          
          const windowInfo = getWindowInfo(appId);
          if (windowInfo) {
            setActiveWindow(windowInfo);
          }
        }
      }
    });
    
    const desktop = document.getElementById('desktop-layer');
    if (desktop) {
      observer.observe(desktop, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-window-active', 'class'],
      });
    }
    
    const handleFocusChange = (e: CustomEvent<{ appId: string; windowId: string }>) => {
      const { appId } = e.detail;
      
      if (appId !== lastActiveRef.current) {
        lastActiveRef.current = appId;
        
        const app = apps.find((a) => a.id === appId);
        if (app) {
          setCurrentApp(app);
          
          const windowInfo = getWindowInfo(appId);
          if (windowInfo) {
            setActiveWindow(windowInfo);
          }
        }
      }
    };
    
    window.addEventListener('app-focus-change' as any, handleFocusChange);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('app-focus-change' as any, handleFocusChange);
    };
  }, [apps, getWindowInfo, setCurrentApp, setActiveWindow]);
  
  return { lastActiveApp: lastActiveRef.current };
};
