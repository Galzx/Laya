import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sun,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { Task } from "../tasks/TasksView";
import { playTaskPopSound } from "../../lib/sound";

interface CalendarViewProps {
  workspaceId: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ workspaceId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const now = new Date();
    return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
  });

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

  const handleToggleTask = async (taskId: string) => {
    try {
      const updated = await invoke<Task>("toggle_task_status", { taskId });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (updated.status === "completed") {
        playTaskPopSound();
      }
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to toggle task status from calendar:", err);
    }
  };

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(formatDateString(now.getFullYear(), now.getMonth(), now.getDate()));
  };

  // Build calendar grid
  const today = new Date();
  const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());

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

  const cells: DayCell[] = [];

  // Group tasks by date string
  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (task.due_date) {
      const d = new Date(task.due_date * 1000);
      const dateStr = formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(task);
    }
    return acc;
  }, {});

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const month = viewMonth === 0 ? 11 : viewMonth - 1;
    const year = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = formatDateString(year, month, day);
    cells.push({
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

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateString(viewYear, viewMonth, d);
    cells.push({
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
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const month = viewMonth === 11 ? 0 : viewMonth + 1;
    const year = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = formatDateString(year, month, d);
    cells.push({
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

  const selectedDateTasks = tasksByDate[selectedDateStr] || [];
  const [sYear, sMonth, sDay] = selectedDateStr.split("-").map(Number);
  const selectedDateObj = new Date(sYear, sMonth - 1, sDay);
  const isSelectedDateToday = selectedDateStr === todayStr;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-smooth-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Schedule deadlines, visualize capacity, and organize daily agendas.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold min-w-[120px] text-center text-foreground">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-xl hover:bg-muted/70 text-foreground transition-colors cursor-pointer shadow-2xs"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Layout: Month Grid + Selected Date Agenda Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Month Grid Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
          {/* Weekdays header */}
          <div className="grid grid-cols-7 gap-2 text-center pb-2 border-b border-border/60">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-xs font-medium text-muted-foreground">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          {loading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              Loading calendar events...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell, idx) => {
                const hasTasks = cell.tasks.length > 0;
                const openTasks = cell.tasks.filter((t) => t.status !== "completed");

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={cn(
                      "min-h-[76px] sm:min-h-[88px] p-2 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between group cursor-pointer",
                      cell.isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                        : cell.isToday
                        ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                        : cell.isCurrentMonth
                        ? "border-border/60 bg-background hover:bg-muted/50 hover:border-border"
                        : "border-transparent bg-muted/20 text-muted-foreground/40 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-semibold h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
                          cell.isToday
                            ? "bg-amber-500 text-white shadow-xs"
                            : cell.isSelected
                            ? "bg-primary text-primary-foreground"
                            : cell.isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                        )}
                      >
                        {cell.day}
                      </span>

                      {hasTasks && (
                        <span
                          className={cn(
                            "text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md",
                            openTasks.length > 0
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {cell.tasks.length}
                        </span>
                      )}
                    </div>

                    {/* Tiny Task Dots / Mini Pills */}
                    {hasTasks ? (
                      <div className="space-y-1 mt-1">
                        {cell.tasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className={cn(
                              "text-[10px] truncate px-1.5 py-0.5 rounded-md border",
                              t.status === "completed"
                                ? "bg-muted/80 text-muted-foreground line-through border-transparent"
                                : t.priority === "urgent"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium"
                                : "bg-secondary text-secondary-foreground border-border/60"
                            )}
                          >
                            {t.title}
                          </div>
                        ))}
                        {cell.tasks.length > 2 && (
                          <span className="text-[9px] text-muted-foreground pl-1 font-mono">
                            +{cell.tasks.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Agenda Panel */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col h-full space-y-4">
          <div className="border-b border-border/60 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isSelectedDateToday ? "Today's Agenda" : "Agenda"}
              </p>
              <h3 className="text-base font-semibold text-foreground">
                {selectedDateObj.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
            </div>
            {isSelectedDateToday && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <Sun className="h-3 w-3" /> Today
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground mb-1">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">No tasks scheduled</p>
                <p className="text-xs text-muted-foreground">
                  Enjoy your free time, or assign tasks to this date from the Tasks view.
                </p>
              </div>
            ) : (
              selectedDateTasks.map((task) => {
                const isCompleted = task.status === "completed";
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-xl border transition-all duration-150 flex items-start gap-2.5 group",
                      isCompleted
                        ? "border-border/40 bg-muted/20 opacity-75"
                        : "border-border bg-background hover:bg-muted/40 hover:border-border/90 shadow-2xs"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void handleToggleTask(task.id)}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                      title={isCompleted ? "Mark incomplete" : "Complete task"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 hover:stroke-primary" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-medium text-foreground truncate",
                          isCompleted && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      {task.next_action && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Next: {task.next_action}
                        </p>
                      )}
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border shrink-0",
                        task.priority === "urgent"
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          : task.priority === "high"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
