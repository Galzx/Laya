import React from "react";
import { Bot, ArrowRight, Sparkles } from "lucide-react";
import type { WidgetProps } from "../types";

export const SammiBriefingWidget: React.FC<WidgetProps> = ({
  tasks,
  aggregates,
  onNavigateTab,
}) => {
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

  const todayTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived" && isToday(t.due_date));
  const overdueCount = aggregates?.overdue_tasks ?? 0;

  const getBriefingText = () => {
    if (overdueCount > 0 && todayTasks.length > 0) {
      return `You have ${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} scheduled for today, along with ${overdueCount} overdue item${overdueCount === 1 ? "" : "s"}. Rescheduling overdue tasks first will give you a clear roadmap for the day.`;
    }
    if (todayTasks.length > 0) {
      return `You have ${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} scheduled for today. Starting your highest-priority item now will build great momentum!`;
    }
    return "Your schedule is clear for today! Great time to review your long-term projects or capture fresh notes.";
  };

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between hover:border-border/80 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
                Sammi Briefing
              </h3>
              <span className="text-[10px] text-muted-foreground">Local intelligence</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
            100% Offline
          </span>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs text-foreground/90 space-y-2">
          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Morning Productivity Memo</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {getBriefingText()}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigateTab("ai")}
        className="inline-flex items-center justify-between gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer pt-2 border-t border-border/40 w-full"
      >
        <span>Ask Sammi to break down a complex goal</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
};

