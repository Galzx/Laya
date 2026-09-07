import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Flame,
  Clock,
  FolderKanban,
  Copy,
  Check,
  Award,
  Zap,
  Bot,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { playTaskPopSound, playSweepSound } from "../../lib/sound";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";

interface AnalyticsViewProps {
  workspaceId: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ workspaceId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [copiedToast, setCopiedToast] = useState(false);

  // Load focus stats from localStorage
  const sessionsToday = parseInt(localStorage.getItem("laya-focus-sessions-today") || "0", 10);
  const minutesToday = parseInt(localStorage.getItem("laya-focus-minutes-today") || "0", 10);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedTasks, fetchedProjects] = await Promise.all([
          invoke<Task[]>("get_tasks", { workspaceId }).catch(() => [] as Task[]),
          invoke<Project[]>("get_projects", { workspaceId }).catch(() => [] as Project[]),
        ]);
        setTasks(fetchedTasks);
        setProjects(fetchedProjects);
      } catch (err) {
        console.error("Failed to load analytics data:", err);
      }
    }
    if (workspaceId) void loadData();

    const handleTasksChanged = () => {
      if (workspaceId) void loadData();
    };
    window.addEventListener("laya:tasks-changed", handleTasksChanged);
    return () => window.removeEventListener("laya:tasks-changed", handleTasksChanged);
  }, [workspaceId]);

  // ─── 1. WEEKLY VELOCITY BREAKDOWN (Last 7 Days) ───
  const weeklyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000;
      const endOfDay = startOfDay + 86400;

      // Filter tasks updated/completed on this day
      const completedOnDay = tasks.filter((t) => {
        if (t.status !== "completed") return false;
        const time = t.completed_at || t.updated_at;
        return time >= startOfDay && time < endOfDay;
      }).length;

      const isToday = i === 0;

      result.push({
        dayName: days[d.getDay()],
        dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
        completed: completedOnDay,
        isToday,
      });
    }

    return result;
  }, [tasks]);

  const maxCompletedInWeek = Math.max(1, ...weeklyData.map((d) => d.completed));
  const peakDay = weeklyData.reduce((max, d) => (d.completed > max.completed ? d : max), weeklyData[0]);

  // ─── 2. AGGREGATE METRICS ───
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived").length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "completed" || t.status === "archived" || !t.due_date) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(t.due_date * 1000) < startOfToday;
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Productivity Score (0 - 100)
  const productivityScore = useMemo(() => {
    if (totalTasks === 0) return 85;
    const rateScore = completionRate * 0.45;
    const overduePenalty = Math.max(0, 30 - overdueTasks * 6);
    const focusBonus = Math.min(25, sessionsToday * 6);
    return Math.min(100, Math.max(20, Math.round(rateScore + overduePenalty + focusBonus)));
  }, [totalTasks, completionRate, overdueTasks, sessionsToday]);

  const getScoreStatus = (score: number) => {
    if (score >= 90) return { label: "In The Zone", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (score >= 75) return { label: "High Momentum", color: "text-primary", bg: "bg-primary/10 border-primary/30" };
    if (score >= 50) return { label: "Steady Flow", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" };
    return { label: "Building Rhythm", color: "text-muted-foreground", bg: "bg-muted border-border" };
  };

  const scoreStatus = getScoreStatus(productivityScore);

  // ─── 3. PROJECT FOCUS TIME DISTRIBUTION ───
  const projectDistribution = useMemo(() => {
    const counts: Record<string, { name: string; color: string; count: number }> = {};

    projects.forEach((p) => {
      counts[p.id] = { name: p.name, color: p.color, count: 0 };
    });

    tasks.forEach((t) => {
      if (t.project_id && counts[t.project_id]) {
        counts[t.project_id].count += 1;
      }
    });

    const unassignedCount = tasks.filter((t) => !t.project_id).length;
    const items = Object.values(counts);

    if (unassignedCount > 0) {
      items.push({ name: "General / Quick Tasks", color: "gray", count: unassignedCount });
    }

    const total = tasks.length || 1;
    return items
      .map((item) => ({
        ...item,
        percentage: Math.round((item.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [tasks, projects]);

  // ─── 4. COPY WEEKLY MARKDOWN REPORT ───
  const handleCopyMarkdownReport = () => {
    playTaskPopSound();

    const report = `# Laya Weekly Productivity Report
**Date:** ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
**Productivity Score:** ${productivityScore}/100 (${scoreStatus.label})

---

### Weekly Highlights
- **Total Completed Tasks:** ${completedTasks}
- **Active Pending Tasks:** ${activeTasks}
- **Overdue Items:** ${overdueTasks}
- **Focus Sessions Logged:** ${sessionsToday} session(s) (${minutesToday} minutes)
- **Peak Productivity Day:** ${peakDay.dayName} (${peakDay.completed} completed)

---

### Project Allocation
${projectDistribution.map((p) => `- **${p.name}:** ${p.count} task(s) (${p.percentage}%)`).join("\n")}

---
*Generated with Laya Local-First Workspace*`;

    navigator.clipboard.writeText(report);
    setCopiedToast(true);
    playSweepSound();
    setTimeout(() => setCopiedToast(false), 2500);
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-6 animate-smooth-in select-none">
      {/* ─── 1. HEADER WITH REPORT EXPORT BUTTON ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Weekly Insights & Analytics</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                100% Private Offline
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Local execution metrics, velocity trends, and project time distribution.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyMarkdownReport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs"
        >
          {copiedToast ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copiedToast ? "Report Copied to Clipboard!" : "Copy Weekly Report"}</span>
        </button>
      </div>

      {/* ─── 2. TOP METRICS & PRODUCTIVITY SCORE GAUGE ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productivity Score Card */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Productivity Score</span>
            <Award className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foreground">{productivityScore}</span>
            <span className="text-xs text-muted-foreground font-mono">/100</span>
          </div>
          <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border w-fit", scoreStatus.bg, scoreStatus.color)}>
            {scoreStatus.label}
          </span>
        </div>

        {/* Tasks Completed */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Completed Tasks</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foreground">{completedTasks}</span>
            <span className="text-xs text-muted-foreground">of {totalTasks} total</span>
          </div>
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Focus Time */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Focus Time Today</span>
            <Clock className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foreground">
              {minutesToday > 60 ? `${Math.floor(minutesToday / 60)}h ${minutesToday % 60}m` : `${minutesToday}m`}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {sessionsToday} session{sessionsToday === 1 ? "" : "s"} logged
          </span>
        </div>

        {/* Daily Momentum & Streak */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Completion Velocity</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foreground">{activeTasks}</span>
            <span className="text-xs text-muted-foreground">active in queue</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {overdueTasks === 0 ? "Zero overdue tasks" : `${overdueTasks} overdue item(s)`}
          </span>
        </div>
      </div>

      {/* ─── 3. INTERACTIVE VELOCITY CHART & PROJECT ALLOCATION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Weekly Completion Velocity Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 p-6 bg-card border border-border rounded-2xl shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span>Weekly Task Velocity (Last 7 Days)</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tasks completed per day. Peak day: <span className="font-semibold text-foreground">{peakDay.dayName}</span>.
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
              Max: {maxCompletedInWeek} / day
            </span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="flex items-end justify-between gap-3 h-44 pt-4 px-2">
            {weeklyData.map((d, idx) => {
              const heightPercent = maxCompletedInWeek > 0 ? (d.completed / maxCompletedInWeek) * 100 : 0;
              const isPeak = d.completed === maxCompletedInWeek && d.completed > 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                    {d.completed}
                  </span>

                  {/* Vertical Bar Container */}
                  <div className="w-full max-w-[36px] bg-muted/40 rounded-xl overflow-hidden flex flex-col justify-end h-28 p-1 border border-border/40">
                    <div
                      className={cn(
                        "w-full rounded-lg transition-all duration-500",
                        isPeak
                          ? "bg-primary shadow-xs"
                          : d.isToday
                          ? "bg-emerald-500/80"
                          : "bg-primary/40 group-hover:bg-primary/70"
                      )}
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                    />
                  </div>

                  {/* Day Label */}
                  <div className="text-center">
                    <span className={cn("text-[11px] font-semibold block", d.isToday ? "text-primary" : "text-muted-foreground")}>
                      {d.dayName}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground/60 block">
                      {d.dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Time Distribution (5 Cols) */}
        <div className="lg:col-span-5 p-6 bg-card border border-border rounded-2xl shadow-card space-y-5 h-full">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Project Distribution
              </h3>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {projects.length} project(s)
            </span>
          </div>

          <div className="space-y-3.5">
            {projectDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-8 text-center">
                No active projects or tasks to distribute.
              </p>
            ) : (
              projectDistribution.slice(0, 5).map((p, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[180px]">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                      <span>{p.count} tasks</span>
                      <span>({p.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, p.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. SAMMI EXECUTIVE SUMMARY & RECOMMENDATIONS ─── */}
      <div className="p-6 bg-card border border-border rounded-2xl shadow-card space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Sammi Automated Weekly Summary & Next Actions
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Local analysis of your workflow habits and momentum.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Key Accomplishment</span>
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You completed {completedTasks} task(s) with an overall completion efficiency of {completionRate}%.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              <span>Deep Work Rhythm</span>
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Logged {minutesToday} focus minute(s) across {sessionsToday} session(s) today.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>Next Week Recommendation</span>
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {overdueTasks > 0
                ? `Prioritize clearing your ${overdueTasks} overdue item(s) to boost momentum.`
                : "Great discipline! Schedule your top 3 milestone goals in the Calendar for next week."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

