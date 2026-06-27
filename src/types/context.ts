export interface AppContext {
  id: string;
  name: string;
  icon: string;
  category: 'productivity' | 'media' | 'communication' | 'system' | 'developer';
}

export interface WindowContext {
  appId: string;
  appName: string;
  windowId: string;
  title: string;
  icon: string;
  state: 'active' | 'minimized' | 'background';
}

export interface ClipboardItem {
  content: string;
  timestamp: number;
  type: 'text' | 'url' | 'code' | 'email' | 'sensitive';
  truncated: boolean;
}

export interface ContextSuggestion {
  id: string;
  label: string;
  icon: string;
  action: string;
  priority: number;
}

export interface TimelineEntry {
  id: string;
  appId: string;
  appName: string;
  icon: string;
  timestamp: number;
}

export interface ContextBarState {
  isExpanded: boolean;
  currentApp: AppContext | null;
  activeWindow: WindowContext | null;
  clipboard: ClipboardItem | null;
  suggestions: ContextSuggestion[];
  timeline: TimelineEntry[];
}