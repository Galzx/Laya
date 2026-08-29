import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sun, X, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (dateString: string) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
  compact?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

function parseDateString(str: string): { year: number; month: number; day: number } | null {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function getTodayString(): string {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

function getTomorrowString(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

function getNextWeekendString(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  now.setDate(now.getDate() + daysUntilSaturday);
  return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

function getNextMondayString(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = (1 - day + 7) % 7 || 7;
  now.setDate(now.getDate() + daysUntilMonday);
  return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDisplayLabel(value: string, placeholder = "Set date"): { label: string; isToday: boolean; isOverdue: boolean } {
  if (!value) return { label: placeholder, isToday: false, isOverdue: false };
  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  if (value === todayStr) return { label: "Today", isToday: true, isOverdue: false };
  if (value === tomorrowStr) return { label: "Tomorrow", isToday: false, isOverdue: false };

  const parsed = parseDateString(value);
  if (!parsed) return { label: value, isToday: false, isOverdue: false };

  const dateObj = new Date(parsed.year, parsed.month, parsed.day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const isOverdue = dateObj < now;

  const formatted = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: parsed.year !== now.getFullYear() ? "numeric" : undefined,
  });

  return { label: formatted, isToday: false, isOverdue };
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Set date",
  className,
  align = "left",
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const parsedValue = parseDateString(value);
  const initialDate = parsedValue ? new Date(parsedValue.year, parsedValue.month, parsedValue.day) : new Date();

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Sync view when value changes
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = 355;

    // Vertical placement: flip upwards if overflowing window bottom
    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight && rect.top > popoverHeight + 12) {
      top = rect.top - popoverHeight - 6;
    } else if (top + popoverHeight > window.innerHeight) {
      top = Math.max(8, window.innerHeight - popoverHeight - 8);
    }

    // Horizontal placement
    let left = align === "right" ? rect.right - popoverWidth : rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setPopoverCoords({ top, left });
  }, [align]);

  // Position updates on open, resize, scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (year: number, month: number, day: number) => {
    onChange(formatDateString(year, month, day));
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Build calendar grid days
  const todayStr = getTodayString();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
  const mondayFirstIndex = (firstDayOfMonth + 6) % 7; // 0 is Mo, 6 is Su
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  interface CalendarCell {
    year: number;
    month: number;
    day: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }

  const cells: CalendarCell[] = [];

  // Previous month padding
  for (let i = mondayFirstIndex - 1; i >= 0; i--) {
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
      isSelected: dateStr === value,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatDateString(viewYear, viewMonth, d);
    cells.push({
      year: viewYear,
      month: viewMonth,
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === value,
    });
  }

  // Next month padding to fill grid
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
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
      isSelected: dateStr === value,
    });
  }

  const { label, isToday, isOverdue } = getDisplayLabel(value, placeholder);

  return (
    <div className={cn("inline-block text-left select-none", className)}>
      {/* Cozy Trigger Badge */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer",
          compact ? "px-2 py-1" : "px-2.5 py-1.5",
          value
            ? isOverdue
              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
              : isToday
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              : "bg-primary/10 border-primary/25 text-primary hover:bg-primary/15"
            : "bg-secondary text-secondary-foreground border-border hover:border-primary/30 hover:bg-secondary/80"
        )}
        title={value ? `Due: ${value}` : "Set due date"}
      >
        {isToday ? (
          <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        ) : (
          <CalendarIcon
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-colors",
              value ? (isOverdue ? "text-rose-500" : "text-primary") : "text-muted-foreground group-hover:text-foreground"
            )}
          />
        )}
        <span className="truncate">{label}</span>

        {value && (
          <span
            onClick={handleClear}
            className="ml-0.5 rounded-full p-0.5 text-muted-foreground/70 hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Clear date"
            role="button"
            tabIndex={-1}
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* Cute & Cozy Calendar Popover mounted via Portal to document.body (always floats above all elements) */}
      {isOpen && popoverCoords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              zIndex: 99999,
            }}
            className="w-72 rounded-2xl border border-border bg-card p-4 shadow-2xl backdrop-blur-md animate-smooth-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-border/60">
              <button
                type="button"
                onClick={() => { onChange(getTodayString()); setIsOpen(false); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-[11px] font-medium text-foreground transition-colors"
              >
                <Sun className="h-3 w-3 text-amber-500" /> Today
              </button>
              <button
                type="button"
                onClick={() => { onChange(getTomorrowString()); setIsOpen(false); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-[11px] font-medium text-foreground transition-colors"
              >
                <CalendarDays className="h-3 w-3 text-blue-500" /> Tomorrow
              </button>
              <button
                type="button"
                onClick={() => { onChange(getNextWeekendString()); setIsOpen(false); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-[11px] font-medium text-foreground transition-colors"
              >
                <Sparkles className="h-3 w-3 text-pink-500" /> Weekend
              </button>
              <button
                type="button"
                onClick={() => { onChange(getNextMondayString()); setIsOpen(false); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-[11px] font-medium text-foreground transition-colors"
              >
                <CalendarIcon className="h-3 w-3 text-purple-500" /> Next Week
              </button>
            </div>

            {/* Month / Year Navigator */}
            <div className="flex items-center justify-between pt-3 pb-2 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold tracking-wide text-foreground">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 text-center py-1">
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-[10px] font-medium text-muted-foreground/70">
                  {day}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center pt-1">
              {cells.map((cell, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cell.year, cell.month, cell.day)}
                  className={cn(
                    "h-7 w-7 mx-auto flex items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer",
                    cell.isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : cell.isToday
                      ? "ring-1 ring-primary/60 text-primary font-semibold hover:bg-primary/10"
                      : cell.isCurrentMonth
                      ? "text-foreground hover:bg-muted/80"
                      : "text-muted-foreground/30 hover:bg-muted/40"
                  )}
                >
                  {cell.day}
                </button>
              ))}
            </div>

            {/* Footer with Clear option */}
            {value && (
              <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-medium text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Remove due date
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>,
          document.body
        )
      }
    </div>
  );
};
