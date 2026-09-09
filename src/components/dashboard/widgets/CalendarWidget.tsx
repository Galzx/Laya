import React, { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { WidgetProps } from "../types";

export const CalendarWidget: React.FC<WidgetProps> = ({
  tasks,
  onNavigateTab,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Map tasks by day of month
  const tasksByDay = tasks.reduce((acc, task) => {
    if (!task.due_date || task.status === "archived") return acc;
    const taskDate = new Date(task.due_date * 1000);
    if (taskDate.getFullYear() === year && taskDate.getMonth() === month) {
      const d = taskDate.getDate();
      acc[d] = (acc[d] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  const selectedDateTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "archived") return false;
    const taskDate = new Date(t.due_date * 1000);
    return (
      taskDate.getFullYear() === year &&
      taskDate.getMonth() === month &&
      taskDate.getDate() === selectedDay
    );
  });

  const monthName = currentDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {monthName}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          <div className="grid grid-cols-7 text-center">
            {weekDays.map((d, i) => (
              <span key={i} className="text-[10px] font-semibold text-muted-foreground/70 py-0.5">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = isCurrentMonth && today.getDate() === day;
              const isSelected = selectedDay === day;
              const taskCount = tasksByDay[day] || 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-xs font-medium flex flex-col items-center justify-center relative transition-all cursor-pointer mx-auto",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : isToday
                      ? "bg-primary/15 text-primary font-bold border border-primary/40"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span>{day}</span>
                  {taskCount > 0 && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Snippet */}
        <div className="pt-2 border-t border-border/50 text-xs">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
            Agenda for {new Date(year, month, selectedDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })}:
          </p>
          {selectedDateTasks.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/80 italic">No scheduled tasks for this date.</p>
          ) : (
            <ul className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
              {selectedDateTasks.slice(0, 3).map((t) => (
                <li key={t.id} className="truncate text-[11px] text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigateTab("calendar")}
        className="inline-flex items-center justify-between text-xs font-semibold text-primary hover:underline cursor-pointer pt-2 border-t border-border/40 w-full"
      >
        <span>Open full calendar</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
};

