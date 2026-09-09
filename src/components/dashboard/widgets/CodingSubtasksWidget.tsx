import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ListTodo, CheckCircle2, Plus, Terminal, Check, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { playTaskPopSound } from "../../../lib/sound";
import type { WidgetProps } from "../types";

interface SubtaskItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: number;
  position: number;
}

export const CodingSubtasksWidget: React.FC<WidgetProps> = ({
  tasks,
  aggregates,
  onNavigateTab,
  onRefreshData,
}) => {
  const [subtasksMap, setSubtasksMap] = useState<Record<string, SubtaskItem[]>>({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [activeParentTaskId, setActiveParentTaskId] = useState<string | null>(null);

  // Active coding tasks (in_progress or urgent/high priority)
  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "archived"
  );
  const primaryTask = activeTasks.find((t) => t.status === "in_progress") || activeTasks[0];

  const loadSubtasks = useCallback(async () => {
    if (!primaryTask) return;
    try {
      const subs = await invoke<SubtaskItem[]>("get_subtasks", { taskId: primaryTask.id });
      setSubtasksMap((prev) => ({ ...prev, [primaryTask.id]: subs }));
      setActiveParentTaskId(primaryTask.id);
    } catch (err) {
      console.error("Failed to load subtasks for coding widget:", err);
    }
  }, [primaryTask?.id]);

  useEffect(() => {
    void loadSubtasks();
  }, [loadSubtasks]);

  const handleToggleSubtask = async (sub: SubtaskItem) => {
    try {
      playTaskPopSound();
      await invoke("toggle_subtask", { subtaskId: sub.id });
      await loadSubtasks();
      await onRefreshData();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !activeParentTaskId) return;

    try {
      await invoke("create_subtask", {
        taskId: activeParentTaskId,
        title: newSubtaskTitle.trim(),
      });
      setNewSubtaskTitle("");
      await loadSubtasks();
      await onRefreshData();
      playTaskPopSound();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create subtask:", err);
    }
  };

  const currentSubs = (activeParentTaskId && subtasksMap[activeParentTaskId]) || [];
  const completedSubsCount = currentSubs.filter((s) => s.is_completed === 1).length;
  const subPct = currentSubs.length > 0 ? Math.round((completedSubsCount / currentSubs.length) * 100) : 0;
  const ratio = aggregates?.subtask_completion_ratio ?? 0;
  const ratioPct = Math.round(ratio * 100);

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
              Coding Subtasks & Progress
            </h3>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
            {ratioPct}% Day Ratio
          </span>
        </div>

        {/* Cross-Table Subtask Completion Ratio Progress Bar */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Sprint Subtasks Ratio</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {aggregates?.today_subtasks_completed ?? 0} / {aggregates?.today_subtasks_total ?? 0} subtasks
            </span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.max(3, Math.min(100, ratioPct))}%` }}
            />
          </div>
        </div>

        {primaryTask ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="truncate flex-1 font-semibold text-foreground">
                Task: {primaryTask.title}
              </span>
              <span className="text-[10px] font-mono shrink-0">
                {completedSubsCount}/{currentSubs.length} done ({subPct}%)
              </span>
            </div>

            {/* Subtasks List */}
            {currentSubs.length === 0 ? (
              <div className="py-4 text-center border border-dashed border-border/80 rounded-xl p-3 text-xs text-muted-foreground">
                <ListTodo className="h-5 w-5 mx-auto text-muted-foreground/60 mb-1" />
                <span>No subtasks added yet. Break this task into steps below.</span>
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {currentSubs.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/50 border border-border/40 text-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => void handleToggleSubtask(sub)}
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0",
                        sub.is_completed === 1
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-muted-foreground/50 hover:border-primary"
                      )}
                    >
                      {sub.is_completed === 1 && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>
                    <span
                      className={cn(
                        "truncate flex-1 font-mono text-[11px]",
                        sub.is_completed === 1 ? "line-through text-muted-foreground/70" : "text-foreground"
                      )}
                    >
                      {sub.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Inline Subtask Creator */}
            <form onSubmit={handleCreateSubtask} className="relative flex items-center pt-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="+ Add coding subtask... (press Enter)"
                className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-9 font-mono"
              />
              {newSubtaskTitle.trim() && (
                <button
                  type="submit"
                  className="absolute right-1.5 p-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                  title="Add subtask"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </form>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <span>No active tasks right now. Great job clearing the queue!</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onNavigateTab("kanban")}
        className="inline-flex items-center justify-between text-xs font-semibold text-primary hover:underline cursor-pointer pt-2 border-t border-border/40 w-full"
      >
        <span>Open Kanban Board</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
};
