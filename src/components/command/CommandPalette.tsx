import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Search,
  CheckSquare,
  Columns3,
  FolderKanban,
  BookOpen,
  CalendarDays,
  Flame,
  Bot,
  TrendingUp,
  Settings,
  Palette,
  Plus,
  ArrowRight,
  LayoutDashboard,
  BookMarked,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { playTaskPopSound, playSweepSound } from "../../lib/sound";
import { THEME_PRESETS, applyTheme } from "../../lib/theme";
import type { TabId } from "../layout/Sidebar";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";
import type { Note } from "../notes/NoteEditor";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabId) => void;
  workspaceId: string;
}

interface CommandItem {
  id: string;
  category: "Actions" | "Tasks" | "Notes" | "Projects" | "Themes" | "Navigation";
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badge?: string;
  action: () => void | Promise<void>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  workspaceId,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isQuickAddingTask, setIsQuickAddingTask] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load workspace data when palette opens
  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setSelectedIndex(0);
    setIsQuickAddingTask(false);
    setQuickTaskTitle("");

    async function loadData() {
      try {
        const [fetchedTasks, fetchedProjects, fetchedNotes] = await Promise.all([
          invoke<Task[]>("get_tasks", { workspaceId }).catch(() => [] as Task[]),
          invoke<Project[]>("get_projects", { workspaceId }).catch(() => [] as Project[]),
          invoke<Note[]>("get_notes", { workspaceId }).catch(() => [] as Note[]),
        ]);
        setTasks(fetchedTasks);
        setProjects(fetchedProjects);
        setNotes(fetchedNotes);
      } catch (err) {
        console.error("Failed to load command palette data:", err);
      }
    }

    void loadData();

    // Auto-focus input
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  }, [isOpen, workspaceId]);

  // Build searchable commands list
  const commandItems = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const items: CommandItem[] = [];

    // ─── 1. QUICK ACTIONS ───
    const actions: CommandItem[] = [
      {
        id: "action-new-task",
        category: "Actions",
        title: "Create New Task",
        subtitle: "Add a task to your workspace",
        icon: Plus,
        iconColor: "text-primary",
        badge: "Action",
        action: () => {
          setIsQuickAddingTask(true);
        },
      },
      {
        id: "action-new-note",
        category: "Actions",
        title: "Create New Note",
        subtitle: "Start writing in Notes canvas",
        icon: BookOpen,
        iconColor: "text-amber-500",
        badge: "Action",
        action: async () => {
          playTaskPopSound();
          try {
            await invoke("create_note", {
              workspaceId,
              projectId: null,
              title: "Untitled Note",
              content: "",
              color: "amber",
            });
            window.dispatchEvent(new CustomEvent("laya:notes-changed"));
            onSelectTab("notes");
            onClose();
          } catch (err) {
            console.error("Failed to create note from command:", err);
          }
        },
      },
      {
        id: "action-start-focus",
        category: "Actions",
        title: "Start Focus Session",
        subtitle: "Open Pomodoro 25-minute timer",
        icon: Flame,
        iconColor: "text-rose-500",
        badge: "Focus",
        action: () => {
          playTaskPopSound();
          onSelectTab("focus");
          onClose();
        },
      },
      {
        id: "action-sammi-deconstruct",
        category: "Actions",
        title: "Deconstruct Goal with Sammi",
        subtitle: "Generate actionable subtask checklists with Sammi AI",
        icon: Bot,
        iconColor: "text-purple-500",
        badge: "AI",
        action: () => {
          playTaskPopSound();
          onSelectTab("ai");
          onClose();
        },
      },
    ];

    // Filter actions
    actions.forEach((a) => {
      if (!q || a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)) {
        items.push(a);
      }
    });

    // ─── 2. MATCHING TASKS ───
    tasks.forEach((t) => {
      if (t.status === "archived") return;
      const matchesTitle = t.title.toLowerCase().includes(q);
      const matchesPriority = t.priority.toLowerCase().includes(q);
      if (q && (matchesTitle || matchesPriority)) {
        items.push({
          id: `task-${t.id}`,
          category: "Tasks",
          title: t.title,
          subtitle: `Priority: ${t.priority} • Status: ${t.status}`,
          icon: CheckSquare,
          iconColor: t.status === "completed" ? "text-emerald-500" : "text-primary",
          badge: t.priority.toUpperCase(),
          action: () => {
            playTaskPopSound();
            onSelectTab("tasks");
            onClose();
          },
        });
      }
    });

    // ─── 3. MATCHING NOTES ───
    notes.forEach((n) => {
      if (n.is_archived === 1) return;
      const matchesTitle = n.title.toLowerCase().includes(q);
      const matchesContent = n.content.toLowerCase().includes(q);
      if (q && (matchesTitle || matchesContent)) {
        const preview = n.content.slice(0, 50).replace(/\n/g, " ") || "Empty note";
        items.push({
          id: `note-${n.id}`,
          category: "Notes",
          title: n.title || "Untitled Note",
          subtitle: preview,
          icon: BookOpen,
          iconColor: "text-amber-500",
          badge: "Note",
          action: () => {
            playTaskPopSound();
            onSelectTab("notes");
            onClose();
          },
        });
      }
    });

    // ─── 4. MATCHING PROJECTS ───
    projects.forEach((p) => {
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesDesc = p.description?.toLowerCase().includes(q);
      if (q && (matchesName || matchesDesc)) {
        items.push({
          id: `project-${p.id}`,
          category: "Projects",
          title: p.name,
          subtitle: p.description || "Project notebook",
          icon: FolderKanban,
          iconColor: "text-emerald-500",
          badge: "Project",
          action: () => {
            playTaskPopSound();
            onSelectTab("projects");
            onClose();
          },
        });
      }
    });

    // ─── 5. THEMES ───
    THEME_PRESETS.forEach((preset) => {
      if (!q || q.includes("theme") || preset.name.toLowerCase().includes(q)) {
        items.push({
          id: `theme-${preset.id}`,
          category: "Themes",
          title: `Switch Theme: ${preset.name}`,
          subtitle: preset.description,
          icon: Palette,
          iconColor: "text-indigo-500",
          badge: preset.mode,
          action: async () => {
            playSweepSound();
            applyTheme(preset.id);
            try {
              await invoke("update_setting", { key: "theme", value: preset.id });
            } catch (err) {
              console.error("Failed to save theme setting:", err);
            }
            onClose();
          },
        });
      }
    });

    // ─── 6. NAVIGATION ───
    const navs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard },
      { id: "tasks",     label: "Go to Tasks",     icon: CheckSquare },
      { id: "kanban",    label: "Go to Kanban Board", icon: Columns3 },
      { id: "projects",  label: "Go to Projects",  icon: FolderKanban },
      { id: "notes",     label: "Go to Notes",     icon: BookOpen },
      { id: "calendar",  label: "Go to Calendar",  icon: CalendarDays },
      { id: "focus",     label: "Go to Focus",     icon: Flame },
      { id: "ai",        label: "Go to Sammi AI",  icon: Bot },
      { id: "analytics", label: "Go to Analytics", icon: TrendingUp },
      { id: "resources", label: "Go to Resources & Hub", icon: BookMarked },
      { id: "settings",  label: "Go to Settings",  icon: Settings },
    ];

    navs.forEach((n) => {
      if (!q || n.label.toLowerCase().includes(q) || q.includes("go") || q.includes("nav")) {
        items.push({
          id: `nav-${n.id}`,
          category: "Navigation",
          title: n.label,
          subtitle: `Navigate to ${n.id} workspace`,
          icon: n.icon,
          iconColor: "text-muted-foreground",
          badge: "Jump",
          action: () => {
            playTaskPopSound();
            onSelectTab(n.id);
            onClose();
          },
        });
      }
    });

    return items;
  }, [query, tasks, projects, notes, workspaceId, onClose, onSelectTab]);

  // Adjust selected index if items length changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [commandItems.length]);

  // Keyboard navigation listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (commandItems.length > 0 ? (prev + 1) % commandItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (commandItems.length > 0 ? (prev - 1 + commandItems.length) % commandItems.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isQuickAddingTask) {
        handleCommitQuickTask();
      } else if (commandItems[selectedIndex]) {
        void commandItems[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (isQuickAddingTask) {
        setIsQuickAddingTask(false);
      } else {
        onClose();
      }
    }
  };

  const handleCommitQuickTask = async () => {
    if (!quickTaskTitle.trim()) return;
    try {
      playTaskPopSound();
      const todayNoonEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
      await invoke("create_task", {
        workspaceId,
        title: quickTaskTitle.trim(),
        priority: "medium",
        dueDate: todayNoonEpoch,
      });
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      onClose();
    } catch (err) {
      console.error("Failed to quick create task:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 sm:pt-28 p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-scale-in select-none"
      >
        {/* Search Header Input */}
        <div className="p-3.5 border-b border-border flex items-center gap-3 bg-muted/20 shrink-0">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
          {isQuickAddingTask ? (
            <input
              ref={inputRef}
              type="text"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title… (press Enter to create)"
              className="flex-1 bg-transparent border-none text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command, search tasks, notes, themes…"
              className="flex-1 bg-transparent border-none text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          )}

          {isQuickAddingTask && (
            <button
              type="button"
              onClick={() => setIsQuickAddingTask(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs cursor-pointer"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border shrink-0">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/30">
          {commandItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No matches found</p>
              <p className="text-[11px]">Try searching for a different keyword or action.</p>
            </div>
          ) : (
            commandItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group",
                    isSelected
                      ? "bg-primary/10 text-foreground font-medium shadow-2xs border border-primary/30"
                      : "hover:bg-muted/50 text-foreground/80 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "p-2 rounded-lg bg-card border border-border/80 shadow-2xs shrink-0 transition-transform group-hover:scale-105",
                        item.iconColor
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.title}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {item.badge && (
                      <span className="text-[9px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 animate-fade-in" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard Shortcut Footer Helper */}
        <div className="px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[9px]">↵</kbd>
              <span>select</span>
            </span>
          </div>

          <span className="font-mono text-[10px]">
            {commandItems.length} command{commandItems.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
};
