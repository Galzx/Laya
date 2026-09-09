import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Flame, Circle, Plus, Repeat, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { playTaskPopSound } from "../../../lib/sound";
import {
  parseRecurrenceFromDescription,
  embedRecurrenceInDescription,
  processRecurringCompletion,
  formatRecurrenceLabel,
} from "../../../lib/recurrence";
import type { WidgetProps } from "../types";
import type { Task } from "../../tasks/TasksView";

export const HabitsWidget: React.FC<WidgetProps> = ({
  workspaceId,
  tasks,
  onNavigateTab,
  onRefreshData,
}) => {
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter tasks that have recurrence rules or are recurring
  const habitTasks = tasks.filter((t) => {
    if (t.status === "archived") return false;
    const { data } = parseRecurrenceFromDescription(t.description);
    return data !== null && data.frequency !== "none";
  });

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const now = new Date();
      now.setHours(23, 59, 59, 0);
      const dueTimestamp = Math.floor(now.getTime() / 1000);

      const recurrenceDesc = embedRecurrenceInDescription(
        "Daily productivity habit",
        "daily",
        0
      );

      await invoke("create_task", {
        workspaceId,
        title: newHabitTitle.trim(),
        description: recurrenceDesc,
        priority: "medium",
        startDate: null,
        dueDate: dueTimestamp,
        nextAction: "Daily Habit",
        projectId: null,
      });

      setNewHabitTitle("");
      await onRefreshData();
      playTaskPopSound();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create habit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteHabit = async (task: Task) => {
    try {
      playTaskPopSound();
      const result = processRecurringCompletion(task.due_date, task.description);
      if (result.isRecurring) {
        await invoke("update_task", {
          taskId: task.id,
          title: task.title,
          description: result.nextDescription,
          priority: task.priority,
          startDate: task.start_date,
          dueDate: result.nextDueDate,
          nextAction: task.next_action,
          projectId: task.project_id,
        });
      } else {
        await invoke("toggle_task_status", { taskId: task.id });
      }

      await onRefreshData();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to advance habit:", err);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Daily Habits & Streaks
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            {habitTasks.length} {habitTasks.length === 1 ? "habit" : "habits"}
          </span>
        </div>

        {/* Inline Habit Creator */}
        <form onSubmit={handleCreateHabit} className="relative flex items-center">
          <input
            type="text"
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
            placeholder="+ Add daily habit... (e.g. Read 20 mins)"
            className="w-full bg-muted/40 border border-border rounded-xl px-3 sm:px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
          />
          {newHabitTitle.trim() && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="absolute right-2 p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              title="Add habit"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {/* Habit List */}
        {habitTasks.length === 0 ? (
          <div className="py-6 text-center space-y-2 border border-dashed border-border/80 rounded-xl sm:rounded-2xl p-4">
            <Repeat className="h-6 w-6 text-orange-500/70 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No recurring habits set yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Add a daily routine above to track consistency with automatic streak counters!
            </p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {habitTasks.map((task) => {
              const { data } = parseRecurrenceFromDescription(task.description);
              const streak = data?.streak || 0;

              return (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-all text-xs min-w-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => void handleCompleteHabit(task)}
                      className="text-muted-foreground hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                      title="Check in habit"
                    >
                      <Circle className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {data ? formatRecurrenceLabel(data.frequency) : "Daily"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0",
                      streak > 0
                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                        : "bg-muted text-muted-foreground border-border/60"
                    )}
                  >
                    <Flame className={cn("h-3 w-3", streak > 0 ? "text-orange-500 animate-pulse" : "text-muted-foreground")} />
                    <span>{streak}d streak</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onNavigateTab("tasks")}
        className="inline-flex items-center justify-between text-xs font-semibold text-primary hover:underline cursor-pointer pt-2 border-t border-border/40 w-full"
      >
        <span>View all tasks and recurring habits</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
};

