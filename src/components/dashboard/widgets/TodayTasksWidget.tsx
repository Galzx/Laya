import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sun, CheckCircle2, Circle, Plus, Clock } from "lucide-react";
import { cn } from "../../../lib/utils";
import { getProjectColorDef } from "../../projects/projectColors";
import { playTaskPopSound } from "../../../lib/sound";
import type { WidgetProps } from "../types";
import type { Task } from "../../tasks/TasksView";

export const TodayTasksWidget: React.FC<WidgetProps> = ({
  workspaceId,
  tasks,
  projects,
  onNavigateTab,
  onRefreshData,
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isOverdue = (due_date: number | null) => {
    if (!due_date) return false;
    const d = new Date(due_date * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return d < startOfToday;
  };

  const todayTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived" && isToday(t.due_date));
  const overdueTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived" && isOverdue(t.due_date));

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const now = new Date();
      now.setHours(23, 59, 59, 0);
      const dueTimestamp = Math.floor(now.getTime() / 1000);

      await invoke("create_task", {
        workspaceId,
        title: newTitle.trim(),
        description: null,
        priority: "medium",
        startDate: null,
        dueDate: dueTimestamp,
        nextAction: null,
        projectId: null,
      });

      setNewTitle("");
      await onRefreshData();
      playTaskPopSound();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create today task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      playTaskPopSound();
      await invoke("toggle_task_status", { taskId: task.id });
      await onRefreshData();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleRescheduleOverdue = async (task: Task) => {
    try {
      const now = new Date();
      now.setHours(23, 59, 59, 0);
      const dueTimestamp = Math.floor(now.getTime() / 1000);

      await invoke("plan_task_for_today", {
        taskId: task.id,
        dueDate: dueTimestamp,
      });

      playTaskPopSound();
      await onRefreshData();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to reschedule task:", err);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Today's Action Checklist
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Inline Task Creator */}
        <form onSubmit={handleCreateTask} className="relative flex items-center">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="+ Add task due today... (press Enter)"
            className="w-full bg-muted/40 border border-border rounded-xl px-3 sm:px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
          />
          {newTitle.trim() && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="absolute right-2 p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              title="Add task"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {/* Task List */}
        {todayTasks.length === 0 ? (
          <div className="py-6 text-center space-y-2 border border-dashed border-border/80 rounded-xl sm:rounded-2xl p-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-500/80 mx-auto" />
            <p className="text-sm font-semibold text-foreground">You're all caught up for today!</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              No pending tasks due today. Add a new task above or launch a Focus session.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {todayTasks.slice(0, 6).map((task) => {
              const taskProject = task.project_id
                ? projects.find((p) => p.id === task.project_id)
                : null;
              const projectColor = taskProject ? getProjectColorDef(taskProject.color) : null;

              return (
                <li
                  key={task.id}
                  className="group flex items-center justify-between gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-all text-xs min-w-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => void handleToggleTask(task)}
                      className="text-muted-foreground hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                      title="Mark complete"
                    >
                      <Circle className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span
                        onClick={() => onNavigateTab("tasks")}
                        className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                        title={task.title}
                      >
                        {task.title}
                      </span>
                      {taskProject && projectColor && (
                        <span
                          className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-border/60 text-muted-foreground truncate max-w-[110px] shrink-0"
                          title={`Project: ${taskProject.name}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: projectColor.hex }}
                          />
                          <span className="truncate">{taskProject.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md border shrink-0",
                      task.priority === "urgent"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        : task.priority === "high"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {task.priority}
                  </span>
                </li>
              );
            })}
            {todayTasks.length > 6 && (
              <li
                onClick={() => onNavigateTab("tasks")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors pt-1 text-center font-mono cursor-pointer"
              >
                +{todayTasks.length - 6} more tasks scheduled
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Overdue Recovery Glance */}
      {overdueTasks.length > 0 && (
        <div className="pt-3 border-t border-border/60 space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1.5 font-bold text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span>Overdue Recovery ({overdueTasks.length})</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab("tasks")}
              className="text-[11px] hover:underline cursor-pointer font-medium"
            >
              View in Tasks
            </button>
          </div>

          <div className="space-y-1.5">
            {overdueTasks.slice(0, 2).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 text-xs p-2 rounded-xl bg-rose-500/5 border border-rose-500/20"
              >
                <span className="truncate flex-1 font-medium text-foreground/90">{t.title}</span>
                <button
                  type="button"
                  onClick={() => void handleRescheduleOverdue(t)}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  Reschedule to Today
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
