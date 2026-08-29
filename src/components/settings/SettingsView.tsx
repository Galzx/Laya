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
} from "lucide-react";
import { cn } from "../../lib/utils";
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

export type SectionId = "appearance" | "workflow" | "sound" | "workspace" | "about";

interface NavSectionItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_SECTIONS: NavSectionItem[] = [
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme palettes & accents" },
  { id: "workflow", label: "Task Workflow", icon: CheckSquare, description: "Completed task order & behavior" },
  { id: "sound", label: "Sound Effects", icon: Volume2, description: "Pop styles & tidy-up SFX" },
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

  const rightPaneRef = useRef<HTMLElement>(null);

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
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">
                              {theme.mode === "dark" ? "🌙 Dark" : "☀️ Light"}
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

        {/* ─── 2. SOUND EFFECTS SECTION ───────────────────────────────────── */}
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

        {/* ─── 3. SOUND EFFECTS SECTION ───────────────────────────────────── */}
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

        {/* ─── 3. WORKSPACE & DATA SECTION ────────────────────────────────── */}
        <section id="section-workspace" className="space-y-4 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Workspace & Local Database
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your workspace data is stored 100% offline in a local SQLite database.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
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
                    Zero cloud dependencies • High-speed offline I/O
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. ABOUT & PRIVACY SECTION ─────────────────────────────────── */}
        <section id="section-about" className="space-y-4 scroll-mt-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Privacy & Security
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Laya is built on local-first principles.
              </p>
            </div>

            <div className="space-y-2.5 pt-1 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-background border border-border/70">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-foreground font-medium">Local-Only Storage: </strong>
                  All your tasks, subtasks, notes, and preferences live exclusively on your computer. Nothing is ever sent to external cloud servers.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-background border border-border/70">
                <HardDrive className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong className="text-foreground font-medium">Native Tauri Desktop App: </strong>
                  Powered by Tauri 2 and Rust for lightweight memory footprint, instant startup, and seamless Windows integration.
                </p>
              </div>
            </div>
          </div>

          {/* About Laya */}
          <div className="border border-border/60 bg-muted/20 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div>
                <span className="font-semibold text-foreground">Laya Workspace</span>
                <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">v0.1.0</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span>Calm productivity workspace for Windows</span>
            </div>
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
