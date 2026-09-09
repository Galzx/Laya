import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sidebar, TabId } from "./components/layout/Sidebar";
import { TasksView, type Task } from "./components/tasks/TasksView";
import type { Project } from "./components/projects/ProjectsView";
import type { Note } from "./components/notes/NoteEditor";

const ProjectsView = React.lazy(() => import("./components/projects/ProjectsView").then((m) => ({ default: m.ProjectsView })));
const NotesView = React.lazy(() => import("./components/notes/NotesView").then((m) => ({ default: m.NotesView })));
const CalendarView = React.lazy(() => import("./components/calendar/CalendarView").then((m) => ({ default: m.CalendarView })));
const FocusView = React.lazy(() => import("./components/focus/FocusView").then((m) => ({ default: m.FocusView })));
const AiView = React.lazy(() => import("./components/ai/AiView").then((m) => ({ default: m.AiView })));
const AnalyticsView = React.lazy(() => import("./components/analytics/AnalyticsView").then((m) => ({ default: m.AnalyticsView })));
const SettingsView = React.lazy(() => import("./components/settings/SettingsView").then((m) => ({ default: m.SettingsView })));
const ResourcesView = React.lazy(() => import("./components/resources/ResourcesView").then((m) => ({ default: m.ResourcesView })));
import { CommandPalette } from "./components/command/CommandPalette";
import { QuickTaskModal } from "./components/common/QuickTaskModal";
import { ContactModal } from "./components/common/ContactModal";
import { CookieConsent } from "./components/common/CookieConsent";
import { NotFoundView } from "./components/common/NotFoundView";
const DashboardView = React.lazy(() => import("./components/dashboard/DashboardView").then((m) => ({ default: m.DashboardView })));
import { applyTheme } from "./lib/theme";
import { setSoundProfile, setTidySoundProfile, setSoundEnabled } from "./lib/sound";
import { matchesShortcut, getSavedShortcuts, type ShortcutCombo } from "./lib/shortcuts";
import {
  Sun,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Check,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Moon,
  ArrowUp,
  ShieldCheck,
  LifeBuoy,
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [, setSettings] = useState<SettingItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
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

  const todayTasks = tasks.filter(isToday);

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await invoke("set_active_workspace", { workspaceId });
      setWorkspaces((prev) =>
        prev.map((w) => ({
          ...w,
          is_active: w.id === workspaceId ? 1 : 0,
        }))
      );
      setIsWorkspaceMenuOpen(false);

      const [taskRes, projRes, noteRes] = await Promise.all([
        invoke<Task[]>("get_tasks", { workspaceId }).catch(() => [] as Task[]),
        invoke<Project[]>("get_projects", { workspaceId }).catch(() => [] as Project[]),
        invoke<Note[]>("get_notes", { workspaceId }).catch(() => [] as Note[]),
      ]);
      setTasks(taskRes);
      setProjects(projRes);
      setNotes(noteRes);
      window.dispatchEvent(new CustomEvent("laya:workspace-changed", { detail: { workspaceId } }));
    } catch (err) {
      console.error("Failed to switch workspace:", err);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const created = await invoke<Workspace>("create_workspace", {
        name: newWorkspaceName.trim(),
        description: null,
      });
      setWorkspaces((prev) => [...prev, created]);
      setNewWorkspaceName("");
      setIsCreatingWorkspace(false);
      await handleSwitchWorkspace(created.id);
    } catch (err) {
      console.error("Failed to create workspace:", err);
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

            {/* Hierarchical Breadcrumbs & Workspace Switcher */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted font-medium text-foreground text-xs cursor-pointer border border-transparent hover:border-border/60 transition-colors"
                  title="Switch workspace"
                >
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold truncate max-w-[150px]">
                    {activeWorkspace?.name || "Personal Workspace"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {isWorkspaceMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsWorkspaceMenuOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 w-64 bg-card border border-border rounded-2xl shadow-dialog z-50 p-2 space-y-1 animate-smooth-in">
                      <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase px-2 py-1">
                        Select Workspace
                      </p>
                      <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {workspaces.map((ws) => {
                          const isCurrent = ws.id === activeWorkspace?.id;
                          return (
                            <button
                              key={ws.id}
                              type="button"
                              onClick={() => void handleSwitchWorkspace(ws.id)}
                              className={cn(
                                "w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer",
                                isCurrent
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-muted text-foreground"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{ws.name}</p>
                                {ws.description && (
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {ws.description}
                                  </p>
                                )}
                              </div>
                              {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1.5 border-t border-border/60">
                        {isCreatingWorkspace ? (
                          <form onSubmit={handleCreateWorkspace} className="space-y-1.5 p-1">
                            <input
                              type="text"
                              value={newWorkspaceName}
                              onChange={(e) => setNewWorkspaceName(e.target.value)}
                              placeholder="Workspace name..."
                              autoFocus
                              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => setIsCreatingWorkspace(false)}
                                className="px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold cursor-pointer"
                              >
                                Create
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsCreatingWorkspace(true)}
                            className="w-full flex items-center gap-1.5 p-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>New Workspace</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="text-muted-foreground/75 hover:text-foreground font-medium transition-colors cursor-pointer shrink-0"
              >
                Dashboard
              </button>
              {activeTab !== "dashboard" && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <span className="text-foreground font-semibold capitalize tracking-wide truncate">
                    {activeTab === "ai"
                      ? "Sammi Assistant"
                      : activeTab === "analytics"
                      ? "Insights & Analytics"
                      : activeTab === "kanban"
                      ? "Kanban Board"
                      : activeTab === "resources"
                      ? "Knowledge & Resources Hub"
                      : activeTab}
                  </span>
                </>
              )}
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

            {/* Support & Inquiries Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsContactModalOpen(true)}
              className="p-1.5 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Support & Inquiries (24h response promise)"
              aria-label="Support & Inquiries"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
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
          "w-full max-w-7xl 2xl:max-w-[1536px] mx-auto transition-all duration-200",
          activeTab === "settings" || activeTab === "projects" || activeTab === "notes" || activeTab === "focus" || activeTab === "ai"
            ? "flex-1 min-h-0 overflow-hidden p-3 sm:p-5 lg:p-6 2xl:p-8 h-full"
            : "flex-1 p-3 sm:p-5 lg:p-6 2xl:p-8"
        )}>
          {activeTab === "dashboard" && (
            <React.Suspense
              fallback={
                <div className="w-full h-64 flex flex-col items-center justify-center space-y-2 select-none animate-fade-in">
                  <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-xs text-muted-foreground font-mono">Loading dashboard...</span>
                </div>
              }
            >
              <DashboardView
                workspaceId={activeWorkspace?.id || "ws-default-primary"}
                workspaceName={activeWorkspace?.name || "Personal Workspace"}
                tasks={tasks}
                projects={projects}
                notes={notes}
                onNavigateTab={setActiveTab}
                onOpenQuickTask={() => setIsQuickTaskOpen(true)}
                onRefreshAllData={loadDashboardData}
                initializationError={initializationError}
              />
            </React.Suspense>
          )}

          {activeTab === "tasks" && (
            <TasksView workspaceId={activeWorkspace?.id || "ws-default-primary"} initialViewMode="list" />
          )}

          {activeTab === "kanban" && (
            <TasksView workspaceId={activeWorkspace?.id || "ws-default-primary"} initialViewMode="kanban" />
          )}

          <React.Suspense
            fallback={
              <div className="w-full h-64 flex flex-col items-center justify-center space-y-2 select-none animate-fade-in">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground font-mono">Loading workspace view...</span>
              </div>
            }
          >
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

            {activeTab === "resources" && (
              <ResourcesView />
            )}
          </React.Suspense>

          {![
            "dashboard",
            "tasks",
            "kanban",
            "projects",
            "notes",
            "calendar",
            "focus",
            "ai",
            "analytics",
            "resources",
            "settings",
          ].includes(activeTab) && (
            <NotFoundView
              onNavigate={setActiveTab}
              onOpenSearch={() => setIsCommandPaletteOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 no-print">
        {/* Floating Contact Launcher */}
        <button
          type="button"
          onClick={() => setIsContactModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-card/95 hover:bg-card border border-border shadow-dialog text-foreground hover:text-primary backdrop-blur-sm transition-all animate-dialog-in cursor-pointer hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          title="Contact & Support (24h response promise)"
          aria-label="Contact and Support"
        >
          <LifeBuoy className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold hidden md:inline">Contact Support</span>
        </button>

        {/* Floating Scroll to Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="p-2.5 rounded-2xl bg-card/95 hover:bg-card border border-border shadow-dialog text-foreground hover:text-primary backdrop-blur-sm transition-all animate-dialog-in cursor-pointer hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            title="Scroll back to top"
            aria-label="Scroll back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sticky Mobile Action CTA Bar (Visible on compact viewports <640px) */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 border-t border-border backdrop-blur-md px-4 py-2 flex items-center justify-between no-print shadow-dialog">
        <button
          type="button"
          onClick={() => setIsQuickTaskOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Task</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground cursor-pointer"
            title="Search workspace (Ctrl+K)"
            aria-label="Search workspace"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsContactModalOpen(true)}
            className="p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground cursor-pointer"
            title="Help & Contact"
            aria-label="Help and Contact"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cookie & Data Sovereignty Notification Banner */}
      <CookieConsent onOpenPrivacy={() => setActiveTab("resources")} />

      {/* Contact & Inquiries Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

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
