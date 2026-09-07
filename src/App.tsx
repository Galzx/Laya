import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sidebar, TabId } from "./components/layout/Sidebar";
import { TasksView, type Task } from "./components/tasks/TasksView";
import { ProjectsView, type Project } from "./components/projects/ProjectsView";
import { NotesView } from "./components/notes/NotesView";
import type { Note } from "./components/notes/NoteEditor";
import { CalendarView } from "./components/calendar/CalendarView";
import { FocusView } from "./components/focus/FocusView";
import { AiView } from "./components/ai/AiView";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { SettingsView } from "./components/settings/SettingsView";
import { CommandPalette } from "./components/command/CommandPalette";
import { QuickTaskModal } from "./components/common/QuickTaskModal";
import { applyTheme } from "./lib/theme";
import { setSoundProfile, setTidySoundProfile, setSoundEnabled, playTaskPopSound, playSweepSound } from "./lib/sound";
import { matchesShortcut, getSavedShortcuts, type ShortcutCombo } from "./lib/shortcuts";
import {
  CheckSquare,
  Columns3,
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
  TrendingUp,
  Search,
  CheckCircle2,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Moon,
  ArrowUp,
} from "lucide-react";
import { cn } from "./lib/utils";

interface SystemStatus {
  status: string;
  engine: string;
  timestamp: number;
  offline_ready: boolean;
  db_connected: boolean;
}

interface SettingItem {
  key: string;
  value: string;
  updated_at: number;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  is_active: number;
  created_at: number;
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
    id: "kanban",
    label: "Kanban",
    description: "Agile 4-column drag and drop board",
    icon: Columns3,
    accentColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white",
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
  {
    id: "analytics",
    label: "Analytics",
    description: "Weekly velocity & focus distribution",
    icon: TrendingUp,
    accentColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [, setSettings] = useState<SettingItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [newDashboardTaskTitle, setNewDashboardTaskTitle] = useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<Record<string, ShortcutCombo>>(() => getSavedShortcuts());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });

  // Responsive resize handler to automatically adapt sidebar on compact windows
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 850) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainScrollRef = React.useRef<HTMLElement | null>(null);

  const toggleThemeMode = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "linen" : "midnight";
    applyTheme(nextTheme);
    setIsDarkTheme(!isDark);
    void invoke("update_setting", { key: "theme", value: nextTheme }).catch(() => {});
  };

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    if (scrollHeight > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)));
    } else {
      setScrollProgress(0);
    }
    setShowScrollTop(scrollTop > 240);
  };

  const scrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const activeWorkspace = workspaces.find((w) => w.is_active === 1) || workspaces[0];

  // Listen for shortcuts configuration changes
  useEffect(() => {
    const handleShortcutsUpdated = () => {
      setShortcuts(getSavedShortcuts());
    };
    window.addEventListener("laya:shortcuts-updated", handleShortcutsUpdated);
    return () => window.removeEventListener("laya:shortcuts-updated", handleShortcutsUpdated);
  }, []);

  // Central Global Hotkey Dispatcher
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Open Command Palette
      if (shortcuts.open_command_palette && matchesShortcut(e, shortcuts.open_command_palette)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Quick Task Capture
      if (shortcuts.open_quick_task && matchesShortcut(e, shortcuts.open_quick_task)) {
        e.preventDefault();
        setIsQuickTaskOpen((prev) => !prev);
        return;
      }

      // 3. Navigation shortcuts
      if (shortcuts.nav_dashboard && matchesShortcut(e, shortcuts.nav_dashboard)) {
        e.preventDefault();
        setActiveTab("dashboard");
        return;
      }
      if (shortcuts.nav_tasks && matchesShortcut(e, shortcuts.nav_tasks)) {
        e.preventDefault();
        setActiveTab("tasks");
        return;
      }
      if (shortcuts.nav_kanban && matchesShortcut(e, shortcuts.nav_kanban)) {
        e.preventDefault();
        setActiveTab("kanban");
        return;
      }
      if (shortcuts.nav_projects && matchesShortcut(e, shortcuts.nav_projects)) {
        e.preventDefault();
        setActiveTab("projects");
        return;
      }
      if (shortcuts.nav_focus && matchesShortcut(e, shortcuts.nav_focus)) {
        e.preventDefault();
        setActiveTab("focus");
        return;
      }
      if (shortcuts.nav_analytics && matchesShortcut(e, shortcuts.nav_analytics)) {
        e.preventDefault();
        setActiveTab("analytics");
        return;
      }
      if (shortcuts.nav_notes && matchesShortcut(e, shortcuts.nav_notes)) {
        e.preventDefault();
        setActiveTab("notes");
        return;
      }
      if (shortcuts.nav_calendar && matchesShortcut(e, shortcuts.nav_calendar)) {
        e.preventDefault();
        setActiveTab("calendar");
        return;
      }
      if (shortcuts.nav_ai && matchesShortcut(e, shortcuts.nav_ai)) {
        e.preventDefault();
        setActiveTab("ai");
        return;
      }
      if (shortcuts.nav_settings && matchesShortcut(e, shortcuts.nav_settings)) {
        e.preventDefault();
        setActiveTab("settings");
        return;
      }

      // 4. Start / Pause Focus Timer
      if (shortcuts.toggle_timer && matchesShortcut(e, shortcuts.toggle_timer)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("laya:toggle-timer"));
        return;
      }

      // 5. Toggle Light/Dark Theme
      if (shortcuts.toggle_theme && matchesShortcut(e, shortcuts.toggle_theme)) {
        e.preventDefault();
        const isDark = document.documentElement.classList.contains("dark");
        const nextTheme = isDark ? "linen" : "midnight";
        applyTheme(nextTheme);
        void invoke("update_setting", { key: "theme", value: nextTheme }).catch(() => {});
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [shortcuts]);

  const loadDashboardData = useCallback(async () => {
    const wsId = activeWorkspace?.id || "ws-default-primary";
    try {
      const [taskRes, projRes, noteRes] = await Promise.all([
        invoke<Task[]>("get_tasks", { workspaceId: wsId }).catch(() => [] as Task[]),
        invoke<Project[]>("get_projects", { workspaceId: wsId }).catch(() => [] as Project[]),
        invoke<Note[]>("get_notes", { workspaceId: wsId }).catch(() => [] as Note[]),
      ]);
      setTasks(taskRes);
      setProjects(projRes);
      setNotes(noteRes);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
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
        setIsDarkTheme(document.documentElement.classList.contains("dark"));

        // Apply user's saved sound profile & preferences
        const sfxSetting = settingsRes.find((s) => s.key === "sfx_profile")?.value;
        if (sfxSetting) setSoundProfile(sfxSetting);
        const tidySetting = settingsRes.find((s) => s.key === "tidy_sfx_profile")?.value;
        if (tidySetting) setTidySoundProfile(tidySetting);
        const soundEnabledSetting = settingsRes.find((s) => s.key === "sound_effects")?.value;
        if (soundEnabledSetting !== undefined) setSoundEnabled(soundEnabledSetting === "true");

        // Load initial workspace data
        const wsId = wsRes.find((w) => w.is_active === 1)?.id || wsRes[0]?.id || "ws-default-primary";
        const [taskRes, projRes, noteRes] = await Promise.all([
          invoke<Task[]>("get_tasks", { workspaceId: wsId }).catch(() => [] as Task[]),
          invoke<Project[]>("get_projects", { workspaceId: wsId }).catch(() => [] as Project[]),
          invoke<Note[]>("get_notes", { workspaceId: wsId }).catch(() => [] as Note[]),
        ]);
        setTasks(taskRes);
        setProjects(projRes);
        setNotes(noteRes);
      } catch (err) {
        console.error("Database initialization check failed:", err);
        setInitializationError(String(err));
      } finally {
        setLoading(false);
      }
    }
    void initAppData();
  }, []);

  // Listen to global tasks/notes/projects changed events for instant real-time sync
  useEffect(() => {
    void loadDashboardData();

    const handleSync = () => {
      void loadDashboardData();
    };

    window.addEventListener("laya:tasks-changed", handleSync);
    window.addEventListener("laya:notes-changed", handleSync);
    window.addEventListener("laya:projects-changed", handleSync);
    return () => {
      window.removeEventListener("laya:tasks-changed", handleSync);
      window.removeEventListener("laya:notes-changed", handleSync);
      window.removeEventListener("laya:projects-changed", handleSync);
    };
  }, [loadDashboardData, activeTab]);

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
  const completedTodayCount = tasks.filter((t) => {
    if (t.status !== "completed") return false;
    const todayStart = new Date().setHours(0, 0, 0, 0) / 1000;
    return t.updated_at >= todayStart;
  }).length;

  const focusMinutesToday = parseInt(localStorage.getItem("laya-focus-minutes-today") || "0", 10);
  const focusSessionsToday = parseInt(localStorage.getItem("laya-focus-sessions-today") || "0", 10);

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
      void loadDashboardData();
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
      await loadDashboardData();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to create task for today from dashboard:", err);
    }
  };

  const handleRescheduleOverdueTask = async (task: Task) => {
    playSweepSound();
    const todayNoonEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
    try {
      await invoke("update_task", {
        taskId: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: todayNoonEpoch,
        projectId: task.project_id,
      });
      await loadDashboardData();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
    } catch (err) {
      console.error("Failed to reschedule overdue task:", err);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Accessible Skip to Content Link for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3.5 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-dialog focus:text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to main content
      </a>

      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        todayTaskCount={todayTasks.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <main
        id="main-content"
        ref={mainScrollRef}
        onScroll={handleMainScroll}
        className={cn(
          "flex-1 flex flex-col h-screen min-w-0 transition-all duration-200 relative",
          activeTab === "settings" || activeTab === "projects" || activeTab === "notes" || activeTab === "focus" || activeTab === "ai"
            ? "overflow-hidden"
            : "overflow-y-auto"
        )}
      >
        <header className="h-12 border-b border-border px-3 sm:px-6 lg:px-8 flex items-center justify-between bg-card/60 backdrop-blur-sm sticky top-0 z-10 shrink-0 select-none gap-3 relative">
          {/* Scroll Depth Progress Bar */}
          {scrollProgress > 0 && (
            <div
              className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 z-30 pointer-events-none"
              aria-hidden="true"
            >
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 border border-transparent hover:border-border/60 transition-colors cursor-pointer shrink-0"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="h-4 w-4 text-primary" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            {/* Hierarchical Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="text-muted-foreground/75 hover:text-foreground font-medium transition-colors cursor-pointer shrink-0"
              >
                Workspace
              </button>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              <span className="text-foreground font-semibold capitalize tracking-wide truncate">
                {activeTab === "ai"
                  ? "Sammi Assistant"
                  : activeTab === "analytics"
                  ? "Insights & Analytics"
                  : activeTab === "kanban"
                  ? "Kanban Board"
                  : activeTab}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick-Search / Command Bar Trigger */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/70 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:border-primary/40 group"
              title="Open Command Palette (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <span className="hidden sm:inline text-[11px] font-medium">Search or command…</span>
              <kbd className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground font-semibold">
                Ctrl K
              </kbd>
            </button>

            {/* 1-Click Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleThemeMode}
              className="p-1.5 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
              aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDarkTheme ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
              )}
            </button>

            {systemStatus && !systemStatus.db_connected ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="hidden sm:inline">Storage unavailable</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="hidden sm:inline">Local-First</span>
              </span>
            )}
          </div>
        </header>

        <div className={cn(
          "w-full max-w-7xl mx-auto transition-all duration-200",
          activeTab === "settings" || activeTab === "projects" || activeTab === "notes" || activeTab === "focus" || activeTab === "ai"
            ? "flex-1 min-h-0 overflow-hidden p-3 sm:p-5 lg:p-6 h-full"
            : "flex-1 p-3 sm:p-5 lg:p-6"
        )}>
          {activeTab === "dashboard" && (
            <div className="w-full space-y-4 sm:space-y-6 lg:space-y-7 animate-smooth-in">
              {initializationError && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-sm text-rose-700 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Storage could not be reached. Local data may be unavailable.</span>
                </div>
              )}

              {/* ─── 1. HERO GREETING & QUICK ACTION BAR ─── */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pt-1 border-b border-border/50 pb-4 sm:pb-5">
                <div className="space-y-1 sm:space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <p className="text-xs text-muted-foreground font-medium">{formatDate()}</p>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Sparkles className="h-3 w-3" />
                      {todayTasks.length === 0
                        ? "Schedule is clear"
                        : `${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} due today`}
                    </span>
                    {overdueTasks.length > 0 && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                          <Clock className="h-3 w-3" />
                          {overdueTasks.length} overdue
                        </span>
                      </>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">
                    {loading ? "Loading…" : `${getGreeting()}.`}
                  </h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("focus")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Start Focus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("tasks")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs"
                  >
                    <span>Tasks</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </button>
                </div>
              </div>

              {/* ─── 2. FOUR-METRIC GLANCE MATRIX ─── */}
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
                {/* Today's Tasks */}
                <div
                  onClick={() => setActiveTab("tasks")}
                  className="p-3.5 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between space-y-2 sm:space-y-3 min-w-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Today's Focus</span>
                    <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">{todayTasks.length}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">due today</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                    {completedTodayCount} completed today
                  </span>
                </div>

                {/* Focus Time */}
                <div
                  onClick={() => setActiveTab("focus")}
                  className="p-3.5 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:border-rose-500/40 transition-all cursor-pointer group flex flex-col justify-between space-y-2 sm:space-y-3 min-w-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Focus Logged</span>
                    <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                      {focusMinutesToday > 60 ? `${Math.floor(focusMinutesToday / 60)}h ${focusMinutesToday % 60}m` : `${focusMinutesToday}m`}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                    {focusSessionsToday} session{focusSessionsToday === 1 ? "" : "s"} completed
                  </span>
                </div>

                {/* Active Projects */}
                <div
                  onClick={() => setActiveTab("projects")}
                  className="p-3.5 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between space-y-2 sm:space-y-3 min-w-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Active Projects</span>
                    <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">{projects.length}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">in workspace</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                    {notes.length} saved note{notes.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Analytics & Velocity */}
                <div
                  onClick={() => setActiveTab("analytics")}
                  className="p-3.5 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl border border-border bg-card shadow-card hover:border-teal-500/40 transition-all cursor-pointer group flex flex-col justify-between space-y-2 sm:space-y-3 min-w-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Velocity</span>
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-500 group-hover:scale-110 transition-transform shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                      {tasks.filter((t) => t.status === "completed").length}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">total closed</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-primary flex items-center gap-1 font-medium truncate">
                    <span>Open Analytics</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </span>
                </div>
              </div>

              {/* ─── 3. COMMAND CENTER ─── */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* LEFT: Today's Focus Action Checklist */}
                <div className="xl:col-span-7 bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 sm:space-y-5 min-w-0">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Today's Action Checklist
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
                    </span>
                  </div>

                  {/* Fast Inline Task Creator */}
                  <form onSubmit={handleCreateDashboardTodayTask} className="relative flex items-center">
                    <input
                      type="text"
                      value={newDashboardTaskTitle}
                      onChange={(e) => setNewDashboardTaskTitle(e.target.value)}
                      placeholder="＋ Add task due today… (press Enter)"
                      className="w-full bg-muted/40 border border-border rounded-xl px-3 sm:px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
                    />
                    {newDashboardTaskTitle.trim() && (
                      <button
                        type="submit"
                        className="absolute right-2 p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                        title="Add task"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </form>

                  {/* Tasks List */}
                  {todayTasks.length === 0 ? (
                    <div className="py-6 sm:py-8 text-center space-y-2 border border-dashed border-border/80 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-500/80 mx-auto" />
                      <p className="text-sm font-semibold text-foreground">You're all caught up for today!</p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        No pending tasks due today. Add a new task above or launch a Focus session.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {todayTasks.slice(0, 6).map((task) => (
                        <li
                          key={task.id}
                          className="group flex items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-all text-xs min-w-0"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => void handleToggleDashboardTask(task)}
                              className="text-muted-foreground hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                              title="Mark complete"
                            >
                              <Circle className="h-4 w-4" />
                            </button>
                            <span
                              onClick={() => setActiveTab("tasks")}
                              className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors flex-1"
                              title={task.title}
                            >
                              {task.title}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md border border-border text-muted-foreground shrink-0">
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

                  {/* Overdue Recovery Glance */}
                  {overdueTasks.length > 0 && (
                    <div className="pt-3 border-t border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                        <span className="flex items-center gap-1.5 font-bold text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Overdue Recovery ({overdueTasks.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("tasks")}
                          className="text-[11px] hover:underline cursor-pointer font-medium"
                        >
                          View in Tasks
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {overdueTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20"
                          >
                            <span className="truncate flex-1 font-medium text-foreground/90">{t.title}</span>
                            <button
                              type="button"
                              onClick={() => void handleRescheduleOverdueTask(t)}
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer shrink-0"
                            >
                              Reschedule to Today
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Focus Launch & Sammi Daily Briefing (stacks on wide, 2-col side-by-side on medium) */}
                <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-5 min-w-0">
                  {/* Focus Session Quick-Launch Card */}
                  <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-3 sm:space-y-4 min-w-0 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-rose-500" />
                          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Deep Work Launchpad
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                          25m
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Lock in with ambient background soundscapes and procedural focus alarms.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("focus")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      <Flame className="h-4 w-4" />
                      <span>Launch Focus Timer</span>
                    </button>
                  </div>

                  {/* Sammi AI Briefing Card */}
                  <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-3 min-w-0 flex flex-col justify-between">
                    <div className="space-y-2.5">
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

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {todayTasks.length > 0
                          ? `You have ${todayTasks.length} task(s) scheduled for today. Starting your first high-priority task now will build great momentum!`
                          : "Your schedule is clear today. Great time to review your projects or draft thoughts in Notes."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("ai")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer pt-1"
                    >
                      <span>Ask Sammi to break down a goal</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Active Projects Glance */}
                  {projects.length > 0 && (
                    <div className="sm:col-span-2 xl:col-span-1 bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-card space-y-3 min-w-0">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Active Projects
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("projects")}
                          className="text-[10px] text-primary hover:underline cursor-pointer"
                        >
                          View all ({projects.length})
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
                        {projects.slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setActiveTab("projects")}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 text-xs text-foreground cursor-pointer transition-colors min-w-0"
                          >
                            <span className="truncate font-medium flex-1 pr-2">{p.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground capitalize shrink-0">
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── 4. WORKSPACE AREAS QUICK JUMP GRID ─── */}
              <div className="pt-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 sm:mb-3.5">
                  Workspace Hubs
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                  {quickLinks.map(({ id, label, description, icon: Icon, accentColor }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className="group flex items-start gap-2.5 sm:gap-3.5 p-3 sm:p-4 bg-card border border-border rounded-xl sm:rounded-2xl text-left shadow-card hover:shadow-card-hover hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer min-w-0"
                    >
                      <span className={cn("mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-all duration-200 shrink-0 shadow-2xs", accentColor)}>
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {label}
                          </p>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block shrink-0" />
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <TasksView workspaceId={activeWorkspace?.id || "ws-default-primary"} initialViewMode="list" />
          )}

          {activeTab === "kanban" && (
            <TasksView workspaceId={activeWorkspace?.id || "ws-default-primary"} initialViewMode="kanban" />
          )}

          {activeTab === "projects" && (
            <ProjectsView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "notes" && (
            <NotesView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "calendar" && (
            <CalendarView workspaceId={activeWorkspace?.id || "ws-default-primary"} projects={projects} />
          )}

          {activeTab === "focus" && (
            <FocusView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "ai" && (
            <AiView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab === "settings" && (
            <SettingsView />
          )}
        </div>
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-2.5 rounded-2xl bg-card/95 hover:bg-card border border-border shadow-dialog text-foreground hover:text-primary backdrop-blur-sm transition-all animate-dialog-in cursor-pointer hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 no-print"
          title="Scroll back to top"
          aria-label="Scroll back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setActiveTab}
        workspaceId={activeWorkspace?.id || "ws-default-primary"}
      />

      <QuickTaskModal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        workspaceId={activeWorkspace?.id || "ws-default-primary"}
        projects={projects}
        onTaskCreated={() => void loadDashboardData()}
      />
    </div>
  );
}
