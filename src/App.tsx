import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sidebar, TabId } from "./components/layout/Sidebar";
import { TasksView, type Task } from "./components/tasks/TasksView";
import { ProjectsView } from "./components/projects/ProjectsView";
import { NotesView } from "./components/notes/NotesView";
import { CalendarView } from "./components/calendar/CalendarView";
import { FocusView } from "./components/focus/FocusView";
import { AiView } from "./components/ai/AiView";
import { SettingsView } from "./components/settings/SettingsView";
import { applyTheme } from "./lib/theme";
import { setSoundProfile, setTidySoundProfile, setSoundEnabled, playTaskPopSound } from "./lib/sound";
import {
  CheckSquare,
  FolderKanban,
  BookOpen,
  CalendarDays,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Sun,
  ShieldCheck,
  Circle,
  Plus,
  Clock,
  Flame,
  Bot,
} from "lucide-react";
import { cn } from "./lib/utils";

interface SystemStatus {
  status: string;
  engine: string;
  timestamp: number;
  offline_ready: boolean;
  db_connected: boolean;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

interface SettingItem {
  key: string;
  value: string;
  updated_at: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const quickLinks: {
  id: TabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}[] = [
  {
    id: "tasks",
    label: "Tasks",
    description: "Capture, organize, and plan your work",
    icon: CheckSquare,
    accentColor: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    id: "projects",
    label: "Projects",
    description: "Organise larger milestones and goals",
    icon: FolderKanban,
    accentColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
  },
  {
    id: "notes",
    label: "Notes",
    description: "Write and connect your daily thoughts",
    icon: BookOpen,
    accentColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Monthly agenda and scheduled deadlines",
    icon: CalendarDays,
    accentColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white",
  },
  {
    id: "focus",
    label: "Focus",
    description: "Pomodoro sessions & deep work timer",
    icon: Flame,
    accentColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
  },
  {
    id: "ai",
    label: "Sammi",
    description: "Local task deconstructor & smart assistant",
    icon: Bot,
    accentColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [, setSettings] = useState<SettingItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [newDashboardTaskTitle, setNewDashboardTaskTitle] = useState("");

  const activeWorkspace = workspaces.find((w) => w.is_active === 1) || workspaces[0];

  const loadDashboardTasks = useCallback(async () => {
    const wsId = activeWorkspace?.id || "ws-default-primary";
    try {
      const result = await invoke<Task[]>("get_tasks", { workspaceId: wsId });
      setTasks(result);
    } catch (err) {
      console.error("Failed to load dashboard tasks:", err);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    async function initAppData() {
      try {
        const [statusRes, wsRes, settingsRes] = await Promise.all([
          invoke<SystemStatus>("check_system_status"),
          invoke<Workspace[]>("get_workspaces"),
          invoke<SettingItem[]>("get_settings"),
        ]);
        setSystemStatus(statusRes);
        setWorkspaces(wsRes);
        setSettings(settingsRes);

        // Apply user's saved palette theme
        const themeSetting = settingsRes.find((s) => s.key === "theme")?.value || "linen";
        const accentSetting = settingsRes.find((s) => s.key === "accent_color")?.value;
        let mappedTheme = themeSetting;
        if (themeSetting === "light") mappedTheme = "linen";
        if (themeSetting === "dark") mappedTheme = "midnight";
        applyTheme(mappedTheme, accentSetting || undefined);

        // Apply user's saved sound profile & preferences
        const sfxSetting = settingsRes.find((s) => s.key === "sfx_profile")?.value;
        if (sfxSetting) setSoundProfile(sfxSetting);
        const tidySetting = settingsRes.find((s) => s.key === "tidy_sfx_profile")?.value;
        if (tidySetting) setTidySoundProfile(tidySetting);
        const soundEnabledSetting = settingsRes.find((s) => s.key === "sound_effects")?.value;
        if (soundEnabledSetting !== undefined) setSoundEnabled(soundEnabledSetting === "true");

        // Load initial tasks
        const wsId = wsRes.find((w) => w.is_active === 1)?.id || wsRes[0]?.id || "ws-default-primary";
        const initialTasks = await invoke<Task[]>("get_tasks", { workspaceId: wsId });
        setTasks(initialTasks);
      } catch (err) {
        console.error("Database initialization check failed:", err);
        setInitializationError(String(err));
      } finally {
        setLoading(false);
      }
    }
    void initAppData();
  }, []);

  // Listen to global tasks changed events and tab switches for instant real-time sync
  useEffect(() => {
    void loadDashboardTasks();

    const handleSync = () => {
      void loadDashboardTasks();
    };

    window.addEventListener("laya:tasks-changed", handleSync);
    return () => {
      window.removeEventListener("laya:tasks-changed", handleSync);
    };
  }, [loadDashboardTasks, activeTab]);

  const isToday = (task: Task) => {
    if (task.status === "completed" || task.status === "archived") return false;
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
    if (task.status === "completed" || task.status === "archived") return false;
    if (task.due_date === null) return false;
    const taskDate = new Date(task.due_date * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return taskDate < startOfToday;
  };

  const todayTasks = tasks.filter(isToday);
  const overdueTasks = tasks.filter(isOverdue);

  const handleToggleDashboardTask = async (task: Task) => {
    playTaskPopSound();
    const nextStatus: Task["status"] = task.status === "completed" ? "planned" : "completed";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    try {
      await invoke("toggle_task_status", { taskId: task.id });
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to toggle dashboard task:", err);
      void loadDashboardTasks();
    }
  };

  const handleCreateDashboardTodayTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashboardTaskTitle.trim()) return;
    const wsId = activeWorkspace?.id || "ws-default-primary";
    const todayNoonEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
    try {
      await invoke("create_task", {
        workspaceId: wsId,
        title: newDashboardTaskTitle.trim(),
        priority: "medium",
        dueDate: todayNoonEpoch,
      });
      setNewDashboardTaskTitle("");
      playTaskPopSound();
      await loadDashboardTasks();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create task for today from dashboard:", err);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        todayTaskCount={todayTasks.length}
      />

      <main className={cn(
        "flex-1 flex flex-col h-screen min-w-0",
        activeTab === "settings" || activeTab === "projects" || activeTab === "notes" ? "overflow-hidden" : "overflow-y-auto"
        activeTab === "settings" || activeTab === "projects" || activeTab === "notes" || activeTab === "focus" || activeTab === "ai"
          ? "overflow-hidden"
          : "overflow-y-auto"
      )}>
        <header className="h-12 border-b border-border px-6 lg:px-10 flex items-center justify-between bg-card/60 backdrop-blur-sm sticky top-0 z-10 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-medium capitalize tracking-wide">
              {activeTab}
              {activeTab === "ai" ? "Sammi Assistant" : activeTab}
            </p>
          </div>
          {systemStatus && !systemStatus.db_connected ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Storage unavailable
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Local-First Offline
            </span>
          )}
        </header>

        <div className={cn(
          "w-full max-w-7xl mx-auto",
          activeTab === "settings" || activeTab === "projects" || activeTab === "notes"
          activeTab === "settings" || activeTab === "projects" || activeTab === "notes" || activeTab === "focus" || activeTab === "ai"
            ? "flex-1 min-h-0 overflow-hidden p-6 lg:p-8 h-full"
            : "flex-1 p-6 lg:p-10"
        )}>
          {activeTab === "dashboard" && (
            <div className="w-full space-y-8 animate-smooth-in">
              {initializationError && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-sm text-rose-700 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Storage could not be reached. Local data may be unavailable.</span>
                </div>
              )}

              {/* Greeting & Date Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 border-b border-border/50 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground font-medium">{formatDate()}</p>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      {todayTasks.length === 0
                        ? "Day is clear"
                        : `${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} due today`}
                    </span>
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {loading ? "Loading…" : `${getGreeting()}.`}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-all duration-150 cursor-pointer shadow-xs w-fit"
                >
                  <span>Go to Tasks</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>

              {/* Quick Jump Section Cards */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Workspace Areas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {quickLinks.map(({ id, label, description, icon: Icon, accentColor }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className="group flex items-start gap-3.5 p-4 bg-card border border-border rounded-2xl text-left shadow-card hover:shadow-card-hover hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <span className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 shrink-0 shadow-2xs", accentColor)}>
                        <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Two-Column Glance: Today's Focus & Monthly Schedule */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Today's Focus</p>
                    </div>
                    <span className="text-xs font-mono font-medium text-muted-foreground">
                      {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
                    </span>
                  </div>

                  {/* Quick Add for Today directly from Dashboard */}
                  <form onSubmit={handleCreateDashboardTodayTask} className="relative flex items-center">
                    <input
                      type="text"
                      value={newDashboardTaskTitle}
                      onChange={(e) => setNewDashboardTaskTitle(e.target.value)}
                      placeholder="＋ Add a task due today… (press Enter)"
                      className="w-full bg-background/60 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                    />
                    {newDashboardTaskTitle.trim() && (
                      <button
                        type="submit"
                        className="absolute right-2 p-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                        title="Add task"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </form>

                  {todayTasks.length === 0 ? (
                    <div className="py-6 text-center space-y-1.5">
                      <p className="text-sm font-medium text-foreground">Your day is open</p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        No tasks scheduled for today. Type above to add one, or plan tasks in the workspace.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {todayTasks.slice(0, 6).map((task) => (
                        <li
                          key={task.id}
                          className="group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-background transition-all text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDashboardTask(task)}
                              className="text-muted-foreground hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                              title="Mark complete"
                            >
                              <Circle className="h-4 w-4" />
                            </button>
                            <span
                              onClick={() => setActiveTab("tasks")}
                              className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors flex-1"
                              title="Open in Tasks"
                            >
                              {task.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border border-border text-muted-foreground shrink-0">
                            {task.priority}
                          </span>
                        </li>
                      ))}
                      {todayTasks.length > 6 && (
                        <li
                          onClick={() => setActiveTab("tasks")}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors pt-1 text-center font-mono cursor-pointer"
                        >
                          +{todayTasks.length - 6} more tasks scheduled
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Overdue Section glance if any exist */}
                  {overdueTasks.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 mb-2">
                        <span className="flex items-center gap-1 font-semibold text-[11px]">
                          <Clock className="h-3 w-3" />
                          Recovery ({overdueTasks.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("tasks")}
                          className="text-[10px] hover:underline cursor-pointer"
                        >
                          View all
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {overdueTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-rose-500/5 border border-rose-500/20"
                          >
                            <span className="truncate flex-1 font-medium text-foreground/80">{t.title}</span>
                            <span className="text-[9px] uppercase font-semibold text-rose-500">Overdue</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab("tasks")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-all cursor-pointer pt-1"
                  >
                    Open Tasks workspace <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Calendar & Agenda</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Visualize upcoming task deadlines, review your monthly capacity, and inspect daily schedules with the calendar grid.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("calendar")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-all cursor-pointer pt-2"
                  >
                    Open Calendar overview <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <TasksView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "projects" && (
            <ProjectsView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "notes" && (
            <NotesView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "calendar" && (
            <CalendarView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "focus" && (
            <FocusView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "ai" && (
            <AiView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "settings" && (
            <SettingsView />
          )}

          {activeTab !== "dashboard" && activeTab !== "tasks" && activeTab !== "projects" && activeTab !== "notes" && activeTab !== "calendar" && activeTab !== "settings" && (
            <div className="w-full max-w-4xl mx-auto animate-smooth-in">
              <div className="border border-dashed border-border rounded-2xl p-16 text-center space-y-2">
                <p className="text-base font-semibold text-foreground capitalize">{activeTab}</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  This section is planned for an upcoming milestone.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
