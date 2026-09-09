import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Palette,
  HardDrive,
  ShieldCheck,
  Check,
  FolderOpen,
  Info,
  Database,
  Sparkles,
  Sun,
  Moon,
  Paintbrush,
  Volume2,
  Play,
  Wand2,
  ChevronRight,
  CheckSquare,
  Plus,
  Trash2,
  Edit3,
  Keyboard,
  RotateCcw,
  AlertCircle,
  Bot,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
  Upload,
  FileDown,
  FileSpreadsheet,
  FileText,
  Layers,
  Copy,
  Archive,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Target,
  Pin,
  Maximize2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { getAiConfig, saveAiConfig } from "../../lib/ai/storage";
import { testAiConnection } from "../../lib/ai/engine";
import { useFocusTimer } from "../../lib/focusContext";
import { FOCUS_ALARM_PROFILES, playFocusAlarmSound } from "../../lib/sound";
import {
  type DatabaseStats,
  type BackupFileInfo,
  type FullWorkspaceExport,
  formatBytes,
  exportTasksToCsv,
  exportProjectsToCsv,
  exportNotesToMarkdown,
  downloadBlob,
  parseTasksFromCsv,
} from "../../lib/export";
import { exportNotesToCsv } from "../../lib/dataPortability";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";
import type { Note } from "../notes/NoteEditor";

async function openExternalUrl(url: string) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
import type { AiProviderConfig } from "../../lib/ai/types";
import {
  THEME_PRESETS,
  ACCENT_COLORS,
  applyTheme,
  getCustomThemes,
  deleteCustomTheme,
  type CustomTheme,
} from "../../lib/theme";
import { ThemeStudioModal } from "./ThemeStudioModal";
import {
  SOUND_PROFILES,
  TIDY_SOUND_PROFILES,
  isSoundEnabled,
  setSoundEnabled,
  getSoundProfile,
  setSoundProfile,
  getTidySoundProfile,
  setTidySoundProfile,
  playTaskPopSound,
  playSweepSound,
} from "../../lib/sound";
import {
  SHORTCUT_DEFINITIONS,
  formatShortcut,
  isSameCombo,
  getSavedShortcuts,
  saveSavedShortcuts,
  resetAllShortcuts,
  eventToCombo,
  type ShortcutCombo,
} from "../../lib/shortcuts";

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

interface SystemStatus {
  status: string;
  engine: string;
  timestamp: number;
  offline_ready: boolean;
  db_connected: boolean;
}

export type SectionId = "appearance" | "workflow" | "focus" | "shortcuts" | "sound" | "ai" | "workspace" | "about";

interface NavSectionItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_SECTIONS: NavSectionItem[] = [
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme palettes & accents" },
  { id: "workflow", label: "Task Workflow", icon: CheckSquare, description: "Completed task order & behavior" },
  { id: "focus", label: "Focus & Window", icon: Target, description: "Float on top & real fullscreen" },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard, description: "Customizable hotkeys & keybinds" },
  { id: "sound", label: "Sound Effects", icon: Volume2, description: "Pop styles & tidy-up SFX" },
  { id: "ai", label: "Sammi AI", icon: Bot, description: "Provider, models & API keys" },
  { id: "workspace", label: "Workspace & Data", icon: Database, description: "Local SQLite database" },
  { id: "about", label: "About & Privacy", icon: ShieldCheck, description: "Local-first privacy" },
];

export const SettingsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>("appearance");
  const [currentThemeId, setCurrentThemeId] = useState("linen");
  const [currentAccentId, setCurrentAccentId] = useState<string | undefined>(undefined);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => getCustomThemes());
  const [isThemeStudioOpen, setIsThemeStudioOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);

  const [shortcuts, setShortcuts] = useState<Record<string, ShortcutCombo>>(() => getSavedShortcuts());
  const [recordingShortcutId, setRecordingShortcutId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [soundProfileId, setSoundProfileId] = useState(getSoundProfile());
  const [tidyProfileId, setTidyProfileId] = useState(getTidySoundProfile());
  const [completedPosition, setCompletedPosition] = useState<"bottom" | "remain">(() => {
    const saved = localStorage.getItem("laya-completed-position");
    return saved === "remain" ? "remain" : "bottom";
  });

  const {
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    autoAlwaysOnTopFocus,
    setAutoAlwaysOnTopFocus,
    autoFullscreenZen,
    setAutoFullscreenZen,
    alarmSoundId,
    handleAlarmChange,
  } = useFocusTimer();

  const [aiConfig, setAiConfig] = useState<AiProviderConfig>(() => getAiConfig());
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedFaqIndex, setCopiedFaqIndex] = useState<number | null>(null);
  const [copiedDiag, setCopiedDiag] = useState(false);

  const handleUpdateAiConfig = (updates: Partial<AiProviderConfig>) => {
    const updated = { ...aiConfig, ...updates };
    setAiConfig(updated);
    saveAiConfig(updated);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleTestAi = async () => {
    setIsAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await testAiConnection(aiConfig);
      setAiTestResult(res);
    } catch (e: unknown) {
      setAiTestResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setIsAiTesting(false);
    }
  };

  const rightPaneRef = useRef<HTMLElement>(null);

  // ─── DATA BACKUP & EXPORT STATE ──────────────────────────────────────────
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [backupsList, setBackupsList] = useState<BackupFileInfo[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<BackupFileInfo | null>(null);
  const [copiedDbPath, setCopiedDbPath] = useState(false);
  const [dataBanner, setDataBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadDatabaseStats = async () => {
    try {
      const stats = await invoke<DatabaseStats>("get_database_stats");
      setDbStats(stats);
    } catch (err) {
      console.error("Failed to load database stats:", err);
    }
  };

  const loadBackupsList = async () => {
    try {
      const list = await invoke<BackupFileInfo[]>("list_database_backups");
      setBackupsList(list);
    } catch (err) {
      console.error("Failed to list backups:", err);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    playTaskPopSound();
    setDataBanner(null);
    try {
      const backup = await invoke<BackupFileInfo>("create_database_backup");
      await Promise.all([loadBackupsList(), loadDatabaseStats()]);
      playSweepSound();
      setDataBanner({
        type: "success",
        message: `Snapshot created: ${backup.file_name} (${formatBytes(backup.file_size_bytes)})`,
      });
    } catch (err) {
      setDataBanner({
        type: "error",
        message: `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await invoke("open_backups_folder");
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const handleDeleteBackup = async (filePath: string) => {
    playTaskPopSound();
    try {
      await invoke("delete_database_backup", { backupFilePath: filePath });
      await loadBackupsList();
    } catch (err) {
      setDataBanner({
        type: "error",
        message: `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    setIsRestoring(true);
    playTaskPopSound();
    try {
      await invoke("restore_database_backup", { backupFilePath: backupToRestore.file_path });
      await Promise.all([loadDatabaseStats(), loadBackupsList()]);
      playSweepSound();
      setBackupToRestore(null);
      setDataBanner({
        type: "success",
        message: "Database restored successfully! All tables updated.",
      });
    } catch (err) {
      setDataBanner({
        type: "error",
        message: `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportTasksCsv = async () => {
    const ws = workspaces.find((w) => w.is_active === 1) || workspaces[0];
    if (!ws) return;
    setIsExporting(true);
    playTaskPopSound();
    try {
      const [tasks, projects] = await Promise.all([
        invoke<Task[]>("get_tasks", { workspaceId: ws.id }),
        invoke<Project[]>("get_projects", { workspaceId: ws.id }),
      ]);
      exportTasksToCsv(tasks, projects);
      playSweepSound();
      setDataBanner({ type: "success", message: `Exported ${tasks.length} tasks to CSV.` });
    } catch (err) {
      setDataBanner({ type: "error", message: `Export failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProjectsCsv = async () => {
    const ws = workspaces.find((w) => w.is_active === 1) || workspaces[0];
    if (!ws) return;
    setIsExporting(true);
    playTaskPopSound();
    try {
      const [tasks, projects] = await Promise.all([
        invoke<Task[]>("get_tasks", { workspaceId: ws.id }),
        invoke<Project[]>("get_projects", { workspaceId: ws.id }),
      ]);
      exportProjectsToCsv(projects, tasks);
      playSweepSound();
      setDataBanner({ type: "success", message: `Exported ${projects.length} projects to CSV.` });
    } catch (err) {
      setDataBanner({ type: "error", message: `Export failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportNotesMarkdown = async () => {
    const ws = workspaces.find((w) => w.is_active === 1) || workspaces[0];
    if (!ws) return;
    setIsExporting(true);
    playTaskPopSound();
    try {
      const [notes, projects] = await Promise.all([
        invoke<Note[]>("get_notes", { workspaceId: ws.id }),
        invoke<Project[]>("get_projects", { workspaceId: ws.id }),
      ]);
      exportNotesToMarkdown(notes, projects);
      playSweepSound();
      setDataBanner({ type: "success", message: `Exported ${notes.length} notes as Markdown bundle.` });
    } catch (err) {
      setDataBanner({ type: "error", message: `Export failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportNotesCsv = async () => {
    const ws = workspaces.find((w) => w.is_active === 1) || workspaces[0];
    if (!ws) return;
    setIsExporting(true);
    playTaskPopSound();
    try {
      const [notes, projects] = await Promise.all([
        invoke<Note[]>("get_notes", { workspaceId: ws.id }),
        invoke<Project[]>("get_projects", { workspaceId: ws.id }),
      ]);
      exportNotesToCsv(notes, projects);
      playSweepSound();
      setDataBanner({ type: "success", message: `Exported ${notes.length} notes to CSV.` });
    } catch (err) {
      setDataBanner({ type: "error", message: `CSV export failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFullWorkspaceJson = async () => {
    const ws = workspaces.find((w) => w.is_active === 1) || workspaces[0];
    if (!ws) return;
    setIsExporting(true);
    playTaskPopSound();
    try {
      const fullExport = await invoke<FullWorkspaceExport>("export_full_workspace_json", {
        workspaceId: ws.id,
      });
      const jsonStr = JSON.stringify(fullExport, null, 2);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadBlob(jsonStr, `laya-workspace-backup-${dateStr}.json`, "application/json;charset=utf-8;");
      playSweepSound();
      setDataBanner({ type: "success", message: "Full workspace JSON export downloaded." });
    } catch (err) {
      setDataBanner({ type: "error", message: `JSON export failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportTasksCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const ws = workspaces.find((w) => w.is_active === 1) || workspaces[0];
    if (!file || !ws) return;
    setIsImporting(true);
    playTaskPopSound();
    try {
      const text = await file.text();
      const parsedTasks = parseTasksFromCsv(text);
      if (parsedTasks.length === 0) {
        setDataBanner({ type: "error", message: "No valid tasks found in CSV file." });
        return;
      }
      for (const t of parsedTasks) {
        await invoke("create_task", {
          workspaceId: ws.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
        });
      }
      await loadDatabaseStats();
      playSweepSound();
      setDataBanner({ type: "success", message: `Imported ${parsedTasks.length} tasks from CSV.` });
    } catch (err) {
      setDataBanner({ type: "error", message: `Import failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleImportWorkspaceJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const ws = workspaces.find((w) => w.is_active === 1) || workspaces[0];
    if (!file || !ws) return;
    setIsImporting(true);
    playTaskPopSound();
    try {
      const text = await file.text();
      const parsedData = JSON.parse(text) as FullWorkspaceExport;
      const resMsg = await invoke<string>("import_full_workspace_json", {
        data: parsedData,
        targetWorkspaceId: ws.id,
      });
      await loadDatabaseStats();
      playSweepSound();
      setDataBanner({ type: "success", message: resMsg });
    } catch (err) {
      setDataBanner({ type: "error", message: `JSON Import failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, wsRes, statusRes] = await Promise.all([
          invoke<SettingItem[]>("get_settings").catch(() => [] as SettingItem[]),
          invoke<Workspace[]>("get_workspaces").catch(() => [] as Workspace[]),
          invoke<SystemStatus>("check_system_status").catch(() => null),
        ]);

        const themeSetting = settingsRes.find((s) => s.key === "theme")?.value || "linen";
        const accentSetting = settingsRes.find((s) => s.key === "accent_color")?.value;
        const sfxSetting = settingsRes.find((s) => s.key === "sfx_profile")?.value;
        const tidySetting = settingsRes.find((s) => s.key === "tidy_sfx_profile")?.value;
        const posSetting = settingsRes.find((s) => s.key === "completed_position")?.value;

        if (posSetting === "remain" || posSetting === "bottom") {
          setCompletedPosition(posSetting);
          localStorage.setItem("laya-completed-position", posSetting);
        }

        let mappedTheme = themeSetting;
        if (themeSetting === "light") mappedTheme = "linen";
        if (themeSetting === "dark") mappedTheme = "midnight";

        setCurrentThemeId(mappedTheme);
        setCurrentAccentId(accentSetting || undefined);
        applyTheme(mappedTheme, accentSetting || undefined);

        if (sfxSetting) {
          setSoundProfileId(sfxSetting);
          setSoundProfile(sfxSetting);
        }

        if (tidySetting) {
          setTidyProfileId(tidySetting);
          setTidySoundProfile(tidySetting);
        }

        setWorkspaces(wsRes);
        setSystemStatus(statusRes);
        setCustomThemes(getCustomThemes());
        void loadDatabaseStats();
        void loadBackupsList();
      } catch (err) {
        console.error("Failed to load settings data:", err);
      }
    }
    void loadData();
  }, []);

  // Smooth jump to section inside right scrolling pane
  const scrollToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    setCurrentThemeId(presetId);
    applyTheme(presetId, currentAccentId);
    try {
      await invoke("update_setting", { key: "theme", value: presetId });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      console.error("Failed to save theme setting:", err);
    }
  };

  const handleOpenThemeStudio = (themeToEdit?: CustomTheme) => {
    setEditingTheme(themeToEdit || null);
    setIsThemeStudioOpen(true);
  };

  const handleCustomThemeSaved = async (savedTheme: CustomTheme) => {
    setCustomThemes(getCustomThemes());
    setCurrentThemeId(savedTheme.id);
    setCurrentAccentId(undefined);
    try {
      await invoke("update_setting", { key: "theme", value: savedTheme.id });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      console.error("Failed to save theme setting:", err);
    }
  };

  const handleDeleteCustomTheme = async (themeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomTheme(themeId);
    const remaining = getCustomThemes();
    setCustomThemes(remaining);
    if (currentThemeId === themeId) {
      await handleSelectPreset("linen");
    }
  };

  const handleSelectAccent = async (accentId: string) => {
    const nextAccent = currentAccentId === accentId ? undefined : accentId;
    setCurrentAccentId(nextAccent);
    applyTheme(currentThemeId, nextAccent);
    try {
      await invoke("update_setting", { key: "accent_color", value: nextAccent || "" });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      console.error("Failed to save accent setting:", err);
    }
  };

  const handleToggleSound = (enabled: boolean) => {
    setSoundOn(enabled);
    setSoundEnabled(enabled);
    if (enabled) playTaskPopSound(soundProfileId);
  };

  const handleSelectSoundProfile = async (profileId: string) => {
    setSoundProfileId(profileId);
    setSoundProfile(profileId);
    playTaskPopSound(profileId);
    try {
      await invoke("update_setting", { key: "sfx_profile", value: profileId });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      console.error("Failed to save sfx setting:", err);
    }
  };

  const handleSelectTidyProfile = async (tidyId: string) => {
    setTidyProfileId(tidyId);
    setTidySoundProfile(tidyId);
    playSweepSound(tidyId);
    try {
      await invoke("update_setting", { key: "tidy_sfx_profile", value: tidyId });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      console.error("Failed to save tidy sfx setting:", err);
    }
  };

  const handleSelectCompletedPosition = async (pos: "bottom" | "remain") => {
    setCompletedPosition(pos);
    localStorage.setItem("laya-completed-position", pos);
    try {
      await invoke("update_setting", { key: "completed_position", value: pos });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      console.error("Failed to save completed_position setting:", err);
    }
  };

  // Listen for key combinations when recording a shortcut
  useEffect(() => {
    if (!recordingShortcutId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecordingShortcutId(null);
        return;
      }

      const combo = eventToCombo(e);
      if (!combo) return;

      // Check for conflict
      const conflictingId = Object.entries(shortcuts).find(
        ([id, existing]) => id !== recordingShortcutId && isSameCombo(existing, combo)
      )?.[0];

      if (conflictingId) {
        const conflictingDef = SHORTCUT_DEFINITIONS.find((d) => d.id === conflictingId);
        setConflictWarning(`Replaces existing binding on "${conflictingDef?.label || conflictingId}"`);
      } else {
        setConflictWarning(null);
      }

      const updated = { ...shortcuts, [recordingShortcutId]: combo };
      setShortcuts(updated);
      saveSavedShortcuts(updated);
      setRecordingShortcutId(null);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recordingShortcutId, shortcuts]);

  const handleResetShortcut = (id: string) => {
    const def = SHORTCUT_DEFINITIONS.find((d) => d.id === id);
    if (!def) return;
    const updated = { ...shortcuts, [id]: { ...def.defaultCombo } };
    setShortcuts(updated);
    saveSavedShortcuts(updated);
    setConflictWarning(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleResetAllShortcuts = () => {
    const defaults = resetAllShortcuts();
    setShortcuts(defaults);
    setConflictWarning(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const activeWorkspace = workspaces.find((w) => w.is_active === 1) || workspaces[0];

  const lightPresets = THEME_PRESETS.filter((p) => p.mode === "light");
  const darkPresets = THEME_PRESETS.filter((p) => p.mode === "dark");

  return (
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col md:flex-row gap-8 items-start animate-smooth-in overflow-hidden">
      {/* ─── LEFT STATIONARY FIXED SIDEBAR NAVIGATION ──────────────────── */}
      <aside className="w-full md:w-56 shrink-0 space-y-4 select-none pt-1">
        <div className="px-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Jump to section</p>
        </div>

        <nav className="flex md:flex-col gap-1 p-1.5 rounded-2xl bg-card border border-border/80 shadow-2xs overflow-x-auto md:overflow-visible">
          {NAV_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer text-left shrink-0",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{sec.label}</span>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 hidden md:block" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ─── RIGHT MAIN SETTINGS CONTENT (Scrolls Independently) ─────────── */}
      <main
        ref={rightPaneRef}
        className="flex-1 min-w-0 h-full overflow-y-auto pr-3 space-y-8 pb-20"
      >
        {/* ─── 1. APPEARANCE SECTION ──────────────────────────────────────── */}
        <section id="section-appearance" className="space-y-4 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Theme Palettes & Studio
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose from handcrafted cozy palettes or design your own custom theme.
                </p>
              </div>
            </div>

            {/* Exciting Theme Studio Creator Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 space-y-3 shadow-xs select-none">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-2xs">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Theme Studio</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        Creator Mode
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                      Name and craft your personalized palette with real-time UI preview and instant atmosphere tuning.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenThemeStudio()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-md"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open Theme Studio</span>
                </button>
              </div>
            </div>

            {/* My Custom Themes Library */}
            {customThemes.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>My Custom Themes ({customThemes.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenThemeStudio()}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create Another</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customThemes.map((theme) => {
                    const isSelected = currentThemeId === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => void handleSelectPreset(theme.id)}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group select-none",
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-xs"
                            : "border-border bg-background hover:bg-muted/40 hover:border-border/80"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-6 w-6 rounded-lg border border-border/80 shadow-xs flex items-center justify-center"
                              style={{ backgroundColor: theme.baseColor }}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: theme.accentColor }}
                              />
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                              {theme.mode === "dark" ? (
                                <>
                                  <Moon className="h-3 w-3" />
                                  <span>Dark</span>
                                </>
                              ) : (
                                <>
                                  <Sun className="h-3 w-3" />
                                  <span>Light</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenThemeStudio(theme);
                              }}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Edit in Studio"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => void handleDeleteCustomTheme(theme.id, e)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete theme"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            {isSelected && (
                              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center ml-1">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-foreground">{theme.name}</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          Custom {theme.mode} palette • Base {theme.baseColor} • Accent {theme.accentColor}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Light Palettes */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>Light & Warm Palettes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lightPresets.map((preset) => {
                  const isSelected = currentThemeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => void handleSelectPreset(preset.id)}
                      className={cn(
                        "flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-xs"
                          : "border-border bg-background hover:bg-muted/40 hover:border-border/80"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-6 w-6 rounded-lg border border-border/80 shadow-xs flex items-center justify-center"
                            style={{ backgroundColor: preset.previewBg }}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: preset.previewAccent }}
                            />
                          </span>
                        </div>
                        {isSelected && (
                          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-foreground">{preset.name}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark Palettes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Moon className="h-3.5 w-3.5 text-purple-400" />
                <span>Dark & Ambient Palettes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {darkPresets.map((preset) => {
                  const isSelected = currentThemeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => void handleSelectPreset(preset.id)}
                      className={cn(
                        "flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-xs"
                          : "border-border bg-background hover:bg-muted/40 hover:border-border/80"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-6 w-6 rounded-lg border border-border/80 shadow-xs flex items-center justify-center"
                            style={{ backgroundColor: preset.previewBg }}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: preset.previewAccent }}
                            />
                          </span>
                        </div>
                        {isSelected && (
                          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-foreground">{preset.name}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Accent Tint Picker */}
            <div className="pt-4 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paintbrush className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Custom Accent Highlights</span>
                </div>
                {currentAccentId && (
                  <button
                    type="button"
                    onClick={() => void handleSelectAccent(currentAccentId)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Reset to default accent
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_COLORS.map((accent) => {
                  const isSelected = currentAccentId === accent.id;
                  return (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => void handleSelectAccent(accent.id)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/40 text-foreground"
                          : "border-border bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: accent.color }}
                      />
                      <span>{accent.name}</span>
                      {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. TASK WORKFLOW SECTION ───────────────────────────────────── */}
        <section id="section-workflow" className="space-y-6 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Task Workflow & Completion Behavior
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize where finished tasks go when you check them off.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <button
                type="button"
                onClick={() => void handleSelectCompletedPosition("bottom")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group flex flex-col justify-between space-y-3",
                  completedPosition === "bottom"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                    : "border-border bg-background hover:bg-muted/40 hover:border-border/80"
                )}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-foreground block">
                      Move to bottom (Default)
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Completed tasks are moved to the end of the list so open tasks stay front and center.
                    </p>
                  </div>
                  {completedPosition === "bottom" && (
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => void handleSelectCompletedPosition("remain")}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group flex flex-col justify-between space-y-3",
                  completedPosition === "remain"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                    : "border-border bg-background hover:bg-muted/40 hover:border-border/80"
                )}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-foreground block">
                      Remain in place
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Completed tasks stay in their exact position in the list with a clean strikethrough.
                    </p>
                  </div>
                  {completedPosition === "remain" && (
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ─── 3. FOCUS & WINDOW SETTINGS SECTION ──────────────────────────── */}
        <section id="section-focus" className="space-y-6 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Focus Window & Desktop Immersion
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure window layering, native OS fullscreen takeover, and focus sound chimes.
                </p>
              </div>
            </div>

            {/* Desktop Window Controls */}
            <div className="space-y-4">
              <span className="text-xs font-semibold text-foreground block">
                Window Behavior & Stacking
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Float on Top during Focus */}
                <div className="p-4 rounded-xl border border-border bg-background flex items-start justify-between gap-4 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Pin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        Float on Top during Focus
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Automatically keeps the Laya window pinned above all other open apps (browsers, IDEs) while your focus timer is running.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoAlwaysOnTopFocus(!autoAlwaysOnTopFocus)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      autoAlwaysOnTopFocus ? "bg-primary" : "bg-muted"
                    )}
                    role="switch"
                    aria-checked={autoAlwaysOnTopFocus}
                    title="Toggle float on top during focus"
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out",
                        autoAlwaysOnTopFocus ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Real Native OS Fullscreen Zen Mode */}
                <div className="p-4 rounded-xl border border-border bg-background flex items-start justify-between gap-4 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Maximize2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        Real Fullscreen Zen Mode
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Automatically engages true OS full-screen takeover (hiding the taskbar and window frame) upon launching Zen Mode. Esc restores your window.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoFullscreenZen(!autoFullscreenZen)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      autoFullscreenZen ? "bg-primary" : "bg-muted"
                    )}
                    role="switch"
                    aria-checked={autoFullscreenZen}
                    title="Toggle real fullscreen in Zen mode"
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out",
                        autoFullscreenZen ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Pin Window Always on Top (Global) */}
                <div className="p-4 rounded-xl border border-border bg-background flex items-start justify-between gap-4 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Pin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        Pin Window Always on Top (Global)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pins the Laya window permanently above other desktop windows across all tabs and workflows.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleAlwaysOnTop}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isAlwaysOnTop ? "bg-primary" : "bg-muted"
                    )}
                    role="switch"
                    aria-checked={isAlwaysOnTop}
                    title="Toggle global pin on top"
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out",
                        isAlwaysOnTop ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Focus Completion Sound Profile */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Default Focus Alarm Sound</span>
                <span className="text-[11px] text-muted-foreground">Click ▶ to preview chime</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FOCUS_ALARM_PROFILES.map((profile) => {
                  const isSelected = alarmSoundId === profile.id;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => handleAlarmChange(profile.id)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group",
                        isSelected
                          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                          : "bg-background border-border hover:bg-muted/40 hover:border-border/80"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {profile.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60 uppercase">
                            {profile.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {profile.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playFocusAlarmSound(profile.id);
                        }}
                        className="p-1.5 rounded-lg bg-card border border-border text-primary hover:bg-muted transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title={`Preview ${profile.name}`}
                      >
                        <Play className="h-3 w-3 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. KEYBOARD SHORTCUTS SECTION ──────────────────────────────── */}
        <section id="section-shortcuts" className="space-y-6 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-primary" />
                  Keyboard Shortcuts & Hotkeys
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click any key combination to record a custom shortcut.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetAllShortcuts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                title="Reset all shortcuts to defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All</span>
              </button>
            </div>

            {/* Conflict Warning Banner */}
            {conflictWarning && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{conflictWarning}</span>
              </div>
            )}

            {/* Navigation Shortcuts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Navigation & Views
              </h4>
              <div className="space-y-2">
                {SHORTCUT_DEFINITIONS.filter((d) => d.category === "navigation").map((def) => {
                  const currentCombo = shortcuts[def.id] || def.defaultCombo;
                  const isRecording = recordingShortcutId === def.id;
                  const isModified = !isSameCombo(currentCombo, def.defaultCombo);
                  const keyParts = formatShortcut(currentCombo);

                  return (
                    <div
                      key={def.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all duration-150 gap-3",
                        isRecording
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                          : "border-border/80 bg-background hover:bg-muted/30"
                      )}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{def.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{def.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isRecording ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium animate-pulse">
                            <span>Press key combo…</span>
                            <span className="text-[10px] opacity-75 font-mono">(Esc to cancel)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {keyParts.map((part, idx) => (
                              <React.Fragment key={idx}>
                                <kbd className="px-2 py-1 rounded-md bg-muted border border-border/80 text-[11px] font-mono font-semibold text-foreground shadow-2xs">
                                  {part}
                                </kbd>
                                {idx < keyParts.length - 1 && (
                                  <span className="text-muted-foreground/50 text-[10px] font-mono">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        {!isRecording && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRecordingShortcutId(def.id);
                                setConflictWarning(null);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Click to record new shortcut"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {isModified && (
                              <button
                                type="button"
                                onClick={() => handleResetShortcut(def.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title="Reset to default shortcut"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions & Productivity Shortcuts */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Actions & Productivity
              </h4>
              <div className="space-y-2">
                {SHORTCUT_DEFINITIONS.filter((d) => d.category === "actions").map((def) => {
                  const currentCombo = shortcuts[def.id] || def.defaultCombo;
                  const isRecording = recordingShortcutId === def.id;
                  const isModified = !isSameCombo(currentCombo, def.defaultCombo);
                  const keyParts = formatShortcut(currentCombo);

                  return (
                    <div
                      key={def.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all duration-150 gap-3",
                        isRecording
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                          : "border-border/80 bg-background hover:bg-muted/30"
                      )}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{def.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{def.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isRecording ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium animate-pulse">
                            <span>Press key combo…</span>
                            <span className="text-[10px] opacity-75 font-mono">(Esc to cancel)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {keyParts.map((part, idx) => (
                              <React.Fragment key={idx}>
                                <kbd className="px-2 py-1 rounded-md bg-muted border border-border/80 text-[11px] font-mono font-semibold text-foreground shadow-2xs">
                                  {part}
                                </kbd>
                                {idx < keyParts.length - 1 && (
                                  <span className="text-muted-foreground/50 text-[10px] font-mono">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        {!isRecording && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRecordingShortcutId(def.id);
                                setConflictWarning(null);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Click to record new shortcut"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {isModified && (
                              <button
                                type="button"
                                onClick={() => handleResetShortcut(def.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title="Reset to default shortcut"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. SOUND EFFECTS SECTION ───────────────────────────────────── */}
        <section id="section-sound" className="space-y-6 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  Sound Effects & Tactile Audio
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Synthesized 100% locally with Web Audio API for zero latency and offline privacy.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleSound(!soundOn)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  soundOn ? "bg-primary" : "bg-muted"
                )}
                role="switch"
                aria-checked={soundOn}
                title={soundOn ? "Mute sound effects" : "Enable sound effects"}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out",
                    soundOn ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Task Completion Pop Profiles (8 options) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Task Completion Pop Styles</span>
                <span className="text-[11px] text-muted-foreground">Click ▶ to preview sound</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SOUND_PROFILES.map((profile) => {
                  const isSelected = soundProfileId === profile.id;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => void handleSelectSoundProfile(profile.id)}
                      className={cn(
                        "flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                          : "border-border bg-background hover:bg-muted/40 hover:border-border/80",
                        !soundOn && "opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                          {profile.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTaskPopSound(profile.id);
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title={`Play ${profile.name}`}
                          >
                            <Play className="h-3 w-3 fill-current" />
                          </button>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-foreground">{profile.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {profile.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cat Tidy-Up & Sweeping SFX Styles (5 options) */}
            <div className="pt-4 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Cat Tidy-Up & Sweeping SFX Styles</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Click ▶ to preview sweep</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TIDY_SOUND_PROFILES.map((tidy) => {
                  const isSelected = tidyProfileId === tidy.id;
                  return (
                    <div
                      key={tidy.id}
                      onClick={() => void handleSelectTidyProfile(tidy.id)}
                      className={cn(
                        "flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                          : "border-border bg-background hover:bg-muted/40 hover:border-border/80",
                        !soundOn && "opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                          {tidy.tag}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playSweepSound(tidy.id);
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title={`Play ${tidy.name}`}
                          >
                            <Play className="h-3 w-3 fill-current" />
                          </button>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-foreground">{tidy.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {tidy.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SAMMI AI CONFIGURATION SECTION ─────────────────────────────── */}
        <section id="section-ai" className="space-y-4 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  Sammi AI Assistant
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure the intelligence provider, model endpoints, and API credentials.
                </p>
              </div>
              <button
                type="button"
                disabled={isAiTesting}
                onClick={handleTestAi}
                className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <span>{isAiTesting ? "Testing…" : "Test Connection"}</span>
              </button>
            </div>

            {/* Provider Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">Active Intelligence Engine</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateAiConfig({ provider: "offline" })}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                    aiConfig.provider === "offline"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-background hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Recommended
                    </span>
                    {aiConfig.provider === "offline" && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs font-bold text-foreground">Offline Smart</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">0ms latency, zero keys, 100% private.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateAiConfig({ provider: "gemini" })}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                    aiConfig.provider === "gemini"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-background hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                      Cloud API
                    </span>
                    {aiConfig.provider === "gemini" && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs font-bold text-foreground">Google Gemini</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">High reasoning with official API key.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateAiConfig({ provider: "ollama" })}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                    aiConfig.provider === "ollama"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-background hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Local LLM
                    </span>
                    {aiConfig.provider === "ollama" && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs font-bold text-foreground">Local Ollama</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Local neural models via localhost.</p>
                </button>
              </div>
            </div>

            {/* Provider Configuration Forms */}
            {aiConfig.provider === "gemini" && (
              <div className="space-y-3.5 p-4 rounded-xl bg-muted/40 border border-border">
                {/* First-time helper banner */}
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>Google AI Studio API Key</span>
                    </p>
                    <p className="text-[10px] opacity-90 truncate">
                      Free personal API keys provided by Google. No credit card required.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openExternalUrl("https://aistudio.google.com/apikey")}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[10px] flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-2xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Get Free Key ↗</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5 text-primary" />
                      <span>Google Gemini API Key</span>
                    </label>
                    {aiConfig.geminiApiKey && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAiConfig({ geminiApiKey: "" })}
                        className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear Key
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={aiConfig.geminiApiKey || ""}
                      onChange={(e) => handleUpdateAiConfig({ geminiApiKey: e.target.value.trim() })}
                      placeholder="Paste AIzaSy... here"
                      className="w-full bg-background border border-border rounded-xl pl-3 pr-9 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                      title={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Stored 100% locally in your device's preferences. Never shared or uploaded.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Gemini Model</label>
                  <select
                    value={aiConfig.geminiModel || "gemini-3.6-flash"}
                    onChange={(e) => handleUpdateAiConfig({ geminiModel: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash (Fastest, Recommended)</option>
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Ultra Low Latency)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Deep Reasoning)</option>
                  </select>
                </div>
              </div>
            )}

            {aiConfig.provider === "ollama" && (
              <div className="space-y-3.5 p-4 rounded-xl bg-muted/40 border border-border">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Ollama Server Endpoint</label>
                  <input
                    type="text"
                    value={aiConfig.ollamaEndpoint || "http://localhost:11434"}
                    onChange={(e) => handleUpdateAiConfig({ ollamaEndpoint: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Model Name</label>
                  <input
                    type="text"
                    value={aiConfig.ollamaModel || "llama3"}
                    onChange={(e) => handleUpdateAiConfig({ ollamaModel: e.target.value })}
                    placeholder="llama3, mistral, gemma2, etc."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Test Connection Output */}
            {aiTestResult && (
              <div
                className={cn(
                  "p-3 rounded-xl border text-xs flex items-center gap-2",
                  aiTestResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                )}
              >
                {aiTestResult.ok ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{aiTestResult.message}</span>
              </div>
            )}
          </div>
        </section>

        {/* ─── 3. WORKSPACE & DATA SECTION ────────────────────────────────── */}
        <section id="section-workspace" className="space-y-6 scroll-mt-2">
          {/* Notification Banner */}
          {dataBanner && (
            <div
              className={cn(
                "p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-smooth-in",
                dataBanner.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
              )}
            >
              <div className="flex items-center gap-2">
                {dataBanner.type === "success" ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                )}
                <span className="font-medium">{dataBanner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setDataBanner(null)}
                className="text-xs hover:underline cursor-pointer opacity-75 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── 3.1 Overview & Diagnostics Card ── */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span>Workspace & Database Engine</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your workspace data is stored 100% offline in a local SQLite database with zero cloud dependencies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl border border-border bg-background/80 flex items-start gap-3">
                <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <FolderOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Active Workspace</p>
                  <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                    {activeWorkspace?.name || "Personal Workspace"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-1">
                    {activeWorkspace?.description || "Default offline space for planning and notes"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/80 flex items-start gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                  <Database className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Database Engine</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {systemStatus?.db_connected ? "Online & Ready" : "Connecting"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                    SQLite 3 (Local File)
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-1">
                    High-speed offline I/O • ACID transactional safety
                  </p>
                </div>
              </div>
            </div>

            {/* Database File Diagnostics & Entity Stats */}
            {dbStats && (
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5 text-primary" />
                      <span>Database File Path</span>
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate max-w-lg">
                      {dbStats.file_path}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-foreground px-2.5 py-1 rounded-lg bg-background border border-border">
                      {formatBytes(dbStats.file_size_bytes)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dbStats.file_path);
                        setCopiedDbPath(true);
                        playTaskPopSound();
                        setTimeout(() => setCopiedDbPath(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs text-foreground font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedDbPath ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedDbPath ? "Copied" : "Copy Path"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-lg bg-background border border-border text-center">
                    <span className="text-lg font-bold font-mono text-foreground">{dbStats.tasks_count}</span>
                    <p className="text-[10px] text-muted-foreground">Total Tasks</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border text-center">
                    <span className="text-lg font-bold font-mono text-foreground">{dbStats.subtasks_count}</span>
                    <p className="text-[10px] text-muted-foreground">Subtasks</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border text-center">
                    <span className="text-lg font-bold font-mono text-foreground">{dbStats.projects_count}</span>
                    <p className="text-[10px] text-muted-foreground">Projects</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border text-center">
                    <span className="text-lg font-bold font-mono text-foreground">{dbStats.notes_count}</span>
                    <p className="text-[10px] text-muted-foreground">Notes</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 3.2 Database Snapshots & Backups ── */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Archive className="h-4 w-4 text-primary" />
                  <span>Instant SQLite Snapshots</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vacuumed atomic backups saved locally. Restore previous states with zero data corruption.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Open Backups Folder</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateBackup}
                  disabled={isBackingUp}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isBackingUp ? "Creating..." : "Create New Backup"}</span>
                </button>
              </div>
            </div>

            {/* Backups List */}
            {backupsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl space-y-1">
                <p className="font-semibold text-foreground">No backup snapshots found</p>
                <p className="text-[11px]">Click "Create New Backup" above to generate your first instant snapshot.</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {backupsList.map((b) => (
                  <div
                    key={b.file_path}
                    className="p-3.5 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-semibold text-foreground font-mono truncate">
                        {b.file_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(b.created_at * 1000).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}{" "}
                        • <span className="font-mono">{formatBytes(b.file_size_bytes)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setBackupToRestore(b)}
                        className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="h-3 w-3 text-primary" />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBackup(b.file_path)}
                        className="p-1 rounded-lg border border-border/80 text-muted-foreground hover:text-rose-600 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete this snapshot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 3.3 Bulk Data Export ── */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileDown className="h-4 w-4 text-primary" />
                <span>Bulk Data Export & Portability</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export your tasks, projects, and notes into universal formats for spreadsheets, markdown vaults, and backups.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tasks CSV */}
              <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                    <h4 className="text-xs font-bold text-foreground">Tasks to CSV</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Spreadsheet-ready CSV containing task titles, priorities, status, deadlines, projects, and subtasks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportTasksCsv}
                  disabled={isExporting}
                  className="w-full py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Download Tasks (.csv)</span>
                </button>
              </div>

              {/* Projects CSV */}
              <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-500 shrink-0" />
                    <h4 className="text-xs font-bold text-foreground">Projects to CSV</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Summary spreadsheet of all projects, deadlines, completed tasks, active queue, and progress %.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportProjectsCsv}
                  disabled={isExporting}
                  className="w-full py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Download Projects (.csv)</span>
                </button>
              </div>

              {/* Notes Markdown Bundle */}
              <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                    <h4 className="text-xs font-bold text-foreground">Notes Markdown Archive</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Export all notes with YAML frontmatter, headers, and checklists. Fully compatible with Obsidian and Notion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportNotesMarkdown}
                  disabled={isExporting}
                  className="w-full py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Download Notes (.md)</span>
                </button>
              </div>

              {/* Notes to CSV */}
              <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-amber-500 shrink-0" />
                    <h4 className="text-xs font-bold text-foreground">Notes to CSV</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Spreadsheet-ready CSV table of all notes with notebook project, pinned state, word counts, and timestamps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportNotesCsv}
                  disabled={isExporting}
                  className="w-full py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Download Notes (.csv)</span>
                </button>
              </div>

              {/* Full Workspace JSON */}
              <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-cyan-500 shrink-0" />
                    <h4 className="text-xs font-bold text-foreground">Full Workspace JSON</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Complete relational data export including all workspaces, tasks, subtasks, projects, and notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportFullWorkspaceJson}
                  disabled={isExporting}
                  className="w-full py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Download Workspace (.json)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── 3.4 Data Import & Migration ── */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <span>Data Import & Migration</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bulk import tasks from spreadsheets or migrate full workspaces from previous Laya JSON exports.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Import CSV */}
              <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Import Tasks from CSV</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Select a CSV spreadsheet. Columns with "Title" or "Task", "Priority", and "Due Date" will be automatically mapped.
                  </p>
                </div>
                <label className="w-full py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <span>{isImporting ? "Importing..." : "Choose CSV File..."}</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportTasksCsv}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Import JSON */}
              <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Import Workspace from JSON</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Select a previously exported Laya JSON backup file. All tasks, projects, and notes will be merged into your workspace.
                  </p>
                </div>
                <label className="w-full py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <span>{isImporting ? "Importing..." : "Choose JSON Backup File..."}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportWorkspaceJson}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ─── RESTORE SAFETY CONFIRMATION MODAL ───────────────────────────── */}
        {backupToRestore && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-smooth-in">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Restore Database Snapshot?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Please review before proceeding</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                <p className="text-foreground font-semibold">Snapshot Details:</p>
                <div className="space-y-1 text-muted-foreground font-mono text-[11px]">
                  <p>File: <span className="text-foreground">{backupToRestore.file_name}</span></p>
                  <p>Size: <span className="text-foreground">{formatBytes(backupToRestore.file_size_bytes)}</span></p>
                  <p>
                    Created:{" "}
                    <span className="text-foreground">
                      {new Date(backupToRestore.created_at * 1000).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Safety Guaranteed:</strong> An automatic pre-restore safety backup of your current database will be generated before restoring.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBackupToRestore(null)}
                  disabled={isRestoring}
                  className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{isRestoring ? "Restoring..." : "Confirm & Restore Snapshot"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. ABOUT, PRIVACY & HELP SECTION ───────────────────────────── */}
        <section id="section-about" className="space-y-5 scroll-mt-2">
          {/* Story & Philosophy */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold mb-2">
                  <Sparkles className="h-3 w-3" />
                  <span>The Laya Philosophy</span>
                </div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  A Quiet, Tactile Workspace Built for Deep Focus
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                  Modern productivity tools have become noisy, fragile, and bloated with forced cloud subscriptions, endless sync spinners, and intrusive analytics. Laya was crafted as an intentional, local-first sanctuary. Every task, note, calendar entry, and thought lives exclusively on your machine, always accessible, completely private, and free from distractions.
                </p>
              </div>
            </div>

            {/* 4 Core Pillars of Local-First Craft */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <h4 className="text-xs font-semibold text-foreground">100% Offline Resilience</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Zero cloud server dependencies. All task management, note editing, calendar views, and local AI run seamlessly with no internet connection.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary shrink-0" />
                  <h4 className="text-xs font-semibold text-foreground">Permanent SQLite Storage</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your data is stored in standard, human-inspectable SQLite tables on your PC. You retain complete ownership and portability of your files.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-500 shrink-0" />
                  <h4 className="text-xs font-semibold text-foreground">Zero Telemetry & Tracking</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  No remote tracking beacons, behavioral telemetry, or user surveillance. What you write in Laya stays strictly between you and your computer.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-amber-500 shrink-0" />
                  <h4 className="text-xs font-semibold text-foreground">Sovereign AI Intelligence</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sammi AI runs deterministic rule models locally by default. Optional Gemini keys are stored on-device only, or connect local Ollama for zero-data-leakage AI.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive FAQ Accordion */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>Frequently Asked Questions</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Answers to common questions about data storage, backups, printing, and AI privacy.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {[
                {
                  q: "Where is my database physically located on Windows?",
                  a: "Your workspace database is stored at `%APPDATA%\\com.laya.app\\laya.db`. This is a standard SQLite file containing all your tasks, subtasks, notes, project records, and local settings. You can copy or back up this single file at any time to preserve your entire workspace history.",
                },
                {
                  q: "How do I create backups or transfer my workspace to another PC?",
                  a: "Navigate to the 'Workspace & Data' tab above. Click 'Create Full Database Backup' to create an instant timestamped copy in your backups directory, or use 'Export JSON' to create a portable document. You can also export tasks and projects to CSV, and notes to Markdown files.",
                },
                {
                  q: "How does Sammi AI operate without leaking my sensitive thoughts?",
                  a: "By default, Sammi uses an instant, 0ms local deterministic rule engine running entirely inside the Tauri Rust binary. It parses your workspace locally without any network requests. If you configure Google Gemini, requests are sent directly from your device to Google using your personal key with zero intermediate proxies. If you select Ollama, all processing runs locally on your PC.",
                },
                {
                  q: "Can I print my tasks, notes, or weekly analytics reports?",
                  a: "Yes. Press Ctrl+P on your keyboard from any view (Notes, Tasks, or Analytics). Laya includes a dedicated print stylesheet that automatically strips the sidebar, headers, and UI buttons, formatting your content cleanly on paper with crisp, high-contrast typography.",
                },
                {
                  q: "What keyboard shortcuts can I use for fast daily workflows?",
                  a: "Press Ctrl+K to open the spotlight Command Palette from any view. Press Ctrl+T to quickly capture a task. You can customize all key combinations in the 'Shortcuts' tab above, and toggle between light and dark themes using Ctrl+Shift+L.",
                },
              ].map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                const isCopied = copiedFaqIndex === idx;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border transition-all duration-150 overflow-hidden",
                      isOpen ? "bg-muted/30 border-border" : "bg-background border-border/70 hover:border-border"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-foreground cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-primary">0{idx + 1}.</span>
                        <span>{faq.q}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-3.5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40 animate-fade-in space-y-2">
                        <p>{faq.a}</p>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(`${faq.q}\n\n${faq.a}`);
                              setCopiedFaqIndex(idx);
                              setTimeout(() => setCopiedFaqIndex(null), 2000);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Answer</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy Policy & Terms Declaration */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Local-First Privacy Policy & Terms</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your content belongs exclusively to you. By creating tasks, notes, or schedules in Laya, you grant zero rights or licenses to anyone. Laya does not require an account, does not retain passwords on remote servers, and does not sell or analyze your personal information.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground/80 font-mono">
              <span>Open Source Architecture</span>
              <span>-</span>
              <span>MIT License</span>
              <span>-</span>
              <span>No Cloud Lock-In</span>
            </div>
          </div>

          {/* System Diagnostics & Copyright Footer */}
          <div className="border border-border/60 bg-muted/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Laya Workspace</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                    v0.1.0
                  </span>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Local-First
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  &copy; {new Date().getFullYear()} Laya Workspace. Calm productivity operating system for Windows.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const diagInfo = [
                  `Laya Workspace v0.1.0 (Desktop Edition)`,
                  `OS: Windows (Tauri 2.3 Rust Shell)`,
                  `Engine: SQLite 3 + React 19 + TypeScript`,
                  `Storage Status: ${systemStatus?.db_connected ? "Connected" : "Offline"}`,
                  `Offline Ready: ${systemStatus?.offline_ready ? "Yes" : "No"}`,
                  `Timestamp: ${new Date().toISOString()}`,
                ].join("\n");
                void navigator.clipboard.writeText(diagInfo);
                setCopiedDiag(true);
                setTimeout(() => setCopiedDiag(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-medium transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              {copiedDiag ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Diagnostics Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copy System Diagnostics</span>
                </>
              )}
            </button>
          </div>
        </section>
      </main>

      {/* Saved Toast Notification */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl shadow-xl text-xs font-medium text-foreground animate-smooth-in">
          <Check className="h-4 w-4 text-emerald-500" />
          Settings updated
        </div>
      )}

      {/* Theme Studio Creator Modal */}
      {isThemeStudioOpen && (
        <ThemeStudioModal
          isOpen={isThemeStudioOpen}
          onClose={() => setIsThemeStudioOpen(false)}
          initialTheme={editingTheme}
          onSaved={handleCustomThemeSaved}
        />
      )}
    </div>
  );
};
