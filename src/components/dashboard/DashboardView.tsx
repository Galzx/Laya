import React, { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  SlidersHorizontal,
  Check,
  RotateCcw,
  Plus,
  EyeOff,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Clock,
  Flame,
  CheckSquare,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
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
import { ALL_WIDGETS_METADATA, getWorkspaceDefaultLayout } from "./defaultLayouts";

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
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [aggregates, setAggregates] = useState<DashboardAggregates | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);

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
              // Reconcile with any new widgets defined in system
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

        // Fallback to workspace default
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

  // Listen to cross-table entity events
  useEffect(() => {
    const handleSync = () => {
      void loadAggregates();
    };
    window.addEventListener("laya:tasks-changed", handleSync);
    window.addEventListener("laya:notes-changed", handleSync);
    window.addEventListener("laya:projects-changed", handleSync);
    return () => {
      window.removeEventListener("laya:tasks-changed", handleSync);
      window.removeEventListener("laya:notes-changed", handleSync);
      window.removeEventListener("laya:projects-changed", handleSync);
    };
  }, [loadAggregates]);

  // Persist layout to SQLite
  const saveLayout = async (nextWidgets: DashboardWidgetConfig[]) => {
    setWidgets(nextWidgets);
    try {
      await invoke("update_setting", {
        key: settingKey,
        value: JSON.stringify(nextWidgets),
      });
    } catch (err) {
      console.error("Failed to persist dashboard layout:", err);
    }
  };

  const handleResetToDefault = async () => {
    const defaults = getWorkspaceDefaultLayout(workspaceName || workspaceId);
    await saveLayout(defaults);
    setShowAddDrawer(false);
  };

  const handleToggleWidgetVisibility = async (id: DashboardWidgetId) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    await saveLayout(updated);
  };

  const handleSetColSpan = async (id: DashboardWidgetId, colSpan: number) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, colSpan } : w));
    await saveLayout(updated);
  };

  const handleMoveWidget = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visibleWidgets.length) return;

    const reorderedVisible = [...visibleWidgets];
    const [moved] = reorderedVisible.splice(index, 1);
    reorderedVisible.splice(targetIndex, 0, moved);

    // Reconstruct full widgets array with updated orders
    const visibleIds = new Set(reorderedVisible.map((w) => w.id));
    const hidden = widgets.filter((w) => !visibleIds.has(w.id));

    const updated = [
      ...reorderedVisible.map((w, idx) => ({ ...w, order: idx })),
      ...hidden.map((w, idx) => ({ ...w, order: reorderedVisible.length + idx })),
    ];

    await saveLayout(updated);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: DashboardWidgetId) => {
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (targetId: DashboardWidgetId) => {
    if (!draggedWidgetId || draggedWidgetId === targetId) return;

    const currentVisible = [...visibleWidgets];
    const fromIdx = currentVisible.findIndex((w) => w.id === draggedWidgetId);
    const toIdx = currentVisible.findIndex((w) => w.id === targetId);

    if (fromIdx === -1 || toIdx === -1) return;

    const [draggedItem] = currentVisible.splice(fromIdx, 1);
    currentVisible.splice(toIdx, 0, draggedItem);

    const visibleIds = new Set(currentVisible.map((w) => w.id));
    const hidden = widgets.filter((w) => !visibleIds.has(w.id));

    const updated = [
      ...currentVisible.map((w, idx) => ({ ...w, order: idx })),
      ...hidden.map((w, idx) => ({ ...w, order: currentVisible.length + idx })),
    ];

    setDraggedWidgetId(null);
    await saveLayout(updated);
  };

  const visibleWidgets = useMemo(() => {
    return [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
  }, [widgets]);

  const hiddenWidgets = useMemo(() => {
    return [...widgets].filter((w) => !w.visible);
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

  const todayTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived" && isToday(t.due_date));
  const overdueTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived" && isOverdue(t.due_date));

  // Responsive Tailwind ColSpan Classes
  const getColSpanClass = (span: number) => {
    switch (span) {
      case 4:
        return "md:col-span-4";
      case 5:
        return "md:col-span-5";
      case 6:
        return "md:col-span-6";
      case 7:
        return "md:col-span-7";
      case 8:
        return "md:col-span-8";
      case 12:
      default:
        return "md:col-span-12";
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 lg:space-y-7 animate-smooth-in pb-12">
      {initializationError && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-sm text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Storage could not be reached. Local data may be unavailable.</span>
        </div>
      )}

      {/* ─── 1. HERO GREETING & CUSTOMIZATION TRIGGER BAR ─── */}
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
          {/* Customize Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsCustomizing((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs border",
              isCustomizing
                ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30"
                : "border-border bg-card hover:bg-muted text-foreground"
            )}
            title={isCustomizing ? "Done customizing layout" : "Customize dashboard layout"}
          >
            {isCustomizing ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span>Customize</span>
              </>
            )}
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

      {/* ─── CUSTOMIZATION TOOLBAR DRAWER ─── */}
      {isCustomizing && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 animate-smooth-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span>Customizing Workspace Dashboard Layout</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Drag tiles or use arrow buttons to reorder. Adjust tile widths (Compact, Half, Wide, Full) and toggle widgets.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddDrawer((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span>Add Widgets ({hiddenWidgets.length})</span>
              </button>

              <button
                type="button"
                onClick={() => void handleResetToDefault()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Reset this workspace's layout to defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Add Hidden Widgets Drawer */}
          {showAddDrawer && hiddenWidgets.length > 0 && (
            <div className="pt-3 border-t border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Available Widgets to Add:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {hiddenWidgets.map((hw) => {
                  const meta = ALL_WIDGETS_METADATA[hw.id];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={hw.id}
                      className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-foreground truncate">{meta.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleWidgetVisibility(hw.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-[10px] transition-colors cursor-pointer shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODULAR WIDGET GRID (12-COLUMN RESPONSIVE) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start">
        {visibleWidgets.map((widgetConfig, index) => {
          const meta = ALL_WIDGETS_METADATA[widgetConfig.id];
          const Component = WIDGET_COMPONENTS[widgetConfig.id];
          if (!Component) return null;

          const isDragging = draggedWidgetId === widgetConfig.id;

          return (
            <div
              key={widgetConfig.id}
              draggable={isCustomizing}
              onDragStart={(e) => handleDragStart(e, widgetConfig.id)}
              onDragOver={handleDragOver}
              onDrop={() => void handleDrop(widgetConfig.id)}
              className={cn(
                "col-span-1 min-w-0 transition-all duration-200 relative group",
                getColSpanClass(widgetConfig.colSpan),
                isCustomizing && "p-2 rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5",
                isDragging && "opacity-40 scale-[0.98]"
              )}
            >
              {/* Customization Header Bar */}
              {isCustomizing && (
                <div className="flex items-center justify-between gap-2 p-1.5 mb-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl text-xs shadow-xs">
                  <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-4 w-4 text-primary" />
                    <span className="font-bold text-[11px] text-foreground truncate max-w-[140px]">
                      {meta.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Move Up/Down */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void handleMoveWidget(index, "up")}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      title="Move up / forward"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === visibleWidgets.length - 1}
                      onClick={() => void handleMoveWidget(index, "down")}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      title="Move down / backward"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>

                    {/* Width Preset Selector */}
                    <div className="flex items-center border border-border/80 rounded-md overflow-hidden text-[9px] font-mono">
                      {[4, 6, 8, 12].map((span) => (
                        <button
                          key={span}
                          type="button"
                          onClick={() => void handleSetColSpan(widgetConfig.id, span)}
                          className={cn(
                            "px-1.5 py-0.5 transition-colors cursor-pointer",
                            widgetConfig.colSpan === span
                              ? "bg-primary text-primary-foreground font-bold"
                              : "hover:bg-muted text-muted-foreground"
                          )}
                          title={`${span}/12 width`}
                        >
                          {span === 12 ? "Full" : span === 8 ? "2/3" : span === 6 ? "1/2" : "1/3"}
                        </button>
                      ))}
                    </div>

                    {/* Hide Button */}
                    <button
                      type="button"
                      onClick={() => void handleToggleWidgetVisibility(widgetConfig.id)}
                      className="p-1 rounded-md hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground transition-colors cursor-pointer"
                      title="Hide widget from dashboard"
                    >
                      <EyeOff className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Rendered Modular Widget Component */}
              <Component
                workspaceId={workspaceId}
                workspaceName={workspaceName}
                tasks={tasks}
                projects={projects}
                notes={notes}
                aggregates={aggregates}
                onNavigateTab={onNavigateTab}
                onRefreshData={onRefreshAllData}
                isCustomizing={isCustomizing}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

