import { useCallback } from 'react';
import { useContextBarStore } from '@/stores/contextBarStore';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  handler: () => void;
}

export const useQuickActions = () => {
  const clipboard = useContextBarStore((state) => state.clipboard);
  
  const executeAction = useCallback((actionId: string) => {
    const event = new CustomEvent('context-bar-action', {
      detail: { action: actionId, clipboard: clipboard?.content },
    });
    window.dispatchEvent(event);
    
    switch (actionId) {
      case 'open-ai-chat':
        window.dispatchEvent(new CustomEvent('launch-app', { detail: { appId: 'ai-chat' } }));
        break;
      case 'open-browser':
        window.dispatchEvent(new CustomEvent('launch-app', { detail: { appId: 'browser' } }));
        break;
      case 'open-notes':
        window.dispatchEvent(new CustomEvent('launch-app', { detail: { appId: 'notes' } }));
        break;
      case 'copy-answer':
      case 'copy':
        if (clipboard?.content) {
          navigator.clipboard.writeText(clipboard.content);
        }
        break;
      case 'search':
        window.dispatchEvent(new CustomEvent('lobal-search', { detail: { query: clipboard?.content || '' } }));
        break;
    }
  }, [clipboard]);
  
  const quickActions: QuickAction[] = [
    { id: 'explain', label: 'Explain', icon: 'HelpCircle', handler: () => executeAction('explain') },
    { id: 'summarize', label: 'Summarize', icon: 'FileText', handler: () => executeAction('summarize') },
    { id: 'translate', label: 'Translate', icon: 'Languages', handler: () => executeAction('translate') },
    { id: 'copy', label: 'Copy', icon: 'Copy', handler: () => executeAction('copy') },
    { id: 'search', label: 'Search', icon: 'Search', handler: () => executeAction('search') },
    { id: 'open-ai-chat', label: 'AI Chat', icon: 'MessageSquare', handler: () => executeAction('open-ai-chat') },
    { id: 'open-browser', label: 'Browser', icon: 'Globe', handler: () => executeAction('open-browser') },
    { id: 'new-note', label: 'New Note', icon: 'FilePlus', handler: () => executeAction('open-notes') },
  ];
  
  return { quickActions, executeAction };
};
