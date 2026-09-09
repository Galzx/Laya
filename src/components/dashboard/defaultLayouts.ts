import type { DashboardWidgetId, DashboardWidgetConfig } from "./types";
import {
  TrendingUp,
  CheckSquare,
  ListTodo,
  Flame,
  CalendarDays,
  Timer,
  FolderKanban,
  FileText,
  Zap,
  Bot,
  Compass,
} from "lucide-react";

export interface WidgetMeta {
  id: DashboardWidgetId;
  title: string;
  description: string;
  category: "tasks" | "focus" | "overview" | "notes" | "habits";
  defaultColSpan: number;
  icon: React.ComponentType<{ className?: string }>;
}

export const ALL_WIDGETS_METADATA: Record<DashboardWidgetId, WidgetMeta> = {
  metrics_glance: {
    id: "metrics_glance",
    title: "Glance Matrix & Velocity",
    description: "4-metric status with real-time subtask completion ratio",
    category: "overview",
    defaultColSpan: 12,
    icon: TrendingUp,
  },
  today_tasks: {
    id: "today_tasks",
    title: "Today's Action Checklist",
    description: "Scheduled tasks, fast inline creator, and overdue recovery",
    category: "tasks",
    defaultColSpan: 7,
    icon: CheckSquare,
  },
  coding_subtasks: {
    id: "coding_subtasks",
    title: "Coding Subtasks & Progress",
    description: "Active sprint checklist with SQL-calculated completion ratio",
    category: "tasks",
    defaultColSpan: 5,
    icon: ListTodo,
  },
  habits_streaks: {
    id: "habits_streaks",
    title: "Daily Habits & Streaks",
    description: "Recurring routines with streak counter flame badges",
    category: "habits",
    defaultColSpan: 5,
    icon: Flame,
  },
  calendar_agenda: {
    id: "calendar_agenda",
    title: "Calendar & Agenda",
    description: "Month mini-grid with scheduled task indicators",
    category: "overview",
    defaultColSpan: 6,
    icon: CalendarDays,
  },
  deep_work: {
    id: "deep_work",
    title: "Deep Work Launchpad",
    description: "Instant focus presets (15m, 25m, 50m) and soundscape trigger",
    category: "focus",
    defaultColSpan: 6,
    icon: Timer,
  },
  projects: {
    id: "projects",
    title: "Active Projects",
    description: "Project progress bars, task milestones, and color badges",
    category: "overview",
    defaultColSpan: 6,
    icon: FolderKanban,
  },
  recent_notes: {
    id: "recent_notes",
    title: "Recent Notes & Scratchpad",
    description: "Quick glimpse and instant access to your latest drafts",
    category: "notes",
    defaultColSpan: 6,
    icon: FileText,
  },
  quick_capture: {
    id: "quick_capture",
    title: "Universal Quick Capture",
    description: "1-click rapid capture for tasks, subtasks, and notes",
    category: "tasks",
    defaultColSpan: 6,
    icon: Zap,
  },
  sammi_briefing: {
    id: "sammi_briefing",
    title: "Sammi Daily Briefing",
    description: "100% offline AI morning summary and goal breakdown",
    category: "overview",
    defaultColSpan: 6,
    icon: Bot,
  },
  workspace_hubs: {
    id: "workspace_hubs",
    title: "Workspace Hubs",
    description: "Quick navigation cards to all views across Laya",
    category: "overview",
    defaultColSpan: 12,
    icon: Compass,
  },
};

export type DashboardPresetId = "minimal" | "daily_planner" | "developer" | "cockpit";

export interface DashboardPreset {
  id: DashboardPresetId;
  name: string;
  description: string;
  badge: string;
  layout: DashboardWidgetConfig[];
}

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    id: "minimal",
    name: "Minimalist Focus",
    description: "Distraction-free workspace with Today's actions, Deep Work, and Quick Capture",
    badge: "Clean & Simple",
    layout: [
      { id: "today_tasks", colSpan: 7, visible: true, order: 0 },
      { id: "deep_work", colSpan: 5, visible: true, order: 1 },
      { id: "quick_capture", colSpan: 12, visible: true, order: 2 },
      { id: "metrics_glance", colSpan: 12, visible: false, order: 3 },
      { id: "habits_streaks", colSpan: 6, visible: false, order: 4 },
      { id: "calendar_agenda", colSpan: 6, visible: false, order: 5 },
      { id: "coding_subtasks", colSpan: 6, visible: false, order: 6 },
      { id: "projects", colSpan: 6, visible: false, order: 7 },
      { id: "recent_notes", colSpan: 6, visible: false, order: 8 },
      { id: "sammi_briefing", colSpan: 6, visible: false, order: 9 },
      { id: "workspace_hubs", colSpan: 12, visible: false, order: 10 },
    ],
  },
  {
    id: "daily_planner",
    name: "Daily Planner & Habits",
    description: "Balanced schedule with daily habits, calendar agenda, and morning briefing",
    badge: "Most Popular",
    layout: [
      { id: "metrics_glance", colSpan: 12, visible: true, order: 0 },
      { id: "today_tasks", colSpan: 7, visible: true, order: 1 },
      { id: "habits_streaks", colSpan: 5, visible: true, order: 2 },
      { id: "calendar_agenda", colSpan: 6, visible: true, order: 3 },
      { id: "deep_work", colSpan: 6, visible: true, order: 4 },
      { id: "sammi_briefing", colSpan: 6, visible: true, order: 5 },
      { id: "quick_capture", colSpan: 6, visible: true, order: 6 },
      { id: "workspace_hubs", colSpan: 12, visible: true, order: 7 },
      { id: "recent_notes", colSpan: 6, visible: false, order: 8 },
      { id: "coding_subtasks", colSpan: 6, visible: false, order: 9 },
      { id: "projects", colSpan: 6, visible: false, order: 10 },
    ],
  },
  {
    id: "developer",
    name: "Developer & Engineering",
    description: "Built for software development, coding subtasks, and active project sprints",
    badge: "Technical",
    layout: [
      { id: "metrics_glance", colSpan: 12, visible: true, order: 0 },
      { id: "today_tasks", colSpan: 7, visible: true, order: 1 },
      { id: "coding_subtasks", colSpan: 5, visible: true, order: 2 },
      { id: "projects", colSpan: 6, visible: true, order: 3 },
      { id: "deep_work", colSpan: 6, visible: true, order: 4 },
      { id: "recent_notes", colSpan: 6, visible: true, order: 5 },
      { id: "quick_capture", colSpan: 6, visible: true, order: 6 },
      { id: "workspace_hubs", colSpan: 12, visible: true, order: 7 },
      { id: "sammi_briefing", colSpan: 6, visible: false, order: 8 },
      { id: "habits_streaks", colSpan: 6, visible: false, order: 9 },
      { id: "calendar_agenda", colSpan: 6, visible: false, order: 10 },
    ],
  },
  {
    id: "cockpit",
    name: "Executive Cockpit",
    description: "Complete panoramic view with all metrics, projects, notes, and navigation hubs",
    badge: "All-in-One",
    layout: [
      { id: "metrics_glance", colSpan: 12, visible: true, order: 0 },
      { id: "today_tasks", colSpan: 7, visible: true, order: 1 },
      { id: "coding_subtasks", colSpan: 5, visible: true, order: 2 },
      { id: "habits_streaks", colSpan: 5, visible: true, order: 3 },
      { id: "calendar_agenda", colSpan: 7, visible: true, order: 4 },
      { id: "projects", colSpan: 6, visible: true, order: 5 },
      { id: "deep_work", colSpan: 6, visible: true, order: 6 },
      { id: "recent_notes", colSpan: 6, visible: true, order: 7 },
      { id: "quick_capture", colSpan: 6, visible: true, order: 8 },
      { id: "sammi_briefing", colSpan: 6, visible: true, order: 9 },
      { id: "workspace_hubs", colSpan: 12, visible: true, order: 10 },
    ],
  },
];

export function applyDashboardPreset(presetId: DashboardPresetId): DashboardWidgetConfig[] {
  const found = DASHBOARD_PRESETS.find((p) => p.id === presetId);
  return found ? [...found.layout] : DASHBOARD_PRESETS[1].layout;
}

export function getWorkspaceDefaultLayout(workspaceNameOrId: string): DashboardWidgetConfig[] {
  const norm = workspaceNameOrId.toLowerCase();

  // 1. Programming / Engineering Workspace Preset
  if (norm.includes("program") || norm.includes("code") || norm.includes("dev") || norm === "ws-programming") {
    return applyDashboardPreset("developer");
  }

  // 2. Personal Workspace Preset (Default)
  if (norm.includes("personal") || norm === "ws-default-primary") {
    return applyDashboardPreset("daily_planner");
  }

  // 3. Fallback Layout
  return applyDashboardPreset("cockpit");
}

