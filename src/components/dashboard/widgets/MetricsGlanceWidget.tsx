import React from "react";
import { CheckSquare, Flame, FolderKanban, TrendingUp, ChevronRight } from "lucide-react";
import type { WidgetProps } from "../types";

export const MetricsGlanceWidget: React.FC<WidgetProps> = ({
  tasks,
  projects,
  notes,
  aggregates,
  onNavigateTab,
}) => {
  const isToday = (due_date: number | null) => {
    if (!due_date) return false;
    const d = new Date(due_date * 1000);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const todayTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived" && isToday(t.due_date));
  const completedToday = aggregates?.completed_today ?? tasks.filter((t) => {
    if (t.status !== "completed" || !t.completed_at) return false;
    return isToday(t.completed_at);
  }).length;

  const totalClosed = aggregates?.completed_today ?? tasks.filter((t) => t.status === "completed").length;
  const subtaskRatio = aggregates?.subtask_completion_ratio ?? 0;
  const subtaskPct = Math.round(subtaskRatio * 100);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      {/* 1. Today's Tasks */}
      <div
        onClick={() => onNavigateTab("tasks")}
        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-2 min-w-0"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Today's Focus</span>
          <CheckSquare className="h-4 w-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">{todayTasks.length}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">due today</span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
          {completedToday} completed today
        </span>
      </div>

      {/* 2. Focus Time Logged */}
      <div
        onClick={() => onNavigateTab("focus")}
        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover hover:border-rose-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-2 min-w-0"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Focus Logged</span>
          <Flame className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
            {todayTasks.length > 0 ? "Ready" : "Clear"}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">pomodoro</span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-primary flex items-center gap-1 font-medium truncate">
          <span>Launch studio</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
        </span>
      </div>

      {/* 3. Active Projects */}
      <div
        onClick={() => onNavigateTab("projects")}
        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-2 min-w-0"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Active Projects</span>
          <FolderKanban className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
            {aggregates?.active_projects ?? projects.length}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">in workspace</span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
          {aggregates?.total_notes ?? notes.length} saved note{(aggregates?.total_notes ?? notes.length) === 1 ? "" : "s"}
        </span>
      </div>

      {/* 4. Subtasks Velocity Progress */}
      <div
        onClick={() => onNavigateTab("analytics")}
        className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover hover:border-teal-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-2 min-w-0"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Subtask Velocity</span>
          <TrendingUp className="h-4 w-4 text-teal-500 group-hover:scale-110 transition-transform shrink-0" />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">{subtaskPct}%</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {aggregates?.today_subtasks_completed ?? 0}/{aggregates?.today_subtasks_total ?? 0} today
            </span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, Math.min(100, subtaskPct))}%` }}
            />
          </div>
        </div>
        <span className="text-[10px] sm:text-[11px] text-primary flex items-center gap-1 font-medium truncate">
          <span>{totalClosed} tasks closed</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
        </span>
      </div>
    </div>
  );
};

