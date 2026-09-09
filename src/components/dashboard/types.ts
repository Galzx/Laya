import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";
import type { Note } from "../notes/NoteEditor";
import type { TabId } from "../layout/Sidebar";

export type DashboardWidgetId =
  | "metrics_glance"
  | "today_tasks"
  | "coding_subtasks"
  | "habits_streaks"
  | "calendar_agenda"
  | "deep_work"
  | "projects"
  | "recent_notes"
  | "quick_capture"
  | "sammi_briefing"
  | "workspace_hubs";

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  colSpan: number; // 4 (1/3 width), 6 (half), 8 (2/3), 12 (full)
  visible: boolean;
  order: number;
}

export interface DashboardAggregates {
  total_tasks: number;
  active_tasks: number;
  completed_today: number;
  overdue_tasks: number;
  total_subtasks: number;
  completed_subtasks: number;
  today_subtasks_total: number;
  today_subtasks_completed: number;
  subtask_completion_ratio: number;
  active_projects: number;
  total_notes: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface WidgetProps {
  workspaceId: string;
  workspaceName: string;
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  aggregates: DashboardAggregates | null;
  onNavigateTab: (tab: TabId) => void;
  onRefreshData: () => Promise<void>;
  isCustomizing?: boolean;
}

