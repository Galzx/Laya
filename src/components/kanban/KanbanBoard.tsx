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
  Check,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { playTaskPopSound } from "../../lib/sound";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";

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
    description: "Unscheduled thoughts & captures",
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

  // Sync local tasks with parent updates
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Close open move menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMoveMenuTaskId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Filter tasks if project filter is specified
  const filteredTasks = projectIdFilter
    ? localTasks.filter((t) => t.project_id === projectIdFilter)
    : localTasks;

  const getColumnTasks = (columnId: KanbanColumnId) => {
    return filteredTasks.filter((t) => {
      if (t.status === "archived") return false;
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

  const getTaskColumn = (task: Task): KanbanColumnId => {
    if (task.status === "inbox") return "inbox";
    if (task.status === "in_progress") return "in_progress";
    if (task.status === "completed") return "completed";
    return "todo"; // covers "todo", "planned", "waiting"
  };

  // Instant optimistic status change
  const handleStatusChange = async (taskId: string, targetStatus: KanbanColumnId) => {
    playTaskPopSound();
    setOpenMoveMenuTaskId(null);

    const nowEpoch = Math.floor(Date.now() / 1000);

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
      // Rollback on error
      setLocalTasks(tasks);
    }
  };

  // ─── ROBUST FLICKER-FREE DRAG & DROP HANDLERS ───
  // ─── ROBUST PRECISION DRAG & DROP REORDERING ENGINE ───

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
    setDragTarget((prev) => {
      if (prev?.columnId === colId && prev?.insertIndex === insertIndex) return prev;
      return { columnId: colId, insertIndex };
    });
  };

  const handleColumnContainerDragOver = (e: React.DragEvent, colId: KanbanColumnId, totalCards: number) => {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(colId);

    setDragTarget((prev) => {
      if (prev && prev.columnId === colId) return prev;
      return { columnId: colId, insertIndex: totalCards };
    });
  };

  const handleDrop = async (
    targetColId: KanbanColumnId,
    targetIndexOverride?: number,
    e?: React.DragEvent
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const taskId =
      draggedTaskIdRef.current ||
      draggedTaskId ||
      e?.dataTransfer?.getData("application/laya-task-id") ||
      e?.dataTransfer?.getData("text/plain");

    if (!taskId) {
      handleDragEnd();
      return;
    }
    const currentTarget = dragTarget;
    handleDragEnd();

    if (!taskId) return;

    const task = localTasks.find((t) => t.id === taskId);
    if (!task) return;

    const sourceColId = getTaskColumn(task);
    const resolvedTargetColId = targetColId || currentTarget?.columnId || sourceColId;
    let resolvedTargetIndex =
      targetIndexOverride ??
      (currentTarget?.columnId === resolvedTargetColId ? currentTarget.insertIndex : undefined);

    playTaskPopSound();
    const nowEpoch = Math.floor(Date.now() / 1000);

    let nextTasks = [...localTasks];
    const sourceColTasks = getColumnTasks(sourceColId);
    const targetColTasks =
      sourceColId === resolvedTargetColId
        ? sourceColTasks
        : getColumnTasks(resolvedTargetColId);

    if (resolvedTargetIndex === undefined) {
      resolvedTargetIndex = targetColTasks.length;
    }

    const reorderPayload: { id: string; position: number; status?: string }[] = [];

    if (sourceColId === resolvedTargetColId) {
      // Reordering within the SAME column
      const items = [...sourceColTasks];
      const oldIndex = items.findIndex((t) => t.id === taskId);
      if (oldIndex !== -1) {
        const [moved] = items.splice(oldIndex, 1);
        let insertAt = resolvedTargetIndex;
        if (oldIndex < insertAt) {
          insertAt = Math.max(0, insertAt - 1);
        }
        items.splice(insertAt, 0, moved);

        items.forEach((item, idx) => {
          reorderPayload.push({
            id: item.id,
            position: idx,
            status: undefined,
          });
        });

        const updatedIdsMap = new Map(items.map((it, idx) => [it.id, idx]));
        nextTasks = nextTasks.map((t) => {
          const newPos = updatedIdsMap.get(t.id);
          if (newPos !== undefined) {
            return { ...t, position: newPos, updated_at: nowEpoch };
          }
          return t;
        });
      }
    } else {
      // Moving ACROSS columns into an exact target slot
      const updatedDueDate =
        resolvedTargetColId === "inbox"
          ? null
          : (resolvedTargetColId === "todo" || resolvedTargetColId === "in_progress") && !task.due_date
          ? nowEpoch
          : task.due_date;

      const updatedTask: Task = {
        ...task,
        status: resolvedTargetColId,
        due_date: updatedDueDate,
        completed_at: resolvedTargetColId === "completed" ? nowEpoch : null,
        updated_at: nowEpoch,
      };

      const targetItems = [...targetColTasks];
      const insertAt = Math.min(resolvedTargetIndex, targetItems.length);
      targetItems.splice(insertAt, 0, updatedTask);

      targetItems.forEach((item, idx) => {
        reorderPayload.push({
          id: item.id,
          position: idx,
          status: item.id === taskId ? resolvedTargetColId : undefined,
        });
      });

      const targetIdsMap = new Map(targetItems.map((it, idx) => [it.id, idx]));
      nextTasks = nextTasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...updatedTask,
            position: targetIdsMap.get(taskId) ?? 0,
          };
        }
        const newPos = targetIdsMap.get(t.id);
        if (newPos !== undefined) {
          return { ...t, position: newPos };
        }
        return t;
      });
    }

    handleDragEnd();
    // 1. Optimistic 0ms UI update
    setLocalTasks(nextTasks);

    // 2. Transactional SQLite persistence
    try {
      await invoke("reorder_kanban_tasks", { items: reorderPayload });
      onTasksChanged();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to persist task reordering in Kanban:", err);
      // Rollback on error
      setLocalTasks(tasks);
    }
  };

  const handleBoardDrop = (e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();

    // If dropped anywhere in the board, use active dragOverColumn or find closest
    let targetColId = dragTarget?.columnId || dragOverColumn;
    if (!targetColId) {
      const elem = document.elementFromPoint(e.clientX, e.clientY);
      const colElem = elem?.closest("[data-column-id]");
      targetColId = (colElem?.getAttribute("data-column-id") as KanbanColumnId) || null;
    }

    if (targetColId) {
      void handleDrop(targetColId, dragTarget?.insertIndex, e);
    } else {
      handleDragEnd();
    }
  };

  const handleCreateInColumn = async (columnId: KanbanColumnId, e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitleMap[columnId]?.trim();
    if (!title) return;

    playTaskPopSound();
    const todayNoonEpoch =
      columnId === "todo" || columnId === "in_progress"
        ? Math.floor(new Date().setHours(12, 0, 0, 0) / 1000)
        : null;

    try {
      const created = await invoke<Task>("create_task", {
        workspaceId,
        title,
        priority: "medium",
        dueDate: todayNoonEpoch,
        projectId: projectIdFilter || null,
      });

      if (columnId !== "inbox" && columnId !== "todo") {
        await invoke("set_task_status", { taskId: created.id, status: columnId });
      }

      setNewTitleMap((prev) => ({ ...prev, [columnId]: "" }));
      setShowAddMap((prev) => ({ ...prev, [columnId]: false }));
      onTasksChanged();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create task in Kanban column:", err);
    }
  };

  const getPriorityBadge = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return { label: "Urgent", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
      case "high":
        return { label: "High", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      case "medium":
        return { label: "Medium", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
      default:
        return { label: "Low", color: "bg-muted text-muted-foreground border-border/60" };
    }
  };

  const formatDueDate = (epochSecs: number | null) => {
    if (!epochSecs) return null;
    const d = new Date(epochSecs * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const isPast = target < today;
    const isToday = target.getTime() === today.getTime();

    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { formatted, isPast, isToday };
  };

  const isDraggingActive = !!draggedTaskId;

  return (
    <div
      className="w-full h-full overflow-x-auto pb-6 select-none"
      onDragOver={(e) => {
        if (!editMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOverColumn(null);
          setDragTarget(null);
        }
      }}
      onDrop={handleBoardDrop}
    >
      {/* Edit Mode Active Banner */}
      {editMode && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-4 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-foreground animate-fade-in shadow-2xs min-w-[950px]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">Edit Mode Active:</span>
              <span className="text-muted-foreground">
                Drag cards anywhere. Reorder within the same column or insert into any stage slot.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-2xs"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Done Editing</span>
          </button>
        </div>
      )}

      {/* 4 Column Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5 min-w-[950px] h-full items-start">
        {COLUMNS.map((col, colIdx) => {
          const colTasks = getColumnTasks(col.id);
          const Icon = col.icon;
          const isOver = dragOverColumn === col.id;
          const isSourceColumn = isDraggingActive && colTasks.some((t) => t.id === draggedTaskId);

          return (
            <div
              key={col.id}
              data-column-id={col.id}
              onDragEnter={(e) => {
                if (!editMode) return;
                e.preventDefault();
                if (dragOverColumn !== col.id) setDragOverColumn(col.id);
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
                  if (dragOverColumn === col.id) setDragOverColumn(null);
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

              {/* Cards Container */}
              <div
                className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 max-h-[calc(100vh-270px)] relative z-10"
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
                      setDragOverColumn(col.id);
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
                        <p className="text-[10px] mt-0.5">
                          {editMode ? "Drag a card here to position as #1" : "Turn on Edit Mode to drag cards or add one below"}
                        </p>
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
                            className={cn(
                              "group p-3.5 rounded-2xl border border-border/80 bg-background hover:bg-card shadow-card hover:shadow-card-hover transition-all duration-150 space-y-2.5 relative",
                              editMode
                                ? "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:ring-2 hover:ring-primary/20"
                                : "cursor-default hover:border-border",
                              isDragging && "opacity-35 border-dashed border-primary bg-primary/5 shadow-none",
                              isMoveMenuOpen && "ring-2 ring-primary/40 z-30"
                            )}
                          >
                            {/* Drag Grip & Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                <span
                                  className="inline-flex"
                                  title={editMode ? "Drag to move card anywhere" : "Turn on Edit Mode to drag"}
                                >
                                  <GripVertical
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0 mt-0.5 transition-colors",
                                      editMode
                                        ? "text-primary/70 group-hover:text-primary cursor-grab"
                                        : "text-muted-foreground/30 cursor-default"
                                    )}
                                  />
                                </span>
                                <span className="text-xs font-semibold text-foreground leading-snug break-words flex-1">
                                  {task.title}
                                </span>
                              </div>

                              {/* Quick Action Move Controls */}
                              <div
                                className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative z-20"
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
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

                                  {/* Dropdown Menu to jump directly to any column */}
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
                            {task.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pl-5">
                                {task.description}
                              </p>
                            )}

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

                              {/* Project Tag */}
                              {taskProject && (
                                <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60 font-medium truncate max-w-[120px]">
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
                    <span>Add to {col.label}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
