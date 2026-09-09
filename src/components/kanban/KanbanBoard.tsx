import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Inbox,
  CalendarDays,
  Flame,
  CheckCircle2,
  Plus,
  Clock,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Sparkles,
  ArrowRightLeft,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Repeat,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Archive,
  Save,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { playTaskPopSound } from "../../lib/sound";
import type { Task, Subtask } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";
import {
  parseRecurrenceFromDescription,
  processRecurringCompletion,
  embedRecurrenceInDescription,
  formatRecurrenceLabel,
  type RecurrenceFrequency,
} from "../../lib/recurrence";

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  workspaceId: string;
  projectIdFilter?: string | null;
  isEditMode?: boolean;
  onToggleEditMode?: (mode: boolean) => void;
  onTasksChanged: () => void;
}

export type KanbanColumnId = "inbox" | "todo" | "in_progress" | "completed";

interface KanbanColumnConfig {
  id: KanbanColumnId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  borderHover: string;
  description: string;
}

const COLUMNS: KanbanColumnConfig[] = [
  {
    id: "inbox",
    label: "Backlog / Inbox",
    icon: Inbox,
    accentColor: "text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground",
    borderHover: "border-muted-foreground/40",
    description: "Unscheduled thoughts and captures",
  },
  {
    id: "todo",
    label: "To-Do / Planned",
    icon: CalendarDays,
    accentColor: "text-indigo-500",
    badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    borderHover: "border-indigo-500/50",
    description: "Scheduled for execution",
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: Flame,
    accentColor: "text-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    borderHover: "border-amber-500/50",
    description: "Actively underway",
  },
  {
    id: "completed",
    label: "Completed",
    icon: CheckCircle2,
    accentColor: "text-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    borderHover: "border-emerald-500/50",
    description: "Finished milestones",
  },
];

const DropSlotIndicator: React.FC = () => (
  <div className="py-1 px-1 transition-all duration-150 animate-fade-in pointer-events-none">
    <div className="h-1 bg-primary rounded-full ring-2 ring-primary/40 shadow-xs flex items-center justify-between px-1">
      <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
      <span className="text-[9px] font-mono font-bold text-primary-foreground uppercase tracking-widest px-2 bg-primary rounded-full">
        Insert Here
      </span>
      <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
    </div>
  </div>
);

function toLocalDateInput(epochSeconds: number | null): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToEpoch(value: string): number | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(new Date(year, month - 1, day, 12).getTime() / 1000);
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  projects,
  workspaceId,
  projectIdFilter,
  isEditMode,
  onToggleEditMode,
  onTasksChanged,
}) => {
  // Optimistic local state for 0ms visual responsiveness
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(null);
  const [dragTarget, setDragTarget] = useState<{
    columnId: KanbanColumnId;
    insertIndex: number;
  } | null>(null);
  const [openMoveMenuTaskId, setOpenMoveMenuTaskId] = useState<string | null>(null);

  // Subtasks batch map & inline expansion state
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [expandedSubtasksTaskIds, setExpandedSubtasksTaskIds] = useState<Set<string>>(new Set());
  const [newSubtaskTitleMap, setNewSubtaskTitleMap] = useState<Record<string, string>>({});

  // Slide-over Task Detail / Edit Drawer
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<Task | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerDescription, setDrawerDescription] = useState("");
  const [drawerPriority, setDrawerPriority] = useState<Task["priority"]>("medium");
  const [drawerDueDate, setDrawerDueDate] = useState("");
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null);
  const [drawerRecurrence, setDrawerRecurrence] = useState<RecurrenceFrequency>("none");
  const [drawerNewSubtask, setDrawerNewSubtask] = useState("");
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  // Search & Filter Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<"all" | Task["priority"]>("all");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");

  // Fallback internal edit mode if prop is not provided
  const [internalEditMode, setInternalEditMode] = useState(false);
  const editMode = isEditMode !== undefined ? isEditMode : internalEditMode;
  const toggleEditMode = onToggleEditMode || (() => setInternalEditMode((prev) => !prev));

  const draggedTaskIdRef = useRef<string | null>(null);

  const [newTitleMap, setNewTitleMap] = useState<Record<KanbanColumnId, string>>({
    inbox: "",
    todo: "",
    in_progress: "",
    completed: "",
  });
  const [showAddMap, setShowAddMap] = useState<Record<KanbanColumnId, boolean>>({
    inbox: false,
    todo: false,
    in_progress: false,
    completed: false,
  });

  // Load all subtasks for the workspace in a single batch query
  const loadWorkspaceSubtasks = async () => {
    if (!workspaceId) return;
    try {
      const subs = await invoke<Subtask[]>("get_workspace_subtasks", { workspaceId });
      const map: Record<string, Subtask[]> = {};
      for (const s of subs) {
        if (!map[s.task_id]) map[s.task_id] = [];
        map[s.task_id].push(s);
      }
      setSubtasksMap(map);
    } catch {
      // Fallback: silently proceed if batch command isn't available
    }
  };

  useEffect(() => {
    setLocalTasks(tasks);
    void loadWorkspaceSubtasks();
  }, [tasks, workspaceId]);

  // Listen to cross-component task updates
  useEffect(() => {
    const handleGlobalTasksChanged = () => {
      void loadWorkspaceSubtasks();
    };
    window.addEventListener("laya:tasks-changed", handleGlobalTasksChanged);
    return () => window.removeEventListener("laya:tasks-changed", handleGlobalTasksChanged);
  }, [workspaceId]);

  // Close open move menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMoveMenuTaskId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // When opening a task in drawer, populate local fields
  useEffect(() => {
    if (selectedTaskForDrawer) {
      const parsed = parseRecurrenceFromDescription(selectedTaskForDrawer.description);
      setDrawerTitle(selectedTaskForDrawer.title);
      setDrawerDescription(parsed.cleanDescription);
      setDrawerPriority(selectedTaskForDrawer.priority);
      setDrawerDueDate(toLocalDateInput(selectedTaskForDrawer.due_date));
      setDrawerProjectId(selectedTaskForDrawer.project_id || null);
      setDrawerRecurrence(parsed.data?.frequency || "none");
      setDrawerNewSubtask("");
    }
  }, [selectedTaskForDrawer]);

  // Filter tasks based on project, priority, and search query
  const effectiveProjectFilter = projectIdFilter || (selectedProjectFilter !== "all" ? selectedProjectFilter : null);

  const filteredTasks = localTasks.filter((task) => {
    if (task.status === "archived") return false;
    if (effectiveProjectFilter && task.project_id !== effectiveProjectFilter) return false;
    if (selectedPriorityFilter !== "all" && task.priority !== selectedPriorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const getColumnTasks = (columnId: KanbanColumnId) => {
    return filteredTasks.filter((t) => {
      if (columnId === "inbox") {
        return t.status === "inbox";
      }
      if (columnId === "todo") {
        return t.status === "todo" || (t.status as string) === "planned" || (t.status as string) === "waiting";
      }
      if (columnId === "in_progress") {
        return t.status === "in_progress";
      }
      if (columnId === "completed") {
        return t.status === "completed";
      }
      return false;
    });
  };

  // Instant optimistic status change with recurrence advance
  const handleStatusChange = async (taskId: string, targetStatus: KanbanColumnId) => {
    playTaskPopSound();
    setOpenMoveMenuTaskId(null);

    const nowEpoch = Math.floor(Date.now() / 1000);
    const targetTask = localTasks.find((t) => t.id === taskId);

    // Check if advancing a recurring task to completed
    if (targetStatus === "completed" && targetTask) {
      const rec = processRecurringCompletion(targetTask.due_date, targetTask.description);
      if (rec.isRecurring) {
        // Optimistically update local task with advanced due date and streak
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  description: rec.nextDescription,
                  due_date: rec.nextDueDate,
                  updated_at: nowEpoch,
                }
              : t
          )
        );

        try {
          await invoke("update_task", {
            taskId,
            title: targetTask.title,
            description: rec.nextDescription,
            priority: targetTask.priority,
            dueDate: rec.nextDueDate,
            nextAction: targetTask.next_action,
            projectId: targetTask.project_id,
          });
          onTasksChanged();
          window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
          return;
        } catch (err) {
          console.error("Failed to advance recurring task in Kanban:", err);
          setLocalTasks(tasks);
          return;
        }
      }
    }

    // 1. Instant 0ms Optimistic UI update
    setLocalTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextDueDate =
          targetStatus === "inbox"
            ? null
            : (targetStatus === "todo" || targetStatus === "in_progress") && !t.due_date
            ? nowEpoch
            : t.due_date;

        return {
          ...t,
          status: targetStatus,
          due_date: nextDueDate,
          completed_at: targetStatus === "completed" ? nowEpoch : null,
          updated_at: nowEpoch,
        };
      })
    );

    // 2. Background database persistence
    try {
      await invoke("set_task_status", { taskId, status: targetStatus });
      onTasksChanged();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to update task status in Kanban:", err);
      setLocalTasks(tasks);
    }
  };

  // ─── DIRECT SUBTASK TOGGLE ON CARDS ───
  const handleToggleSubtask = async (taskId: string, subtaskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    playTaskPopSound();

    // 0ms Optimistic local update
    setSubtasksMap((prev) => {
      const currentList = prev[taskId] || [];
      const updatedList = currentList.map((st) =>
        st.id === subtaskId ? { ...st, is_completed: st.is_completed === 1 ? 0 : 1 } : st
      );
      return { ...prev, [taskId]: updatedList };
    });

    try {
      await invoke("toggle_subtask", { subtaskId });
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
      void loadWorkspaceSubtasks();
    }
  };

  // ─── INLINE SUBTASK CREATION ON CARDS ───
  const handleAddSubtaskInline = async (taskId: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const title = (newSubtaskTitleMap[taskId] || "").trim();
    if (!title) return;

    // Clear input
    setNewSubtaskTitleMap((prev) => ({ ...prev, [taskId]: "" }));

    try {
      const created = await invoke<Subtask>("create_subtask", { taskId, title });
      playTaskPopSound();
      setSubtasksMap((prev) => {
        const currentList = prev[taskId] || [];
        return { ...prev, [taskId]: [...currentList, created] };
      });
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to add subtask inline:", err);
    }
  };

  const toggleSubtasksExpansion = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedSubtasksTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // ─── SAVE DRAWER EDITS ───
  const handleSaveDrawerEdits = async () => {
    if (!selectedTaskForDrawer) return;
    setIsSavingDrawer(true);
    try {
      const finalDescription = embedRecurrenceInDescription(
        drawerDescription,
        drawerRecurrence,
        parseRecurrenceFromDescription(selectedTaskForDrawer.description).data?.streak || 0
      );
      const dueEpoch = dateInputToEpoch(drawerDueDate);

      await invoke("update_task", {
        taskId: selectedTaskForDrawer.id,
        title: drawerTitle.trim() || selectedTaskForDrawer.title,
        description: finalDescription,
        priority: drawerPriority,
        dueDate: dueEpoch,
        nextAction: selectedTaskForDrawer.next_action,
        projectId: drawerProjectId,
      });

      playTaskPopSound();
      setSelectedTaskForDrawer(null);
      onTasksChanged();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to save task edits from drawer:", err);
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handleDeleteSubtaskInDrawer = async (subtaskId: string, taskId: string) => {
    setSubtasksMap((prev) => {
      const currentList = prev[taskId] || [];
      return { ...prev, [taskId]: currentList.filter((s) => s.id !== subtaskId) };
    });
    try {
      await invoke("delete_subtask", { subtaskId });
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to delete subtask:", err);
      void loadWorkspaceSubtasks();
    }
  };

  const handleAddSubtaskInDrawer = async (taskId: string, e: React.FormEvent) => {
    e.preventDefault();
    const title = drawerNewSubtask.trim();
    if (!title) return;
    setDrawerNewSubtask("");
    try {
      const created = await invoke<Subtask>("create_subtask", { taskId, title });
      playTaskPopSound();
      setSubtasksMap((prev) => {
        const currentList = prev[taskId] || [];
        return { ...prev, [taskId]: [...currentList, created] };
      });
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create subtask in drawer:", err);
    }
  };

  // ─── DRAG & DROP HANDLERS ───
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!editMode) {
      e.preventDefault();
      return;
    }
    draggedTaskIdRef.current = taskId;
    setDraggedTaskId(taskId);
    try {
      e.dataTransfer.setData("text/plain", taskId);
      e.dataTransfer.setData("application/laya-task-id", taskId);
      e.dataTransfer.effectAllowed = "move";
    } catch (err) {
      console.warn("Could not set dataTransfer:", err);
    }
  };

  const handleDragEnd = () => {
    draggedTaskIdRef.current = null;
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setDragTarget(null);
  };

  const handleCardDragOver = (e: React.DragEvent, colId: KanbanColumnId, index: number) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;

    setDragOverColumn(colId);
    setDragTarget({ columnId: colId, insertIndex });
  };

  const handleColumnContainerDragOver = (
    e: React.DragEvent,
    colId: KanbanColumnId,
    columnTasksCount: number
  ) => {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }

    if (!dragTarget || dragTarget.columnId !== colId) {
      setDragTarget({ columnId: colId, insertIndex: columnTasksCount });
    }
  };

  const handleDrop = async (
    targetColId: KanbanColumnId,
    explicitInsertIndex: number | undefined,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const taskId = draggedTaskIdRef.current || draggedTaskId;
    if (!taskId) {
      handleDragEnd();
      return;
    }

    const task = localTasks.find((t) => t.id === taskId);
    if (!task) {
      handleDragEnd();
      return;
    }

    const sourceColId =
      task.status === "inbox"
        ? "inbox"
        : task.status === "in_progress"
        ? "in_progress"
        : task.status === "completed"
        ? "completed"
        : "todo";

    const colTasks = getColumnTasks(targetColId);
    const targetIdx =
      explicitInsertIndex !== undefined
        ? Math.min(Math.max(0, explicitInsertIndex), colTasks.length)
        : dragTarget?.columnId === targetColId
        ? dragTarget.insertIndex
        : colTasks.length;

    // Reset visual indicators immediately
    handleDragEnd();

    // If dropped in same column at same position, no-op
    if (sourceColId === targetColId) {
      const currentIndex = colTasks.findIndex((t) => t.id === taskId);
      if (currentIndex === targetIdx || currentIndex === targetIdx - 1) {
        return;
      }
    }

    await handleStatusChange(taskId, targetColId);
  };

  // Quick task creation in column
  const handleCreateInColumn = async (columnId: KanbanColumnId, e: React.FormEvent) => {
    e.preventDefault();
    const title = (newTitleMap[columnId] || "").trim();
    if (!title) return;

    const nowEpoch = Math.floor(Date.now() / 1000);
    const initialDueDate = columnId === "inbox" ? null : nowEpoch;

    try {
      await invoke("create_task", {
        workspaceId,
        projectId: projectIdFilter || null,
        title,
        description: null,
        priority: "medium",
        dueDate: initialDueDate,
        nextAction: null,
      });

      setNewTitleMap((prev) => ({ ...prev, [columnId]: "" }));
      setShowAddMap((prev) => ({ ...prev, [columnId]: false }));
      playTaskPopSound();
      onTasksChanged();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create task in column:", err);
    }
  };

  const formatDueDate = (epochSeconds: number | null) => {
    if (!epochSeconds) return null;
    const date = new Date(epochSeconds * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { formatted: "Today", isPast: false, isToday: true };
    if (diffDays === 1) return { formatted: "Tomorrow", isPast: false, isToday: false };
    if (diffDays === -1) return { formatted: "Yesterday", isPast: true, isToday: false };
    if (diffDays < -1) return { formatted: `${Math.abs(diffDays)}d overdue`, isPast: true, isToday: false };

    return {
      formatted: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      isPast: false,
      isToday: false,
    };
  };

  const getPriorityBadge = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return { label: "Urgent", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
      case "high":
        return { label: "High", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      case "medium":
        return { label: "Med", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
      case "low":
      default:
        return { label: "Low", color: "bg-muted text-muted-foreground border-border/60" };
    }
  };

  const inProgressCount = getColumnTasks("in_progress").length;
  const isFilterActive = searchQuery.trim() !== "" || selectedPriorityFilter !== "all" || (selectedProjectFilter !== "all" && !projectIdFilter);

  return (
    <div className="space-y-4 w-full select-none animate-smooth-in">
      {/* ─── KANBAN SEARCH & FILTER TOOLBAR ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border rounded-2xl shadow-card">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter cards by title or keyword…"
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Priority filter & Project filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority Pills */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-[11px]">
            {(["all", "urgent", "high", "medium", "low"] as const).map((p) => {
              const isActive = selectedPriorityFilter === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriorityFilter(p)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer",
                    isActive
                      ? "bg-background shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Project Selector (if not already filtered) */}
          {!projectIdFilter && projects.length > 0 && (
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-muted/60 text-foreground border border-border text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          )}

          {/* Clear Filters */}
          {isFilterActive && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedPriorityFilter("all");
                setSelectedProjectFilter("all");
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted/60 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              Clear
            </button>
          )}

          {/* Drag Mode Toggle */}
          <button
            type="button"
            onClick={() => toggleEditMode(!editMode)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
              editMode
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={editMode ? "Turn off card drag mode" : "Turn on card drag mode"}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Drag Mode</span>
            <span
              className={cn(
                "text-[9px] font-mono px-1 py-0.5 rounded",
                editMode ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {editMode ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── 4-COLUMN KANBAN GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col, colIdx) => {
          const colTasks = getColumnTasks(col.id);
          const Icon = col.icon;
          const isOver = dragOverColumn === col.id;
          const isDraggingActive = Boolean(draggedTaskId);
          const draggedTask = draggedTaskId ? localTasks.find((t) => t.id === draggedTaskId) : null;
          const isSourceColumn = draggedTask
            ? (col.id === "inbox" && draggedTask.status === "inbox") ||
              (col.id === "todo" && (draggedTask.status === "todo" || draggedTask.status === "planned" || draggedTask.status === "waiting")) ||
              (col.id === "in_progress" && draggedTask.status === "in_progress") ||
              (col.id === "completed" && draggedTask.status === "completed")
            : false;

          return (
            <div
              key={col.id}
              data-column-id={col.id}
              onDragEnter={(e) => {
                if (!editMode) return;
                e.preventDefault();
                setDragOverColumn(col.id);
              }}
              onDragOver={(e) => {
                if (!editMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== col.id) setDragOverColumn(col.id);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverColumn === col.id) {
                    setDragOverColumn(null);
                    setDragTarget(null);
                  }
                }
              }}
              onDrop={(e) => void handleDrop(col.id, dragTarget?.insertIndex, e)}
              className={cn(
                "flex flex-col bg-card/90 border rounded-2xl p-4 shadow-card transition-colors duration-150 min-h-[540px] h-full relative overflow-hidden",
                isOver
                  ? "border-primary ring-2 ring-primary/60 bg-primary/5 shadow-xl"
                  : isDraggingActive && !isSourceColumn
                  ? "border-primary/40 ring-1 ring-primary/20 bg-card/95"
                  : "border-border hover:border-border/90"
              )}
            >
              {/* Column Header */}
              <div
                className="flex items-center justify-between border-b border-border/60 pb-3 mb-3.5 relative z-10"
                onDragOver={(e) => {
                  if (!editMode) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragTarget({ columnId: col.id, insertIndex: 0 });
                }}
                onDrop={(e) => void handleDrop(col.id, 0, e)}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", col.accentColor)} />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {col.label}
                  </h3>
                </div>
                <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded-full", col.badgeBg)}>
                  {colTasks.length}
                </span>
              </div>

              {/* In Progress WIP Focus Banner */}
              {col.id === "in_progress" && inProgressCount > 3 && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Focus Cue: {inProgressCount} tasks underway. Prioritize finishing before starting more.
                  </span>
                </div>
              )}

              {/* Cards Container */}
              <div
                className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 max-h-[calc(100vh-290px)] relative z-10"
                onDragOver={(e) => handleColumnContainerDragOver(e, col.id, colTasks.length)}
                onDrop={(e) => void handleDrop(col.id, dragTarget?.insertIndex, e)}
              >
                {colTasks.length === 0 ? (
                  <div
                    onDragOver={(e) => {
                      if (!editMode) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverColumn !== col.id) setDragOverColumn(col.id);
                      setDragTarget({ columnId: col.id, insertIndex: 0 });
                    }}
                    onDrop={(e) => void handleDrop(col.id, 0, e)}
                    className={cn(
                      "py-14 text-center text-xs border-2 border-dashed rounded-2xl p-4 transition-colors duration-150",
                      isOver
                        ? "border-primary bg-primary/20 text-primary shadow-inner"
                        : isDraggingActive
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/80 text-muted-foreground/60"
                    )}
                  >
                    {isOver ? (
                      <div className="space-y-1">
                        <Sparkles className="h-5 w-5 mx-auto text-primary animate-bounce" />
                        <p className="font-bold text-foreground">Drop to transfer here</p>
                      </div>
                    ) : isDraggingActive ? (
                      <div className="space-y-1">
                        <Sparkles className="h-5 w-5 mx-auto text-primary/70" />
                        <p className="font-semibold text-foreground/80">Transfer to {col.label.split("/")[0].trim()}</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-foreground/70">No tasks in this column</p>
                        <p className="text-[10px] mt-0.5">Drag a card here or add one below</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {colTasks.map((task, taskIdx) => {
                      const priorityConfig = getPriorityBadge(task.priority);
                      const dueInfo = formatDueDate(task.due_date);
                      const taskProject = projects.find((p) => p.id === task.project_id);
                      const isDragging = draggedTaskId === task.id;
                      const isMoveMenuOpen = openMoveMenuTaskId === task.id;
                      const showTopDropSlot =
                        isDraggingActive &&
                        dragTarget?.columnId === col.id &&
                        dragTarget?.insertIndex === taskIdx;

                      // Subtasks info
                      const subtasks = subtasksMap[task.id] || [];
                      const completedSubtasksCount = subtasks.filter((s) => s.is_completed === 1).length;
                      const isSubtasksExpanded = expandedSubtasksTaskIds.has(task.id);
                      const subtaskRatio = subtasks.length > 0 ? completedSubtasksCount / subtasks.length : 0;

                      // Recurrence info
                      const rec = parseRecurrenceFromDescription(task.description);
                      const isRecurring = Boolean(rec.data);

                      return (
                        <React.Fragment key={task.id}>
                          {/* Visual Drop Slot Indicator Above Card */}
                          {showTopDropSlot && <DropSlotIndicator />}

                          <div
                            data-task-id={task.id}
                            draggable={editMode && openMoveMenuTaskId !== task.id}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleCardDragOver(e, col.id, taskIdx)}
                            onDrop={(e) => void handleDrop(col.id, dragTarget?.insertIndex, e)}
                            onClick={() => setSelectedTaskForDrawer(task)}
                            className={cn(
                              "group p-3.5 rounded-2xl border border-border/80 bg-background hover:bg-card shadow-card hover:shadow-card-hover transition-all duration-150 space-y-2.5 relative cursor-pointer",
                              editMode && "hover:border-primary/50 hover:ring-2 hover:ring-primary/20",
                              isDragging && "opacity-35 border-dashed border-primary bg-primary/5 shadow-none",
                              isMoveMenuOpen && "ring-2 ring-primary/40 z-30"
                            )}
                          >
                            {/* Drag Grip & Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                <span
                                  className="inline-flex cursor-grab active:cursor-grabbing"
                                  onClick={(e) => e.stopPropagation()}
                                  title={editMode ? "Drag to reorder card" : "Turn on Edit Mode to drag anywhere"}
                                >
                                  <GripVertical
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0 mt-0.5 transition-colors",
                                      editMode
                                        ? "text-primary/70 group-hover:text-primary"
                                        : "text-muted-foreground/30"
                                    )}
                                  />
                                </span>
                                <span className={cn(
                                  "text-xs font-semibold text-foreground leading-snug break-words flex-1",
                                  task.status === "completed" && "line-through text-muted-foreground"
                                )}>
                                  {task.title}
                                </span>
                              </div>

                              {/* Quick Action Move Controls */}
                              <div
                                className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative z-20"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {/* Edit Details Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTaskForDrawer(task);
                                  }}
                                  className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Edit task details"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>

                                {/* Fast Step Left */}
                                {colIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const prevCol = COLUMNS[colIdx - 1];
                                      void handleStatusChange(task.id, prevCol.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title={`Move left to ${COLUMNS[colIdx - 1].label}`}
                                  >
                                    <ArrowLeft className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Direct Move Menu Toggle */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMoveMenuTaskId(isMoveMenuOpen ? null : task.id);
                                    }}
                                    className={cn(
                                      "p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95",
                                      isMoveMenuOpen
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground"
                                    )}
                                    title="Move directly to column"
                                  >
                                    <ArrowRightLeft className="h-3 w-3" />
                                  </button>

                                  {/* Dropdown Menu */}
                                  {isMoveMenuOpen && (
                                    <div
                                      className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-2xl shadow-2xl p-1.5 z-50 animate-dialog-in text-left space-y-1"
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                                        Move to column
                                      </div>
                                      {COLUMNS.map((targetCol) => {
                                        const TargetIcon = targetCol.icon;
                                        const isCurrent = targetCol.id === col.id;
                                        return (
                                          <button
                                            key={targetCol.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              void handleStatusChange(task.id, targetCol.id);
                                            }}
                                            disabled={isCurrent}
                                            className={cn(
                                              "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left",
                                              isCurrent
                                                ? "opacity-40 cursor-default bg-muted text-muted-foreground"
                                                : "hover:bg-primary hover:text-primary-foreground text-foreground"
                                            )}
                                          >
                                            <div className="flex items-center gap-2">
                                              <TargetIcon className={cn("h-3.5 w-3.5", isCurrent ? "text-muted-foreground" : targetCol.accentColor)} />
                                              <span>{targetCol.label.split("/")[0].trim()}</span>
                                            </div>
                                            {isCurrent && <span className="text-[10px] font-bold">Current</span>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Fast Step Right */}
                                {colIdx < COLUMNS.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const nextCol = COLUMNS[colIdx + 1];
                                      void handleStatusChange(task.id, nextCol.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title={`Move right to ${COLUMNS[colIdx + 1].label}`}
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Description Preview */}
                            {rec.cleanDescription && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pl-5">
                                {rec.cleanDescription}
                              </p>
                            )}

                            {/* ─── INTERACTIVE SUBTASKS EXPANSION ON CARD ─── */}
                            <div className="pl-5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                              {subtasks.length > 0 ? (
                                <div className="space-y-1.5">
                                  {/* Subtask Progress Trigger */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleSubtasksExpansion(task.id, e)}
                                    className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground hover:text-foreground py-1 px-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer w-full"
                                  >
                                    {isSubtasksExpanded ? (
                                      <ChevronDown className="h-3 w-3 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 shrink-0" />
                                    )}
                                    <CheckSquare className="h-3 w-3 text-primary shrink-0" />
                                    <span>
                                      {completedSubtasksCount}/{subtasks.length} steps
                                    </span>
                                    {/* Mini Progress Bar */}
                                    <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden ml-1">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all duration-300",
                                          subtaskRatio === 1 ? "bg-emerald-500" : "bg-primary"
                                        )}
                                        style={{ width: `${Math.round(subtaskRatio * 100)}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-[9px]">
                                      {Math.round(subtaskRatio * 100)}%
                                    </span>
                                  </button>

                                  {/* Expanded Subtasks Mini Checklist */}
                                  {isSubtasksExpanded && (
                                    <div className="space-y-1 pt-1 pb-1 animate-fade-in">
                                      {subtasks.map((st) => {
                                        const isStDone = st.is_completed === 1;
                                        return (
                                          <div
                                            key={st.id}
                                            onClick={(e) => void handleToggleSubtask(task.id, st.id, e)}
                                            className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group/st text-[11px]"
                                          >
                                            {isStDone ? (
                                              <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            ) : (
                                              <Square className="h-3.5 w-3.5 text-muted-foreground/60 group-hover/st:text-primary shrink-0" />
                                            )}
                                            <span
                                              className={cn(
                                                "leading-tight break-words flex-1",
                                                isStDone
                                                  ? "line-through text-muted-foreground"
                                                  : "text-foreground"
                                              )}
                                            >
                                              {st.title}
                                            </span>
                                          </div>
                                        );
                                      })}

                                      {/* Inline "+ Add Step" form */}
                                      <form
                                        onSubmit={(e) => void handleAddSubtaskInline(task.id, e)}
                                        className="pt-1 flex items-center gap-1.5"
                                      >
                                        <input
                                          type="text"
                                          placeholder="+ Add step…"
                                          value={newSubtaskTitleMap[task.id] || ""}
                                          onChange={(e) =>
                                            setNewSubtaskTitleMap((prev) => ({
                                              ...prev,
                                              [task.id]: e.target.value,
                                            }))
                                          }
                                          className="flex-1 bg-background border border-border/80 rounded-lg px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                                        />
                                        {newSubtaskTitleMap[task.id]?.trim() && (
                                          <button
                                            type="submit"
                                            className="px-2 py-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 cursor-pointer shadow-2xs"
                                          >
                                            Add
                                          </button>
                                        )}
                                      </form>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Quick Add Step Link if task has no subtasks yet */
                                <div className="pt-0.5">
                                  {isSubtasksExpanded ? (
                                    <form
                                      onSubmit={(e) => void handleAddSubtaskInline(task.id, e)}
                                      className="space-y-1.5 animate-fade-in"
                                    >
                                      <input
                                        type="text"
                                        autoFocus
                                        placeholder="Add first checklist step…"
                                        value={newSubtaskTitleMap[task.id] || ""}
                                        onChange={(e) =>
                                          setNewSubtaskTitleMap((prev) => ({
                                            ...prev,
                                            [task.id]: e.target.value,
                                          }))
                                        }
                                        className="w-full bg-background border border-border/80 rounded-lg px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                                      />
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={(e) => toggleSubtasksExpansion(task.id, e)}
                                          className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={!newSubtaskTitleMap[task.id]?.trim()}
                                          className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-md hover:opacity-90 disabled:opacity-40 cursor-pointer"
                                        >
                                          Add Step
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => toggleSubtasksExpansion(task.id, e)}
                                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer py-0.5"
                                      title="Add checklist subtasks"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                      <span>Add steps</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Metadata Pills Footer */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] pl-5">
                              {/* Priority */}
                              <span className={cn("px-1.5 py-0.5 rounded-md border font-semibold", priorityConfig.color)}>
                                {priorityConfig.label}
                              </span>

                              {/* Due Date */}
                              {dueInfo && (
                                <span
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono font-medium border",
                                    dueInfo.isPast
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                      : dueInfo.isToday
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : "bg-muted/60 text-muted-foreground border-border/60"
                                  )}
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>{dueInfo.formatted}</span>
                                </span>
                              )}

                              {/* Recurrence & Streak Badges */}
                              {isRecurring && rec.data && (
                                <>
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium"
                                    title={`Repeats ${formatRecurrenceLabel(rec.data.frequency)}`}
                                  >
                                    <Repeat className="h-2.5 w-2.5" />
                                    <span>{rec.data.frequency}</span>
                                  </span>

                                  {rec.data.streak > 0 && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono font-bold"
                                      title={`${rec.data.streak} completion streak`}
                                    >
                                      <Flame className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                      <span>{rec.data.streak}x</span>
                                    </span>
                                  )}
                                </>
                              )}

                              {/* Project Tag */}
                              {taskProject && (
                                <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60 font-medium truncate max-w-[110px]">
                                  {taskProject.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Bottom Drop Slot Indicator after last card */}
                    {isDraggingActive &&
                      dragTarget?.columnId === col.id &&
                      dragTarget?.insertIndex === colTasks.length && (
                        <DropSlotIndicator />
                      )}
                  </>
                )}

                {/* Drop Landing Zone when Dragging a Card (if hovering over bottom zone) */}
                {isDraggingActive && editMode && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverColumn !== col.id) setDragOverColumn(col.id);
                      setDragTarget({ columnId: col.id, insertIndex: colTasks.length });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleDrop(col.id, colTasks.length, e);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border-2 border-dashed transition-all duration-150 text-center text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer",
                      isOver
                        ? "border-primary bg-primary/20 text-primary shadow-xs"
                        : "border-primary/30 bg-primary/5 text-muted-foreground/80 hover:border-primary/60 hover:text-primary"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {isOver
                        ? `Release to place at end of ${col.label.split("/")[0].trim()}`
                        : `Drop at end of ${col.label.split("/")[0].trim()}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Column Footer: Quick Add Task */}
              <div
                className="pt-3 border-t border-border/60 mt-3 relative z-10"
                onMouseDown={(e) => e.stopPropagation()}
                onDragOver={(e) => {
                  if (!editMode) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverColumn !== col.id) setDragOverColumn(col.id);
                  setDragTarget({ columnId: col.id, insertIndex: colTasks.length });
                }}
                onDrop={(e) => void handleDrop(col.id, colTasks.length, e)}
              >
                {showAddMap[col.id] ? (
                  <form onSubmit={(e) => void handleCreateInColumn(col.id, e)} className="space-y-2 animate-fade-in">
                    <input
                      type="text"
                      autoFocus
                      value={newTitleMap[col.id] || ""}
                      onChange={(e) => setNewTitleMap((prev) => ({ ...prev, [col.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowAddMap((prev) => ({ ...prev, [col.id]: false }));
                        }
                      }}
                      placeholder={`Add task to ${col.label}…`}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-2xs"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddMap((prev) => ({ ...prev, [col.id]: false }))}
                        className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newTitleMap[col.id]?.trim()}
                        className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-2xs"
                      >
                        Add Task
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddMap((prev) => ({ ...prev, [col.id]: true }))}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add to {col.label.split("/")[0].trim()}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── SLIDE-OVER TASK DETAIL / EDIT DRAWER ─── */}
      {selectedTaskForDrawer && (
        <div
          className="fixed inset-0 bg-background/70 backdrop-blur-xs z-50 flex justify-end animate-fade-in"
          onClick={() => setSelectedTaskForDrawer(null)}
        >
          <div
            className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-smooth-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  Task Details
                </span>
                <span className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold",
                  getPriorityBadge(drawerPriority).color
                )}>
                  {getPriorityBadge(drawerPriority).label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForDrawer(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Status Jumper Row */}
            <div className="space-y-1.5 mb-4">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Status / Column
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {COLUMNS.map((targetCol) => {
                  const isCurrent = (
                    (targetCol.id === "inbox" && selectedTaskForDrawer.status === "inbox") ||
                    (targetCol.id === "todo" && (selectedTaskForDrawer.status === "todo" || selectedTaskForDrawer.status === "planned" || selectedTaskForDrawer.status === "waiting")) ||
                    (targetCol.id === "in_progress" && selectedTaskForDrawer.status === "in_progress") ||
                    (targetCol.id === "completed" && selectedTaskForDrawer.status === "completed")
                  );
                  return (
                    <button
                      key={targetCol.id}
                      type="button"
                      onClick={() => void handleStatusChange(selectedTaskForDrawer.id, targetCol.id)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                        isCurrent
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/50 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <span>{targetCol.label.split("/")[0].trim()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4 flex-1">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  value={drawerTitle}
                  onChange={(e) => setDrawerTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Description / Notes
                </label>
                <textarea
                  value={drawerDescription}
                  onChange={(e) => setDrawerDescription(e.target.value)}
                  rows={3}
                  placeholder="Add notes, context, or guidelines…"
                  className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={drawerPriority}
                    onChange={(e) => setDrawerPriority(e.target.value as Task["priority"])}
                    className="w-full bg-background text-foreground border border-border text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={drawerDueDate}
                    onChange={(e) => setDrawerDueDate(e.target.value)}
                    className="w-full bg-background text-foreground border border-border text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Project & Recurrence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Project
                  </label>
                  <select
                    value={drawerProjectId || ""}
                    onChange={(e) => setDrawerProjectId(e.target.value || null)}
                    className="w-full bg-background text-foreground border border-border text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="">No Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Recurrence
                  </label>
                  <select
                    value={drawerRecurrence}
                    onChange={(e) => setDrawerRecurrence(e.target.value as RecurrenceFrequency)}
                    className="w-full bg-background text-foreground border border-border text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Subtasks Management in Drawer */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    <span>Checklist Steps ({subtasksMap[selectedTaskForDrawer.id]?.length || 0})</span>
                  </label>
                </div>

                {/* Subtask items */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(subtasksMap[selectedTaskForDrawer.id] || []).map((st) => {
                    const isStDone = st.is_completed === 1;
                    return (
                      <div
                        key={st.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group/item"
                      >
                        <button
                          type="button"
                          onClick={() => void handleToggleSubtask(selectedTaskForDrawer.id, st.id)}
                          className="flex items-center gap-2 text-xs flex-1 text-left cursor-pointer"
                        >
                          {isStDone ? (
                            <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn("break-words flex-1", isStDone && "line-through text-muted-foreground")}>
                            {st.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSubtaskInDrawer(st.id, selectedTaskForDrawer.id)}
                          className="p-1 rounded-lg text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete step"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Inline add subtask form */}
                <form
                  onSubmit={(e) => void handleAddSubtaskInDrawer(selectedTaskForDrawer.id, e)}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={drawerNewSubtask}
                    onChange={(e) => setDrawerNewSubtask(e.target.value)}
                    placeholder="Add a new checklist step…"
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={!drawerNewSubtask.trim()}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between gap-2">
              {/* Archive / Delete */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await invoke("set_task_status", {
                      taskId: selectedTaskForDrawer.id,
                      status: "archived",
                    });
                    setSelectedTaskForDrawer(null);
                    playTaskPopSound();
                    onTasksChanged();
                    window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Archive task into history"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archive</span>
                </button>
              </div>

              {/* Save & Cancel */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForDrawer(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveDrawerEdits()}
                  disabled={isSavingDrawer}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingDrawer ? "Saving…" : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
