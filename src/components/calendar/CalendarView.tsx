import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sun,
  CheckCircle2,
  Circle,
  Plus,
  Columns3,
  CalendarDays,
  ListTodo,
  AlertTriangle,
  Filter,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";
import { playTaskPopSound } from "../../lib/sound";

interface CalendarViewProps {
  workspaceId: string;
  projects?: Project[];
}

export type CalendarViewMode = "month" | "week" | "agenda";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

function dateStrToEpoch(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(new Date(y, m - 1, d, 12, 0, 0).getTime() / 1000);
}

function epochToDateString(epoch: number): string {
  const d = new Date(epoch * 1000);
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

export const CalendarView: React.FC<CalendarViewProps> = ({ workspaceId, projects = [] }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [showOverdueDrawer, setShowOverdueDrawer] = useState(false);

  // Selected date for Month view side panel
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const now = new Date();
    return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
  });

  // Inline task creation state
  const [inlineAddDateStr, setInlineAddDateStr] = useState<string | null>(null);
  const [inlineAddTitle, setInlineAddTitle] = useState("");
  const [inlineAddPriority, setInlineAddPriority] = useState<Task["priority"]>("medium");

  // Drag and Drop rescheduling state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const draggedTaskIdRef = useRef<string | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await invoke<Task[]>("get_tasks", { workspaceId });
      setTasks(res);
    } catch (err) {
      console.error("Failed to load tasks for calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) void loadTasks();
  }, [workspaceId]);

  // Listen to external task changes
  useEffect(() => {
    const handleTasksChanged = () => {
      void loadTasks();
    };
    window.addEventListener("laya:tasks-changed", handleTasksChanged);
    return () => window.removeEventListener("laya:tasks-changed", handleTasksChanged);
  }, []);

  // Filter tasks by selected project
  const filteredTasks = useMemo(() => {
    if (selectedProjectId === "all") return tasks;
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Group tasks by date string
  const tasksByDate = useMemo(() => {
    return filteredTasks.reduce<Record<string, Task[]>>((acc, task) => {
      if (task.due_date && task.status !== "archived") {
        const dateStr = epochToDateString(task.due_date);
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(task);
      }
      return acc;
    }, {});
  }, [filteredTasks]);

  // Overdue and unscheduled tasks
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 1000;
  const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());

  const overdueTasks = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.status !== "completed" && t.status !== "archived" && t.due_date && t.due_date < todayStart
    );
  }, [filteredTasks, todayStart]);

  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.status !== "completed" && t.status !== "archived" && !t.due_date
    );
  }, [filteredTasks]);

  // Handle task status toggle
  const handleToggleTask = async (taskId: string) => {
    try {
      // 0ms Optimistic UI update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const nextStatus = t.status === "completed" ? "todo" : "completed";
          return {
            ...t,
            status: nextStatus,
            completed_at: nextStatus === "completed" ? Math.floor(Date.now() / 1000) : null,
          };
        })
      );

      const updated = await invoke<Task>("toggle_task_status", { taskId });
      if (updated.status === "completed") {
        playTaskPopSound();
      }
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to toggle task status:", err);
      void loadTasks();
    }
  };

  // Handle task creation on a specific date
  const handleCreateTaskOnDate = async (dateStr: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineAddTitle.trim()) return;

    playTaskPopSound();
    const dueEpoch = dateStrToEpoch(dateStr);

    try {
      const created = await invoke<Task>("create_task", {
        workspaceId,
        title: inlineAddTitle.trim(),
        priority: inlineAddPriority,
        dueDate: dueEpoch,
        projectId: selectedProjectId === "all" ? null : selectedProjectId,
      });

      setTasks((prev) => [...prev, created]);
      setInlineAddTitle("");
      setInlineAddDateStr(null);
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create task on date:", err);
    }
  };

  // Handle Drag & Drop Rescheduling
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    draggedTaskIdRef.current = taskId;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    draggedTaskIdRef.current = null;
    setDraggedTaskId(null);
    setDragOverDateStr(null);
  };

  const handleDropOnDate = async (targetDateStr: string, explicitTaskId?: string) => {
    const taskId = explicitTaskId || draggedTaskIdRef.current || draggedTaskId;
    if (!taskId) return;

    const targetEpoch = dateStrToEpoch(targetDateStr);

    // 0ms Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, due_date: targetEpoch, status: t.status === "inbox" ? "todo" : t.status } : t))
    );

    playTaskPopSound();
    handleDragEnd();

    try {
      await invoke("update_task_due_date", {
        taskId,
        dueDate: targetEpoch,
      });
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to reschedule task via drag and drop:", err);
      void loadTasks();
    }
  };

  // Date Navigation Helpers
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
    } else if (viewMode === "week") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 7);
      setCurrentDate(nextDate);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
    } else if (viewMode === "week") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 7);
      setCurrentDate(nextDate);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
  };

  // Build Month Grid Cells
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  interface DayCell {
    year: number;
    month: number;
    day: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    tasks: Task[];
  }

  const monthCells: DayCell[] = [];

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const month = viewMonth === 0 ? 11 : viewMonth - 1;
    const year = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = formatDateString(year, month, day);
    monthCells.push({
      year,
      month,
      day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateStr,
      tasks: tasksByDate[dateStr] || [],
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateString(viewYear, viewMonth, d);
    monthCells.push({
      year: viewYear,
      month: viewMonth,
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateStr,
      tasks: tasksByDate[dateStr] || [],
    });
  }

  // Next month padding
  const remaining = (7 - (monthCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const month = viewMonth === 11 ? 0 : viewMonth + 1;
    const year = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = formatDateString(year, month, d);
    monthCells.push({
      year,
      month,
      day: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateStr,
      tasks: tasksByDate[dateStr] || [],
    });
  }

  // Build Week Days (Monday to Sunday for current week)
  const currentDayOfWeek = (currentDate.getDay() + 6) % 7; // 0 = Mon
  const mondayOfWeek = new Date(currentDate);
  mondayOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayOfWeek);
      d.setDate(mondayOfWeek.getDate() + i);
      const dateStr = formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
      days.push({
        dateObj: d,
        dateStr,
        dayName: WEEKDAYS[i],
        fullDayName: FULL_WEEKDAYS[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        tasks: tasksByDate[dateStr] || [],
      });
    }
    return days;
  }, [mondayOfWeek, todayStr, tasksByDate]);

  // Selected date info for Side Panel
  const selectedDateTasks = tasksByDate[selectedDateStr] || [];
  const [sYear, sMonth, sDay] = selectedDateStr.split("-").map(Number);
  const selectedDateObj = new Date(sYear, sMonth - 1, sDay);
  const isSelectedDateToday = selectedDateStr === todayStr;
  const completedSelectedCount = selectedDateTasks.filter((t) => t.status === "completed").length;

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "high":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "medium":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto animate-smooth-in pb-12 select-none">
      {/* ─── 1. TOP HEADER & WORKSPACE TOOLBAR ────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/90 border border-border/80 rounded-2xl p-5 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Calendar Schedule</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {viewMode === "month"
              ? `${MONTH_NAMES[viewMonth]} ${viewYear} • ${filteredTasks.filter((t) => t.due_date).length} total scheduled tasks`
              : viewMode === "week"
              ? `Week of ${MONTH_NAMES[weekDays[0].dateObj.getMonth()]} ${weekDays[0].dayNum} – ${weekDays[6].dayNum}, ${weekDays[0].dateObj.getFullYear()}`
              : "Chronological agenda stream & timeline"}
          </p>
        </div>

        {/* Controls: Date Step, View Switcher & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Month/Week Stepper */}
          {viewMode !== "agenda" && (
            <div className="flex items-center bg-background border border-border rounded-2xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-bold min-w-[130px] text-center text-foreground">
                {viewMode === "month"
                  ? `${MONTH_NAMES[viewMonth]} ${viewYear}`
                  : `${MONTH_NAMES[weekDays[0].dateObj.getMonth()]} ${weekDays[0].dayNum} – ${weekDays[6].dayNum}`}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Today Button */}
          <button
            type="button"
            onClick={handleToday}
            className="px-3.5 py-2 text-xs font-semibold bg-background border border-border rounded-2xl hover:bg-muted/70 text-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            Today
          </button>

          {/* View Switcher Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/80">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                viewMode === "month"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                viewMode === "week"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Week</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                viewMode === "agenda"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListTodo className="h-3.5 w-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Project Filter Selector */}
          {projects.length > 0 && (
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-2xl px-2.5 py-1.5 shadow-2xs">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer pr-1"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Overdue / Backlog Drawer Toggle Badge */}
          {(overdueTasks.length > 0 || unscheduledTasks.length > 0) && (
            <button
              type="button"
              onClick={() => setShowOverdueDrawer((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95",
                showOverdueDrawer
                  ? "bg-rose-500 text-white border-rose-600 shadow-md"
                  : overdueTasks.length > 0
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {overdueTasks.length > 0
                  ? `${overdueTasks.length} Overdue`
                  : `${unscheduledTasks.length} Backlog`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. OVERDUE & BACKLOG TASK RESCUE TRAY (Collapsible) ─────────── */}
      {showOverdueDrawer && (overdueTasks.length > 0 || unscheduledTasks.length > 0) && (
        <div className="bg-rose-500/5 border-2 border-rose-500/20 rounded-2xl p-5 shadow-card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Tasks Ready for Rescheduling ({overdueTasks.length + unscheduledTasks.length})
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Drag onto any date or click &quot;Set Today&quot; to schedule immediately
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...overdueTasks, ...unscheduledTasks.slice(0, 6)].map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                className="p-3 bg-card border border-border rounded-2xl shadow-card hover:border-primary/50 transition-all flex items-center justify-between gap-3 cursor-grab"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground truncate">{task.title}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {task.due_date
                      ? `Was due ${epochToDateString(task.due_date)}`
                      : "Unscheduled backlog"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDropOnDate(todayStr, task.id)}
                  className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  Set Today
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 3. MAIN CALENDAR VIEWS ──────────────────────────────────────── */}
      {loading && tasks.length === 0 && (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading calendar events…
        </div>
      )}

      {/* ─── MODE A: MONTH GRID VIEW ─────────────────────────────────────── */}
      {!loading && viewMode === "month" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* 7x5 Month Grid Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-2 text-center pb-3 border-b border-border/60">
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {day}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthCells.map((cell, idx) => {
                const isDragOver = dragOverDateStr === cell.dateStr;
                const totalCount = cell.tasks.length;
                const openCount = cell.tasks.filter((t) => t.status !== "completed").length;
                const completedCount = totalCount - openCount;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverDateStr !== cell.dateStr) setDragOverDateStr(cell.dateStr);
                    }}
                    onDragLeave={() => {
                      if (dragOverDateStr === cell.dateStr) setDragOverDateStr(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      void handleDropOnDate(cell.dateStr);
                    }}
                    className={cn(
                      "min-h-[92px] sm:min-h-[105px] p-2.5 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between group cursor-pointer relative overflow-hidden",
                      isDragOver
                        ? "border-primary bg-primary/20 ring-2 ring-primary scale-[1.02] shadow-md animate-pulse"
                        : cell.isSelected
                        ? "border-primary bg-primary/10 shadow-card ring-2 ring-primary/40"
                        : cell.isToday
                        ? "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10"
                        : cell.isCurrentMonth
                        ? "border-border/70 bg-background hover:bg-muted/40 hover:border-border"
                        : "border-transparent bg-muted/20 text-muted-foreground/40 hover:bg-muted/30"
                    )}
                  >
                    {/* Cell Top Header */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={cn(
                          "text-xs font-bold h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
                          cell.isToday
                            ? "bg-amber-500 text-white shadow-xs"
                            : cell.isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : cell.isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground/40"
                        )}
                      >
                        {cell.day}
                      </span>

                      {/* Workload Indicator Pill */}
                      {totalCount > 0 && (
                        <span
                          className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-px rounded-md",
                            openCount > 0
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          )}
                          title={`${completedCount} of ${totalCount} completed`}
                        >
                          {completedCount}/{totalCount}
                        </span>
                      )}
                    </div>

                    {/* Task Chips in Month Cell */}
                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {cell.tasks.slice(0, 2).map((t) => {
                        const isDone = t.status === "completed";
                        const taskProject = projects.find((p) => p.id === t.project_id);

                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, t.id);
                            }}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "text-[10px] font-medium truncate px-1.5 py-0.5 rounded-lg border flex items-center gap-1 transition-all cursor-grab active:cursor-grabbing",
                              isDone
                                ? "bg-muted/70 text-muted-foreground line-through border-transparent opacity-60"
                                : t.priority === "urgent"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : "bg-card border-border/80 text-foreground hover:border-primary/50 shadow-2xs"
                            )}
                          >
                            {taskProject && (
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: taskProject.color || "var(--primary)" }}
                              />
                            )}
                            <span className="truncate">{t.title}</span>
                          </div>
                        );
                      })}
                      {totalCount > 2 && (
                        <span className="text-[9px] font-bold text-muted-foreground pl-1 block font-mono">
                          +{totalCount - 2} more
                        </span>
                      )}
                    </div>

                    {/* Hover Quick Add Button */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateStr(cell.dateStr);
                          setInlineAddDateStr(cell.dateStr);
                        }}
                        className="p-1 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors cursor-pointer"
                        title={`Add task for ${cell.dateStr}`}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Agenda Side Panel */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col space-y-4">
            {/* Panel Header */}
            <div className="border-b border-border/60 pb-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isSelectedDateToday ? "Today's Agenda" : "Selected Date"}
                </p>
                <h3 className="text-base font-bold text-foreground">
                  {selectedDateObj.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {isSelectedDateToday && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    <Sun className="h-3.5 w-3.5" /> Today
                  </span>
                )}
                {selectedDateTasks.length > 0 && (
                  <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border/60">
                    {completedSelectedCount}/{selectedDateTasks.length} done
                  </span>
                )}
              </div>
            </div>

            {/* Quick Add Form on Selected Date */}
            <form onSubmit={(e) => void handleCreateTaskOnDate(selectedDateStr, e)} className="space-y-2">
              <div className="flex items-center gap-1.5 bg-background border border-border rounded-2xl px-3 py-2 shadow-2xs focus-within:ring-1 focus-within:ring-primary/40">
                <input
                  type="text"
                  value={inlineAddDateStr === selectedDateStr ? inlineAddTitle : ""}
                  onChange={(e) => {
                    setInlineAddDateStr(selectedDateStr);
                    setInlineAddTitle(e.target.value);
                  }}
                  placeholder="Add a task for this day… (Enter)"
                  className="w-full bg-transparent text-xs font-medium text-foreground placeholder:text-muted-foreground/60 border-none outline-none"
                />
                <button
                  type="submit"
                  disabled={!inlineAddTitle.trim() || inlineAddDateStr !== selectedDateStr}
                  className="p-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
                >
                  <CornerDownLeft className="h-3 w-3" />
                </button>
              </div>
              {inlineAddDateStr === selectedDateStr && inlineAddTitle.trim().length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 animate-fade-in">
                  <span className="text-[10px] text-muted-foreground font-semibold">Priority:</span>
                  {(["low", "medium", "high", "urgent"] as Task["priority"][]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setInlineAddPriority(p)}
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer",
                        inlineAddPriority === p
                          ? getPriorityColor(p)
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Task List on Selected Date */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[480px] pr-1">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2 border border-dashed border-border/80 rounded-2xl">
                  <CalendarIcon className="h-6 w-6 mx-auto text-muted-foreground/50" />
                  <p className="text-xs font-semibold text-foreground">No tasks scheduled</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Type a task above or drag an item from the overdue tray onto this day.
                  </p>
                </div>
              ) : (
                selectedDateTasks.map((task) => {
                  const isDone = task.status === "completed";
                  const taskProject = projects.find((p) => p.id === task.project_id);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all duration-150 flex items-start gap-3 group cursor-grab",
                        isDone
                          ? "border-border/50 bg-muted/30 opacity-70"
                          : "border-border bg-background hover:bg-muted/30 hover:border-primary/40 shadow-card"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => void handleToggleTask(task.id)}
                        className="mt-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                        title={isDone ? "Mark incomplete" : "Complete task"}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="h-4 w-4 hover:stroke-primary" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={cn(
                            "text-xs font-semibold text-foreground leading-snug break-words",
                            isDone && "line-through text-muted-foreground font-normal"
                          )}
                        >
                          {task.title}
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          {/* Priority Badge */}
                          <span className={cn("px-1.5 py-px rounded-md border font-bold", getPriorityColor(task.priority))}>
                            {task.priority}
                          </span>

                          {/* Project Tag */}
                          {taskProject && (
                            <span className="px-1.5 py-px rounded-md bg-muted/80 text-muted-foreground border border-border/60 font-medium truncate max-w-[120px]">
                              {taskProject.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODE B: WEEK COLUMNS TIMELINE VIEW ──────────────────────────── */}
      {!loading && viewMode === "week" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 min-w-[1000px] overflow-x-auto pb-4 items-start">
          {weekDays.map((dayCol) => {
            const isDragOver = dragOverDateStr === dayCol.dateStr;
            const completedCount = dayCol.tasks.filter((t) => t.status === "completed").length;
            const totalCount = dayCol.tasks.length;

            return (
              <div
                key={dayCol.dateStr}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverDateStr !== dayCol.dateStr) setDragOverDateStr(dayCol.dateStr);
                }}
                onDragLeave={() => {
                  if (dragOverDateStr === dayCol.dateStr) setDragOverDateStr(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDropOnDate(dayCol.dateStr);
                }}
                className={cn(
                  "flex flex-col bg-card border rounded-2xl p-4 shadow-card transition-all duration-200 min-h-[580px] relative overflow-hidden",
                  isDragOver
                    ? "border-primary ring-2 ring-primary bg-primary/10 scale-[1.01] shadow-xl"
                    : dayCol.isToday
                    ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-border hover:border-border/90"
                )}
              >
                {/* Column Header */}
                <div className="border-b border-border/60 pb-3 mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {dayCol.dayName}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={cn(
                          "text-base font-bold h-7 w-7 rounded-xl flex items-center justify-center",
                          dayCol.isToday
                            ? "bg-amber-500 text-white shadow-xs"
                            : "text-foreground"
                        )}
                      >
                        {dayCol.dayNum}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {completedCount}/{totalCount}
                  </span>
                </div>

                {/* Task Cards Container */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
                  {dayCol.tasks.length === 0 ? (
                    <div className="py-12 text-center text-xs border border-dashed border-border/80 rounded-2xl p-3 text-muted-foreground/60">
                      No tasks
                    </div>
                  ) : (
                    dayCol.tasks.map((task) => {
                      const isDone = task.status === "completed";
                      const taskProject = projects.find((p) => p.id === task.project_id);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "p-3 rounded-2xl border transition-all duration-150 space-y-2 cursor-grab",
                            isDone
                              ? "border-border/50 bg-muted/40 opacity-70"
                              : "border-border bg-background hover:bg-card hover:border-primary/40 shadow-card"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => void handleToggleTask(task.id)}
                              className="mt-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 hover:stroke-primary" />
                              )}
                            </button>
                            <span
                              className={cn(
                                "text-xs font-semibold text-foreground leading-snug break-words flex-1",
                                isDone && "line-through text-muted-foreground font-normal"
                              )}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] pl-5">
                            <span className={cn("px-1.5 py-px rounded-md border font-bold", getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                            {taskProject && (
                              <span className="px-1.5 py-px rounded-md bg-muted text-muted-foreground border border-border/60 truncate max-w-[100px]">
                                {taskProject.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Week Day Footer: Inline Quick Add */}
                <div className="pt-3 border-t border-border/60 mt-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleCreateTaskOnDate(dayCol.dateStr, e);
                    }}
                    className="space-y-1.5"
                  >
                    <input
                      type="text"
                      value={inlineAddDateStr === dayCol.dateStr ? inlineAddTitle : ""}
                      onChange={(e) => {
                        setInlineAddDateStr(dayCol.dateStr);
                        setInlineAddTitle(e.target.value);
                      }}
                      placeholder={`+ Add for ${dayCol.dayName}…`}
                      className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-2xs"
                    />
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODE C: AGENDA STREAM VIEW ──────────────────────────────────── */}
      {!loading && viewMode === "agenda" && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6 max-w-4xl mx-auto">
          <div className="border-b border-border/60 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Upcoming Agenda Stream</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chronological list of all planned milestones and deadlines.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {filteredTasks.filter((t) => t.due_date && t.status !== "archived").length} Scheduled
            </span>
          </div>

          {/* Grouped Agenda Items */}
          <div className="space-y-6">
            {Object.keys(tasksByDate).length === 0 ? (
              <div className="py-20 text-center space-y-2 border border-dashed border-border rounded-2xl">
                <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No upcoming scheduled tasks</p>
                <p className="text-xs text-muted-foreground">
                  Assign deadlines to your tasks to see them appear here.
                </p>
              </div>
            ) : (
              Object.entries(tasksByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, dayTasks]) => {
                  const [y, m, d] = dateKey.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const isDateToday = dateKey === todayStr;

                  return (
                    <div key={dateKey} className="space-y-3">
                      {/* Date Heading */}
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "text-xs font-bold px-3 py-1 rounded-xl border",
                            isDateToday
                              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                              : "bg-muted text-foreground border-border/80"
                          )}
                        >
                          {dateObj.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          ({dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"})
                        </span>
                      </div>

                      {/* Day Tasks List */}
                      <div className="space-y-2 pl-2">
                        {dayTasks.map((task) => {
                          const isDone = task.status === "completed";
                          const taskProject = projects.find((p) => p.id === task.project_id);

                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-4",
                                isDone
                                  ? "border-border/40 bg-muted/20 opacity-70"
                                  : "border-border bg-background hover:bg-muted/30 shadow-card"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => void handleToggleTask(task.id)}
                                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 hover:stroke-primary" />
                                  )}
                                </button>

                                <span
                                  className={cn(
                                    "text-xs font-semibold text-foreground truncate",
                                    isDone && "line-through text-muted-foreground font-normal"
                                  )}
                                >
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {taskProject && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border/60">
                                    {taskProject.name}
                                  </span>
                                )}
                                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border", getPriorityColor(task.priority))}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
