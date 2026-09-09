import React, { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  SlidersHorizontal,
  Check,
  RotateCcw,
  Plus,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Clock,
  Flame,
  CheckSquare,
  AlertCircle,
  X,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { playTaskPopSound } from "../../lib/sound";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";
import type { Note } from "../notes/NoteEditor";
import type { TabId } from "../layout/Sidebar";
import type {
  DashboardWidgetId,
  DashboardWidgetConfig,
  DashboardAggregates,
  WidgetProps,
} from "./types";
import {
  ALL_WIDGETS_METADATA,
  DASHBOARD_PRESETS,
  type DashboardPresetId,
  applyDashboardPreset,
  getWorkspaceDefaultLayout,
} from "./defaultLayouts";

// Widgets
import { MetricsGlanceWidget } from "./widgets/MetricsGlanceWidget";
import { TodayTasksWidget } from "./widgets/TodayTasksWidget";
import { CodingSubtasksWidget } from "./widgets/CodingSubtasksWidget";
import { HabitsWidget } from "./widgets/HabitsWidget";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { DeepWorkWidget } from "./widgets/DeepWorkWidget";
import { ProjectsWidget } from "./widgets/ProjectsWidget";
import { RecentNotesWidget } from "./widgets/RecentNotesWidget";
import { QuickCaptureWidget } from "./widgets/QuickCaptureWidget";
import { SammiBriefingWidget } from "./widgets/SammiBriefingWidget";
import { WorkspaceHubsWidget } from "./widgets/WorkspaceHubsWidget";

interface DashboardViewProps {
  workspaceId: string;
  workspaceName: string;
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  onNavigateTab: (tab: TabId) => void;
  onOpenQuickTask: () => void;
  onRefreshAllData: () => Promise<void>;
  initializationError?: string | null;
}

const WIDGET_COMPONENTS: Record<DashboardWidgetId, React.FC<WidgetProps>> = {
  metrics_glance: MetricsGlanceWidget,
  today_tasks: TodayTasksWidget,
  coding_subtasks: CodingSubtasksWidget,
  habits_streaks: HabitsWidget,
  calendar_agenda: CalendarWidget,
  deep_work: DeepWorkWidget,
  projects: ProjectsWidget,
  recent_notes: RecentNotesWidget,
  quick_capture: QuickCaptureWidget,
  sammi_briefing: SammiBriefingWidget,
  workspace_hubs: WorkspaceHubsWidget,
};

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspaceId,
  workspaceName,
  tasks,
  projects,
  notes,
  onNavigateTab,
  onOpenQuickTask,
  onRefreshAllData,
  initializationError,
}) => {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() =>
    getWorkspaceDefaultLayout(workspaceName || workspaceId)
  );
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [aggregates, setAggregates] = useState<DashboardAggregates | null>(null);

  const settingKey = `dashboard_layout_${workspaceId}`;

  // Load SQL cross-table aggregates
  const loadAggregates = useCallback(async () => {
    try {
      const res = await invoke<DashboardAggregates>("get_dashboard_aggregates", {
        workspaceId,
      });
      setAggregates(res);
    } catch (err) {
      console.warn("Failed to load dashboard aggregates via SQL:", err);
    }
  }, [workspaceId]);

  // Load layout from SQLite settings table
  useEffect(() => {
    let isMounted = true;
    async function loadLayout() {
      try {
        const settingsRes = await invoke<{ key: string; value: string }[]>("get_settings").catch(
          () => []
        );
        const layoutSetting = settingsRes.find((s) => s.key === settingKey);

        if (layoutSetting?.value && isMounted) {
          try {
            const parsed = JSON.parse(layoutSetting.value) as DashboardWidgetConfig[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              const defaultSet = getWorkspaceDefaultLayout(workspaceName || workspaceId);
              const merged = [...parsed];
              for (const def of defaultSet) {
                if (!merged.some((m) => m.id === def.id)) {
                  merged.push(def);
                }
              }
              setWidgets(merged);
              return;
            }
          } catch (e) {
            console.error("Failed to parse saved layout JSON:", e);
          }
        }

        if (isMounted) {
          setWidgets(getWorkspaceDefaultLayout(workspaceName || workspaceId));
        }
      } catch (err) {
        console.error("Error loading dashboard layout:", err);
      }
    }

    void loadLayout();
    void loadAggregates();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, workspaceName, settingKey, loadAggregates]);

  // Refresh aggregates upon tasks changes
  useEffect(() => {
    void loadAggregates();
  }, [tasks, loadAggregates]);

  // Save layout to SQLite
  const saveLayout = async (nextWidgets: DashboardWidgetConfig[]) => {
    setWidgets(nextWidgets);
    try {
      await invoke("update_setting", {
        key: settingKey,
        value: JSON.stringify(nextWidgets),
      });
    } catch (err) {
      console.error("Failed to save dashboard layout:", err);
    }
  };

  // 1-Click Starter Preset Switcher
  const handleApplyPreset = async (presetId: DashboardPresetId) => {
    playTaskPopSound();
    const newLayout = applyDashboardPreset(presetId);
    await saveLayout(newLayout);
  };

  // Toggle widget visibility (ON / OFF)
  const handleToggleWidget = async (id: DashboardWidgetId) => {
    playTaskPopSound();
    const next = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    await saveLayout(next);
  };

  // Toggle widget size between Compact (6 cols) and Full Width (12 cols)
  const handleToggleSize = async (id: DashboardWidgetId) => {
    playTaskPopSound();
    const next = widgets.map((w) => {
      if (w.id === id) {
        const nextSpan = w.colSpan >= 12 ? 6 : 12;
        return { ...w, colSpan: nextSpan };
      }
      return w;
    });
    await saveLayout(next);
  };

  // Move widget up in order
  const handleMoveWidget = async (id: DashboardWidgetId, direction: "up" | "down") => {
    const visibleList = [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
    const currentIndex = visibleList.findIndex((w) => w.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= visibleList.length) return;

    playTaskPopSound();
    const [moved] = visibleList.splice(currentIndex, 1);
    visibleList.splice(targetIndex, 0, moved);

    const visibleIds = new Set(visibleList.map((w) => w.id));
    const hiddenList = widgets.filter((w) => !visibleIds.has(w.id));

    const updated = [
      ...visibleList.map((w, idx) => ({ ...w, order: idx })),
      ...hiddenList.map((w, idx) => ({ ...w, order: visibleList.length + idx })),
    ];

    await saveLayout(updated);
  };

  // Reset to workspace defaults
  const handleResetToDefault = async () => {
    playTaskPopSound();
    const defaults = getWorkspaceDefaultLayout(workspaceName || workspaceId);
    await saveLayout(defaults);
  };

  const visibleWidgets = useMemo(() => {
    return [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
  }, [widgets]);

  // Derived tasks status
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

  const isOverdue = (due_date: number | null) => {
    if (!due_date) return false;
    const d = new Date(due_date * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return d < startOfToday;
  };

  const todayTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "archived" && isToday(t.due_date)
  );
  const overdueTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "archived" && isOverdue(t.due_date)
  );

  // Responsive Tailwind ColSpan Classes
  const getColSpanClass = (span: number) => {
    switch (span) {
      case 4:
      case 5:
      case 6:
      case 7:
        return "md:col-span-6";
      case 12:
      default:
        return "md:col-span-12";
    }
  };

  // Group all widgets into a stable list for the studio
  const allWidgetsList = useMemo(() => {
    const map = new Map(widgets.map((w) => [w.id, w]));
    return (Object.keys(ALL_WIDGETS_METADATA) as DashboardWidgetId[]).map((id) => {
      const cfg = map.get(id) || { id, colSpan: 6, visible: false, order: 99 };
      return {
        ...cfg,
        meta: ALL_WIDGETS_METADATA[id],
      };
    });
  }, [widgets]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 lg:space-y-7 animate-smooth-in pb-12">
      {initializationError && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-sm text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Storage could not be reached. Local data may be unavailable.</span>
        </div>
      )}

      {/* ─── 1. HERO GREETING & HEADER ACTION BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pt-1 border-b border-border/50 pb-4 sm:pb-5">
        <div className="space-y-1 sm:space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <p className="text-xs text-muted-foreground font-medium">{formatDate()}</p>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {todayTasks.length === 0
                ? "Schedule is clear"
                : `${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} due today`}
            </span>
            {overdueTasks.length > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                  <Clock className="h-3 w-3" />
                  {overdueTasks.length} overdue
                </span>
              </>
            )}
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
              Workspace: {workspaceName || "Personal"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">
            {getGreeting()}.
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Friendly Customize Button */}
          <button
            type="button"
            onClick={() => setIsStudioOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs hover:border-primary/40 active:scale-95"
            title="Open Dashboard Studio to choose presets and customize widgets"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Customize Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuickTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs"
            title="Quick add task"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>New Task</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("focus")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Start Focus</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("tasks")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs"
          >
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
            <span>Tasks</span>
          </button>
        </div>
      </div>

      {/* ─── 2. MODULAR WIDGET GRID (CLEAN, UNCLUTTERED) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start">
        {visibleWidgets.map((widgetConfig) => {
          const Component = WIDGET_COMPONENTS[widgetConfig.id];
          if (!Component) return null;

          return (
            <div
              key={widgetConfig.id}
              className={cn(
                "col-span-1 min-w-0 transition-all duration-200",
                getColSpanClass(widgetConfig.colSpan)
              )}
            >
              <Component
                workspaceId={workspaceId}
                workspaceName={workspaceName}
                tasks={tasks}
                projects={projects}
                notes={notes}
                aggregates={aggregates}
                onNavigateTab={onNavigateTab}
                onRefreshData={onRefreshAllData}
              />
            </div>
          );
        })}
      </div>

      {/* ─── 3. SLIDE-OVER DASHBOARD STUDIO DRAWER ─── */}
      {isStudioOpen && (
        <div
          className="fixed inset-0 bg-background/70 backdrop-blur-xs z-50 flex justify-end animate-fade-in"
          onClick={() => setIsStudioOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-smooth-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Studio Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Dashboard Studio</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Choose a starter template or personalize widgets
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStudioOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close Studio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {/* ─── 1-CLICK STARTER PRESETS SECTION ─── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                    <span>1-Click Starter Layouts</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">Click to apply instantly</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DASHBOARD_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => void handleApplyPreset(preset.id)}
                      className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/80 hover:border-primary/50 text-left transition-all cursor-pointer shadow-2xs group active:scale-95 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                          {preset.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-background border border-border text-muted-foreground shrink-0 font-medium">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── WIDGET GALLERY & TOGGLES SECTION ─── */}
              <div className="space-y-3 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Widget Gallery ({visibleWidgets.length} Active)
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Turn widgets on or off and set their layout width
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                  {allWidgetsList.map((item) => {
                    const Icon = item.meta.icon;
                    const isVisible = item.visible;
                    const isFullWidth = item.colSpan >= 12;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-2xl border transition-all duration-150 space-y-2",
                          isVisible
                            ? "bg-background border-border shadow-xs"
                            : "bg-muted/20 border-border/50 opacity-60 hover:opacity-90"
                        )}
                      >
                        {/* Row 1: Icon, Title, and ON/OFF Toggle */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "p-1.5 rounded-xl shrink-0",
                                isVisible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground truncate block">
                                {item.meta.title}
                              </span>
                              <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider">
                                {item.meta.category}
                              </span>
                            </div>
                          </div>

                          {/* iOS-Style Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => void handleToggleWidget(item.id)}
                            className={cn(
                              "w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0",
                              isVisible ? "bg-primary" : "bg-muted border border-border"
                            )}
                            title={isVisible ? "Turn off widget" : "Turn on widget"}
                          >
                            <div
                              className={cn(
                                "bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200",
                                isVisible ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-8">
                          {item.meta.description}
                        </p>

                        {/* Controls (Only if visible) */}
                        {isVisible && (
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 pl-8 text-xs">
                            {/* Width Selector: Compact vs Wide */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium mr-1">
                                Size:
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleToggleSize(item.id)}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer",
                                  !isFullWidth
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Compact
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleToggleSize(item.id)}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer",
                                  isFullWidth
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Wide
                              </button>
                            </div>

                            {/* Position Up / Down */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium mr-1">
                                Position:
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleMoveWidget(item.id, "up")}
                                className="p-1 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors cursor-pointer"
                                title="Move widget up"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleMoveWidget(item.id, "down")}
                                className="p-1 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors cursor-pointer"
                                title="Move widget down"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Studio Footer */}
            <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void handleResetToDefault()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/60 transition-colors cursor-pointer"
                title="Reset this workspace's layout to default preset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStudioOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
