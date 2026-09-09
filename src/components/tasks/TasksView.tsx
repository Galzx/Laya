import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Inbox,
  Leaf,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  List,
  Columns3,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { DatePicker } from "../ui/DatePicker";
import { playTaskPopSound, playSweepSound } from "../../lib/sound";
import { TaskItem } from "./TaskItem";
import { CatHelper } from "../common/CatHelper";
import { KanbanBoard } from "../kanban/KanbanBoard";
import type { Project } from "../projects/ProjectsView";
import { processRecurringCompletion } from "../../lib/recurrence";

export interface Task {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  title: string;
  description: string | null;
  status: "inbox" | "planned" | "todo" | "in_progress" | "waiting" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  start_date: number | null;
  due_date: number | null;
  next_action: string | null;
  completed_at: number | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
  position?: number | null;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: number;
  position: number;
  created_at: number;
}

export type FilterType = "today" | "inbox" | "recovery" | "all" | "completed" | "archive";

function dateInputToEpoch(dateStr: string): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Math.floor(new Date(y, m - 1, d, 12, 0, 0).getTime() / 1000);
}

export interface TasksViewProps {
  workspaceId: string;
  initialViewMode?: "list" | "kanban";
}

export const TasksView: React.FC<TasksViewProps> = ({ workspaceId, initialViewMode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<FilterType>("today");
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const [showClearArchiveDialog, setShowClearArchiveDialog] = useState(false);
  const [clearingArchive, setClearingArchive] = useState(false);
  const [completedPosition, setCompletedPosition] = useState<"bottom" | "remain">(() => {
    const saved = localStorage.getItem("laya-completed-position");
    return saved === "remain" ? "remain" : "bottom";
  });
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    if (initialViewMode) return initialViewMode;
    const saved = localStorage.getItem("laya-tasks-view-mode");
    return saved === "kanban" ? "kanban" : "list";
  });
  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    return localStorage.getItem("laya-kanban-edit-mode") === "true";
  });

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => {
      const next = !prev;
      localStorage.setItem("laya-kanban-edit-mode", String(next));
      playTaskPopSound();
      return next;
    });
  };

  const handleViewModeChange = (mode: "list" | "kanban") => {
    playTaskPopSound();
    setViewMode(mode);
    localStorage.setItem("laya-tasks-view-mode", mode);
  };

  const handleCompletedPositionChange = async (pos: "bottom" | "remain") => {
    setCompletedPosition(pos);
    localStorage.setItem("laya-completed-position", pos);
    try {
      await invoke("update_setting", { key: "completed_position", value: pos });
    } catch (err) {
      console.error("Failed to save completed_position setting:", err);
    }
  };

  // Smooth completion choreography state
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [departingTaskIds, setDepartingTaskIds] = useState<Set<string>>(new Set());

  // Load tasks & projects without flickering loading placeholder after initial mount
  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setErrorMessage(null);
      const [fetchedTasks, fetchedProjects] = await Promise.all([
        invoke<Task[]>("get_tasks", { workspaceId }),
        invoke<Project[]>("get_projects", { workspaceId }).catch(() => [] as Project[]),
      ]);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setErrorMessage(`Couldn't load your tasks: ${String(err)}`);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const loadSubtasks = async (taskId: string) => {
    try {
      const subtasks = await invoke<Subtask[]>("get_subtasks", { taskId });
      setSubtasksMap((previous) => ({ ...previous, [taskId]: subtasks }));
    } catch (err) {
      setErrorMessage(`Couldn't load subtasks: ${String(err)}`);
    }
  };

  useEffect(() => {
    if (workspaceId) void loadData(true);
  }, [workspaceId]);

  const refreshAfter = async (action: () => Promise<unknown>, message: string) => {
    try {
      setErrorMessage(null);
      await action();
      await loadData(false);
    } catch (err) {
      console.error(message, err);
      setErrorMessage(`${message}: ${String(err)}`);
    }
  };

  // Rewarding celebratory completion with tab-aware departure
  const handleToggleTask = async (task: Task) => {
    if (task.status === "completed") {
      // Uncompleting a task back to todo
      if (filter === "completed") {
        setDepartingTaskIds((prev) => new Set(prev).add(task.id));
        await new Promise((resolve) => window.setTimeout(resolve, 380));
        await refreshAfter(() => invoke("toggle_task_status", { taskId: task.id }), "Couldn't update this task");
        setDepartingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      } else {
        await refreshAfter(() => invoke("toggle_task_status", { taskId: task.id }), "Couldn't update this task");
      }
      return;
    }

    // Check if task is recurring
    const rec = processRecurringCompletion(task.due_date, task.description);
    if (rec.isRecurring) {
      playTaskPopSound();
      setCompletingTaskIds((prev) => new Set(prev).add(task.id));
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      try {
        await invoke("update_task", {
          taskId: task.id,
          title: task.title,
          description: rec.nextDescription,
          priority: task.priority,
          dueDate: rec.nextDueDate,
          nextAction: task.next_action,
          projectId: task.project_id,
        });
      } catch (err) {
        setErrorMessage(`Couldn't advance recurring task: ${String(err)}`);
      } finally {
        setCompletingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        await loadData(false);
      }
      return;
    }

    // 1. Play tactile pop sound & mark as completing
    playTaskPopSound();
    setCompletingTaskIds((prev) => new Set(prev).add(task.id));

    // Optimistically update local task status so the checkmark & strikethrough respond in 0ms
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "completed" as const } : t))
    );

    try {
      await invoke("toggle_task_status", { taskId: task.id });
    } catch (err) {
      setErrorMessage(`Couldn't complete task: ${String(err)}`);
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      await loadData(false);
      return;
    }

    // 2. Only depart in tabs where completed tasks should leave the view when completedPosition is "bottom"
    const shouldDepart =
      completedPosition === "bottom" &&
      (filter === "today" || filter === "inbox" || filter === "recovery");

    if (shouldDepart) {
      // Let user enjoy the celebratory checkmark pop & micro-sparkles
      await new Promise((resolve) => window.setTimeout(resolve, 480));
      // Trigger smooth grid collapse
      setDepartingTaskIds((prev) => new Set(prev).add(task.id));
      await new Promise((resolve) => window.setTimeout(resolve, 360));
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 480));
    }

    // Silently reconcile with backend and clean up animation states
    await loadData(false);
    setCompletingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    setDepartingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
  };

  const handleCapture = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;

    let targetStatus = "inbox";
    let dueDateEpoch = dateInputToEpoch(newDueDate);

    if (filter === "today") {
      targetStatus = "planned";
      if (!dueDateEpoch) {
        dueDateEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
      }
    }

    await refreshAfter(
      () =>
        invoke("create_task", {
          workspaceId,
          title: newTitle.trim(),
          priority: newPriority,
          status: targetStatus,
          dueDate: dueDateEpoch,
        }),
      "Couldn't add task"
    );

    setNewTitle("");
    setNewDueDate("");
    setNewPriority("medium");
  };

  const handleSaveTaskEdits = async (
    task: Task,
    edits: {
      title: string;
      description: string | null;
      priority: Task["priority"];
      dueDate: number | null;
      nextAction: string | null;
    }
  ) => {
    await refreshAfter(
      () =>
        invoke("update_task", {
          taskId: task.id,
          title: edits.title,
          description: edits.description,
          priority: edits.priority,
          dueDate: edits.dueDate,
          nextAction: edits.nextAction,
          projectId: task.project_id ?? null,
        }),
      "Couldn't save task edits"
    );
  };

  const handleUpdatePriority = async (taskId: string, priority: Task["priority"]) => {
    await refreshAfter(
      () => invoke("update_task_priority", { taskId, priority }),
      "Couldn't update priority"
    );
  };

  const handleUpdateDueDate = async (taskId: string, dueDateStr: string) => {
    const dueDateEpoch = dateInputToEpoch(dueDateStr);
    await refreshAfter(
      () => invoke("update_task_due_date", { taskId, dueDate: dueDateEpoch }),
      "Couldn't update due date"
    );
  };

  const setTaskStatus = (taskId: string, status: string, errorLabel: string) => {
    return refreshAfter(() => invoke("set_task_status", { taskId, status }), errorLabel);
  };

  const setTaskForToday = (taskId: string) => {
    const todayNoonEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
    return refreshAfter(
      () => invoke("plan_task_for_today", { taskId, dueDate: todayNoonEpoch }),
      "Couldn't plan task for Today"
    );
  };

  const handleRestoreTask = async (taskId: string) => {
    try {
      await invoke("restore_task", { taskId });
      playTaskPopSound();
      await loadData(false);
    } catch (err) {
      setErrorMessage(`Couldn't restore task: ${String(err)}`);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    return refreshAfter(
      () => invoke("delete_task", { taskId }),
      "Couldn't delete task"
    );
  };

  const handleCreateSubtask = async (taskId: string, title: string) => {
    try {
      await invoke("create_subtask", { taskId, title });
      await loadSubtasks(taskId);
    } catch (err) {
      setErrorMessage(`Couldn't create subtask: ${String(err)}`);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    try {
      await invoke("toggle_subtask", { subtaskId });
      await loadSubtasks(taskId);
    } catch (err) {
      setErrorMessage(`Couldn't update subtask: ${String(err)}`);
    }
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    try {
      await invoke("delete_subtask", { subtaskId });
      await loadSubtasks(taskId);
    } catch (err) {
      setErrorMessage(`Couldn't delete subtask: ${String(err)}`);
    }
  };

  const handleClearCompleted = async () => {
    try {
      setClearingCompleted(true);
      playSweepSound();
      await invoke("clear_completed_tasks", { workspaceId });

      // Choreographed 1400ms sweeping moment
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await loadData(false);
      setShowClearDialog(false);
    } catch (err) {
      setErrorMessage(`Couldn't clear completed tasks: ${String(err)}`);
    } finally {
      setClearingCompleted(false);
    }
  };

  const handleClearArchive = async () => {
    try {
      setClearingArchive(true);
      setErrorMessage(null);
      await invoke("clear_archived_tasks", { workspaceId });
      playSweepSound();
      await loadData(false);
      setShowClearArchiveDialog(false);
    } catch (err) {
      console.error("Failed to clear archive:", err);
      setErrorMessage(`Couldn't empty archive: ${String(err)}`);
    } finally {
      setClearingArchive(false);
    }
  };

  const toggleExpandTask = (taskId: string) => {
    setExpandedTaskIds((previous) => {
      const next = new Set(previous);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const isOpen = (task: Task) => task.status !== "completed" && task.status !== "archived";
  const isToday = (task: Task) => {
    if (!isOpen(task)) return false;
    if (task.due_date === null) return false;
    const taskDate = new Date(task.due_date * 1000);
    const today = new Date();
    return (
      taskDate.getFullYear() === today.getFullYear() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getDate() === today.getDate()
    );
  };
  const isOverdue = (task: Task) => {
    if (!isOpen(task)) return false;
    if (task.due_date === null) return false;
    const taskDate = new Date(task.due_date * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return taskDate < todayStart;
  };

  // Exact filtering including dedicated archive filter
  const filteredTasks = tasks.filter((task) => {
    // Keep completing and departing tasks in the list during exit animation
    if (completingTaskIds.has(task.id) || departingTaskIds.has(task.id)) return true;

    if (filter === "today") return isToday(task);
    if (filter === "inbox") return task.status === "inbox";
    if (filter === "recovery") return isOverdue(task);
    if (filter === "completed") return task.status === "completed";
    if (filter === "archive") return task.status === "archived";
    return task.status !== "archived";
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (completedPosition === "bottom" && filter !== "completed" && filter !== "archive") {
      const aDone = a.status === "completed" || completingTaskIds.has(a.id) ? 1 : 0;
      const bDone = b.status === "completed" || completingTaskIds.has(b.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
    }
    return 0;
  });

  const counts = {
    today: tasks.filter(isToday).length,
    inbox: tasks.filter((task) => task.status === "inbox").length,
    recovery: tasks.filter(isOverdue).length,
    all: tasks.filter((task) => task.status !== "archived").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    archive: tasks.filter((task) => task.status === "archived").length,
  };

  const filterLabels: Record<FilterType, { title: string; helper: string }> = {
    today: { title: "Today", helper: "A focused, realistic list for the day ahead." },
    inbox: { title: "Inbox", helper: "Capture first. Decide what matters when you are ready." },
    recovery: { title: "Recovery", helper: "Nothing is behind forever. Choose what to keep, move, or let go." },
    all: { title: "All tasks", helper: "Your complete active list across the workspace." },
    completed: { title: "Completed", helper: "A celebratory record of everything you have moved forward." },
    archive: { title: "Archive & History", helper: "Tidied-up tasks and history. Restore accidental removals with 1 click." },
  };

  const projectsMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-smooth-in pb-12">
      {/* ─── 1. PROMINENT TITLE & VIEW SWITCHER BANNER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {filter === "archive" && (
              <button
                type="button"
                onClick={() => setFilter("today")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer mr-1"
                title="Return to active tasks"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Active Tasks</span>
              </button>
            )}
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {viewMode === "kanban" ? "Agile Kanban Board" : filterLabels[filter].title}
            </h2>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {viewMode === "kanban"
                ? `${tasks.filter((t) => t.status !== "archived").length} active items`
                : `${counts[filter]} task${counts[filter] === 1 ? "" : "s"}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {viewMode === "kanban"
              ? "Drag and drop cards between Backlog, To-Do, In Progress, and Completed columns."
              : filterLabels[filter].helper}
          </p>
        </div>

        {/* Right Controls with Edit Mode & View Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Edit Mode Toggle Button */}
          <button
            type="button"
            onClick={handleToggleEditMode}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border shadow-2xs",
              isEditMode
                ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
            )}
            title={isEditMode ? "Turn off Edit Mode" : "Turn on Edit Mode to drag & reorder tasks anywhere"}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Edit Mode</span>
            <span
              className={cn(
                "text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-md",
                isEditMode
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isEditMode ? "ON" : "OFF"}
            </span>
          </button>

          {/* Large Prominent View Switcher Pills */}
          <div className="flex items-center bg-muted/80 p-1.5 rounded-2xl border border-border gap-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-card ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              <List className="h-4 w-4 text-primary" />
              <span>List View</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange("kanban")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              <Columns3 className="h-4 w-4" />
              <span>Kanban Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick capture form - hidden in archive view */}
      {filter !== "archive" && (
        <form
          onSubmit={handleCapture}
          className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-card border border-border p-3 rounded-2xl shadow-xs hover:shadow-card transition-shadow duration-200"
        >
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Inbox className="h-4 w-4 text-muted-foreground shrink-0 ml-1.5" />
            <input
              type="text"
              autoFocus
              placeholder="Capture a task - press Enter to save"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              className="flex-1 bg-transparent px-2 py-1.5 text-sm focus:outline-none placeholder:text-muted-foreground/60 text-foreground"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DatePicker value={newDueDate} onChange={setNewDueDate} placeholder="Set date" />
            <select
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value as Task["priority"])}
              className="bg-secondary text-secondary-foreground border border-border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors cursor-pointer"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity duration-150 cursor-pointer shadow-2xs"
            >
              <Plus className="h-4 w-4" /> Capture
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs & Task controls toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Active Workflow Filters & Separated Archive */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Filter Pills (Active Tasks) */}
          <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs w-fit">
            {(["today", "inbox", "recovery", "all", "completed"] as FilterType[]).map((item) => {
              const isActive = filter === item;
              return (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium capitalize transition-all duration-150 cursor-pointer flex items-center gap-1.5",
                    isActive
                      ? "bg-background shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{item}</span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-px rounded-full",
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {counts[item]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Standalone Separated Archive Button */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs w-fit">
            <button
              type="button"
              onClick={() => {
                if (filter === "archive") {
                  setFilter("today");
                } else {
                  setFilter("archive");
                  if (viewMode === "kanban") {
                    handleViewModeChange("list");
                  }
                }
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5",
                filter === "archive"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={filter === "archive" ? "Return to active tasks" : "View archived tasks and history"}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archive</span>
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-px rounded-full",
                  filter === "archive" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {counts.archive}
              </span>
            </button>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle (List vs Kanban) */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Kanban Board View"
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          {/* Completed Task Position Toggle */}
          {filter !== "archive" && viewMode === "list" && (
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs">
              <span className="text-muted-foreground pl-1.5 text-[11px] font-medium hidden sm:inline">
                Completed:
              </span>
              <button
                type="button"
                onClick={() => void handleCompletedPositionChange("bottom")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                  completedPosition === "bottom"
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Move completed tasks to the end of the list"
              >
                Move to end
              </button>
              <button
                type="button"
                onClick={() => void handleCompletedPositionChange("remain")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                  completedPosition === "remain"
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Keep completed tasks in their original order"
              >
                Remain in place
              </button>
            </div>
          )}

          {/* Clear Completed Action */}
          {filter === "completed" && counts.completed > 0 && (
            <button
              type="button"
              onClick={() => setShowClearDialog(true)}
              className="inline-flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors duration-150 cursor-pointer shadow-2xs"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear completed ({counts.completed})
            </button>
          )}

          {/* Empty Archive Action */}
          {filter === "archive" && counts.archive > 0 && (
            <button
              type="button"
              onClick={() => setShowClearArchiveDialog(true)}
              className="inline-flex items-center gap-1.5 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors duration-150 cursor-pointer shadow-2xs"
            >
              <Trash2 className="h-3.5 w-3.5" /> Empty archive ({counts.archive})
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* View Content (Kanban or List) */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          projects={projects}
          workspaceId={workspaceId}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          onTasksChanged={() => void loadData(false)}
        />
      ) : loading ? (
        <div className="py-12 text-center">
          <p className="text-xs text-muted-foreground">Reading your workspace tasks...</p>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-14 text-center space-y-2 bg-card/40">
          <div className="animate-gentle-float inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted mb-2">
            {filter === "today" ? (
              <Sun className="h-6 w-6 text-amber-500" />
            ) : filter === "recovery" ? (
              <Leaf className="h-6 w-6 text-emerald-500" />
            ) : filter === "completed" ? (
              <Sparkles className="h-6 w-6 text-primary" />
            ) : filter === "archive" ? (
              <Archive className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Inbox className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {filter === "today"
              ? "Your day is clear"
              : filter === "recovery"
              ? "Nothing needs rescuing"
              : filter === "completed"
              ? "No completed tasks yet"
              : filter === "archive"
              ? "No archived tasks"
              : "Nothing here yet"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filter === "today"
              ? "Move a task from Inbox when you are ready to make room for it."
              : filter === "archive"
              ? "When you clear completed tasks, they are safely stored here so you can restore them anytime."
              : "Capture a task above whenever it comes to mind."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTasks.map((task) => {
            const isExpanded = expandedTaskIds.has(task.id);
            const subtasks = subtasksMap[task.id] || [];
            const isCompleting = completingTaskIds.has(task.id);
            const isDeparting = departingTaskIds.has(task.id);
            const project = task.project_id ? projectsMap.get(task.project_id) : undefined;

            return (
              <TaskItem
                key={task.id}
                task={task}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpandTask(task.id)}
                onToggleComplete={() => void handleToggleTask(task)}
                isCompleting={isCompleting}
                isDeparting={isDeparting}
                subtasks={subtasks}
                onLoadSubtasks={() => void loadSubtasks(task.id)}
                onCreateSubtask={(title) => handleCreateSubtask(task.id, title)}
                onToggleSubtask={(subtaskId) => handleToggleSubtask(task.id, subtaskId)}
                onDeleteSubtask={(subtaskId) => handleDeleteSubtask(task.id, subtaskId)}
                onSaveEdits={(edits) => handleSaveTaskEdits(task, edits)}
                onUpdatePriority={(priority) => handleUpdatePriority(task.id, priority)}
                onUpdateDueDate={(dueDateStr) => handleUpdateDueDate(task.id, dueDateStr)}
                onSetForToday={() => void setTaskForToday(task.id)}
                onReturnToInbox={() => void setTaskStatus(task.id, "inbox", "Couldn't return to Inbox")}
                onArchiveTask={() => void setTaskStatus(task.id, "archived", "Couldn't archive task")}
                onRestoreTask={() => void handleRestoreTask(task.id)}
                onDeleteTask={() => void handleDeleteTask(task.id)}
                projectName={project?.name}
                projectColor={project?.color}
                isArchiveView={filter === "archive"}
              />
            );
          })}
        </div>
      )}

      {/* Clear Completed Dialog with Animated Cat Helper mounted via Portal to document.body */}
      {showClearDialog &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-in p-4 select-none"
            onClick={() => {
              if (!clearingCompleted) setShowClearDialog(false);
            }}
          >
            <div
              className="bg-card border border-border rounded-2xl p-7 shadow-2xl max-w-sm w-full space-y-5 animate-dialog-in text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cozy Unboxed Stage with Cat & Celebratory Pop Finish */}
              {/* Animated Cat Helper with broom, progress arc & particles */}
              <CatHelper sweeping={clearingCompleted} />

              <div className="space-y-1.5">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {clearingCompleted ? "Tidying up workspace…" : "Clear completed tasks?"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed px-2">
                  {clearingCompleted
                    ? "A cozy helper is sweeping away finished tasks into your archive history."
                    : `This will archive ${counts.completed} completed ${
                        counts.completed === 1 ? "task" : "tasks"
                      }. You can view and restore them anytime in the Archive & History tab.`}
                </p>
              </div>

              {!clearingCompleted ? (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearDialog(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Keep them
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearCompleted()}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Clear them
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-primary font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span>Sweeping clean…</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Clear Archive Confirmation Dialog mounted via Portal */}
      {showClearArchiveDialog &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-in p-4 select-none"
            onClick={() => {
              if (!clearingArchive) setShowClearArchiveDialog(false);
            }}
          >
            <div
              className="bg-card border border-border rounded-2xl p-7 shadow-2xl max-w-sm w-full space-y-5 animate-dialog-in text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
                <Trash2 className="h-6 w-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Empty archive history?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed px-2">
                  This will permanently delete all <strong className="text-foreground font-semibold">{counts.archive}</strong> archived{" "}
                  {counts.archive === 1 ? "task" : "tasks"} and their checklist steps from your database. This action cannot be undone.
                </p>
              </div>

              {!clearingArchive ? (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearArchiveDialog(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Keep archive
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearArchive()}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    Permanently delete
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-rose-500 font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span>Emptying archive…</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
