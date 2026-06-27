import {
  Globe,
  Music,
  MessageSquare,
  Settings,
  Folder,
  FileText,
  Calendar,
  Code,
  Layout
  from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Globe,
  Music,
  MessageSquare,
  Settings,
  Folder,
  FileText,
  Calendar,
  Code,
  Layout
};

export const getAppIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Layout;
};
