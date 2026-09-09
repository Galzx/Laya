import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Sparkles,
  Target,
  Coffee,
  Volume2,
  Sliders,
  Plus,
  Minus,
  CheckCircle2,
  Circle,
  Flame,
  CloudRain,
  FlameKindling,
  Trees,
  Radio,
  VolumeX,
  ListTodo,
  SlidersHorizontal,
  Maximize2,
  Maximize,
  Minimize2,
  Pin,
  History,
  Trash2,
  Check,
  Music2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  playTaskPopSound,
  playFocusAlarmSound,
  FOCUS_ALARM_PROFILES,
  SOUNDSCAPE_TRACKS,
  SOUNDSCAPE_MIXES,
  type AmbientSoundType,
} from "../../lib/sound";
import { useFocusTimer, TIMER_PRESETS } from "../../lib/focusContext";
import type { Task, Subtask } from "../tasks/TasksView";

interface FocusViewProps {
  workspaceId: string;
}

const AMBIENT_PRESETS: { id: AmbientSoundType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "none", label: "Mute", icon: VolumeX },
  { id: "rain", label: "Rain", icon: CloudRain },
  { id: "fire", label: "Fireplace", icon: FlameKindling },
  { id: "forest", label: "Forest", icon: Trees },
  { id: "brown-noise", label: "Brown Noise", icon: Radio },
];

export const FocusView: React.FC<FocusViewProps> = ({ workspaceId }) => {
  const {
    mode,
    customMinutes,
    timeLeft,
    isRunning,
    progressPercent,
    sessionsCompletedToday,
    totalFocusMinutesToday,
    selectedTaskId,
    selectedTaskTitle,
    alarmSoundId,
    setIsZenMode,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    isFullscreen,
    toggleFullscreen,
    ambientType,
    ambientVol,
    showMixerStudio,
    activeSoundTracks,
    masterSoundVol,
    trackVols,
    sessionLogs,
    toggleRunning,
    resetTimer,
    skipTimer,
    switchMode,
    handleCustomMinutesChange,
    adjustTimeByMinutes,
    setSelectedTask,
    handleAlarmChange,
    handleAmbientChange,
    handleAmbientVolChange,
    setShowMixerStudio,
    toggleSoundTrack,
    setTrackVolume,
    setMasterSoundVol,
    muteAllTracks,
    applySoundMix,
    clearTodayHistory,
    formatTime,
  } = useFocusTimer();

  // Tasks & Subtasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Load active tasks for focus task selector
  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await invoke<Task[]>("get_tasks", { workspaceId });
        const active = res.filter((t) => t.status !== "completed" && t.status !== "archived");
        setTasks(active);
        if (active.length > 0 && !selectedTaskId) {
          setSelectedTask(active[0].id, active[0].title);
        }
      } catch (err) {
        console.error("Failed to load tasks for focus timer:", err);
      }
    }
    if (workspaceId) void loadTasks();
  }, [workspaceId, selectedTaskId, setSelectedTask]);

  // Load subtasks whenever selectedTaskId changes
  useEffect(() => {
    async function loadSubtasks() {
      if (!selectedTaskId) {
        setSubtasks([]);
        return;
      }
      try {
        const res = await invoke<Subtask[]>("get_subtasks", { taskId: selectedTaskId });
        setSubtasks(res);
      } catch (err) {
        console.error("Failed to load subtasks for focus task:", err);
      }
    }
    void loadSubtasks();
  }, [selectedTaskId]);

  const handleToggleSubtask = async (sub: Subtask) => {
    playTaskPopSound();
    try {
      await invoke("toggle_subtask", { subtaskId: sub.id });
      setSubtasks((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, is_completed: s.is_completed === 1 ? 0 : 1 } : s))
      );
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTaskId) return;
    playTaskPopSound();
    try {
      const created = await invoke<Subtask>("create_subtask", {
        taskId: selectedTaskId,
        title: newSubtaskTitle.trim(),
      });
      setSubtasks((prev) => [...prev, created]);
      setNewSubtaskTitle("");
    } catch (err) {
      console.error("Failed to add subtask:", err);
    }
  };

  const handleCompleteLinkedTask = async (taskId: string) => {
    playTaskPopSound();
    try {
      await invoke("toggle_task_status", { taskId });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTask(null, null);
      }
    } catch (err) {
      console.error("Failed to complete task from focus view:", err);
    }
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-6 animate-smooth-in select-none">
      {/* ─── 1. TOP HEADER & AMBIENT CONTROLLER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-border rounded-2xl shadow-card">
        {/* Mode Switcher Tabs + Zen Mode Button */}
        <div className="flex flex-wrap items-center bg-muted/60 p-1 rounded-xl border border-border/80 gap-1">
          {([
            { id: "pomodoro", icon: Target, label: "Focus (25m)" },
            { id: "deepFocus", icon: Flame, label: "Deep Work (50m)" },
            { id: "shortBreak", icon: Coffee, label: "Short Break (5m)" },
            { id: "longBreak", icon: Sparkles, label: "Long Break (15m)" },
          ] as const).map((cfg) => {
            const Icon = cfg.icon;
            const isActive = mode === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => switchMode(cfg.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  isActive
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cfg.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => switchMode("custom")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              mode === "custom"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Custom ({customMinutes}m)</span>
          </button>

          {/* Zen Mode Button */}
          <button
            type="button"
            onClick={() => setIsZenMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer border border-primary/20"
            title="Launch Full-Screen Zen Mode (Esc to exit)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Zen Mode</span>
          </button>

          {/* Float on Top (Pin Window) Button */}
          <button
            type="button"
            onClick={toggleAlwaysOnTop}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
              isAlwaysOnTop
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted"
            )}
            title={isAlwaysOnTop ? "Float on Top active: Window stays above other applications" : "Float on Top: Pin Laya window above all other desktop apps"}
          >
            <Pin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isAlwaysOnTop ? "Pinned on Top" : "Float on Top"}</span>
          </button>

          {/* Real Native Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
              isFullscreen
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted"
            )}
            title={isFullscreen ? "Exit Real Fullscreen" : "Enter Real OS Fullscreen (exclusive monitor takeover)"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>
        </div>

        {/* Ambient Soundscape Pills & Sound Studio Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/60 gap-1">
            {AMBIENT_PRESETS.map((p) => {
              const Icon = p.icon;
              const isActive = ambientType === p.id && activeSoundTracks.length <= 1;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAmbientChange(p.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title={`Ambient: ${p.label}`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden md:inline">{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Multi-Track Sound Studio Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMixerStudio(!showMixerStudio)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs",
              showMixerStudio
                ? "bg-primary text-primary-foreground border-primary"
                : activeSoundTracks.length > 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/50 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted"
            )}
            title="Multi-Track Ambient Sound Studio"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Studio</span>
            {activeSoundTracks.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                {activeSoundTracks.length}
              </span>
            )}
          </button>

          {/* Ambient Volume Slider (Visible when single track is active) */}
          {ambientType !== "none" && !showMixerStudio && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/40 rounded-xl border border-border/60 animate-fade-in">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={ambientVol}
                onChange={(e) => handleAmbientVolChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-muted-foreground/30 accent-primary cursor-pointer"
                title="Ambient sound volume"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── MULTI-TRACK SOUND STUDIO PANEL (Collapsible) ─── */}
      {showMixerStudio && (
        <div className="p-5 bg-card border border-border rounded-2xl shadow-card space-y-4 animate-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span>Multi-Track Soundscape Studio</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Layer procedural focus soundscapes with independent channels and 1-click curated mixes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Master Volume Slider */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-foreground">Master:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterSoundVol}
                  onChange={(e) => setMasterSoundVol(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-muted-foreground/30 accent-primary cursor-pointer"
                  title={`Master Volume: ${Math.round(masterSoundVol * 100)}%`}
                />
                <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
                  {Math.round(masterSoundVol * 100)}%
                </span>
              </div>

              {activeSoundTracks.length > 0 && (
                <button
                  type="button"
                  onClick={muteAllTracks}
                  className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Mute all active tracks"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Mute All</span>
                </button>
              )}
            </div>
          </div>

          {/* 1-Click Curated Mixes Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/80 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5 shrink-0">
              <Music2 className="h-3.5 w-3.5 text-primary" />
              <span>Curated Mixes:</span>
            </span>
            {SOUNDSCAPE_MIXES.map((mix) => (
              <button
                key={mix.id}
                type="button"
                onClick={() => applySoundMix(mix.id)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs hover:border-primary/40 flex items-center gap-1.5"
                title={mix.description}
              >
                <span>{mix.name}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({mix.tracks.length} tracks)
                </span>
              </button>
            ))}
          </div>

          {/* 6 Soundscape Track Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {SOUNDSCAPE_TRACKS.map((track) => {
              const isActive = activeSoundTracks.includes(track.id);
              const vol = trackVols[track.id] ?? track.defaultVolume;
              return (
                <div
                  key={track.id}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3",
                    isActive
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-2xs"
                      : "bg-background border-border hover:border-border/80"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {track.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60 uppercase">
                          {track.tag}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSoundTrack(track.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs",
                        isActive
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      )}
                    >
                      {isActive ? "Playing" : "Start"}
                    </button>
                  </div>

                  {/* Individual Track Volume Slider */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground font-medium">Channel Vol</span>
                    <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={vol}
                        onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                        className="w-full h-1 bg-muted-foreground/30 accent-primary cursor-pointer"
                        title={`${track.name} volume: ${Math.round(vol * 100)}%`}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
                        {Math.round(vol * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Duration Stepper Toolbar */}
      {mode === "custom" && (
        <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-2xl text-xs animate-fade-in">
          <span className="text-muted-foreground font-medium">Quick Presets:</span>
          <div className="flex items-center gap-2">
            {[15, 30, 45, 60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleCustomMinutesChange(mins)}
                className={cn(
                  "px-3 py-1 rounded-lg font-mono font-medium transition-colors cursor-pointer",
                  customMinutes === mins
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-card border border-border text-foreground hover:bg-muted"
                )}
              >
                {mins}m
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 border-l border-border/80 pl-3">
            <button
              type="button"
              onClick={() => handleCustomMinutesChange(customMinutes - 5)}
              className="p-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
              title="Decrease 5 minutes"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono font-bold px-2 text-foreground min-w-[40px] text-center">
              {customMinutes}m
            </span>
            <button
              type="button"
              onClick={() => handleCustomMinutesChange(customMinutes + 5)}
              className="p-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
              title="Increase 5 minutes"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 2. MAIN 2-COLUMN IMMERSIVE FOCUS WORKSPACE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
        {/* LEFT COLUMN: Circular Timer, Controls & Alarm Picker (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl shadow-card space-y-6 relative overflow-hidden">
          {/* Subtle Ambient Breathing Aura Ring */}
          {isRunning && (
            <div className="absolute inset-0 bg-primary/5 blur-3xl animate-pulse pointer-events-none rounded-3xl" />
          )}

          {/* Big Circular Progress Indicator */}
          <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-muted/40 stroke-current"
                strokeWidth="3.5"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                className={cn(
                  "stroke-current transition-all duration-700 ease-linear",
                  mode.includes("Break") ? "text-emerald-500" : "text-primary"
                )}
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Timer Typography */}
            <div className="absolute flex flex-col items-center justify-center text-center space-y-1">
              <span className="text-5xl sm:text-6xl font-bold font-mono tracking-tight text-foreground">
                {formatTime(timeLeft)}
              </span>
              <div className="flex items-center gap-1.5 text-xs uppercase font-semibold text-muted-foreground tracking-widest mt-1">
                {isRunning && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
                <span>
                  {isRunning
                    ? mode.includes("Break") ? "Resting" : "Deep Focus Active"
                    : mode === "custom" ? `Custom (${customMinutes}m)` : TIMER_PRESETS[mode].label}
                </span>
              </div>
            </div>
          </div>

          {/* Quick ±5m Steppers */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => adjustTimeByMinutes(-5)}
              className="px-3 py-1 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              -5 min
            </button>
            <span className="text-muted-foreground/40">•</span>
            <button
              type="button"
              onClick={() => adjustTimeByMinutes(5)}
              className="px-3 py-1 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              +5 min
            </button>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={resetTimer}
              className="p-3.5 rounded-2xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:scale-105"
              title="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={toggleRunning}
              className={cn(
                "px-8 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2.5 hover:scale-105",
                isRunning
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              )}
            >
              {isRunning ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              <span>{isRunning ? "Pause Session" : "Start Focus"}</span>
            </button>

            <button
              type="button"
              onClick={skipTimer}
              className="p-3.5 rounded-2xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:scale-105"
              title="Skip / Complete session"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Dedicated Completion Alarm Soundscape Selector */}
          <div className="w-full max-w-sm pt-4 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Volume2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">Alarm Sound:</span>
            </div>

            <select
              value={alarmSoundId}
              onChange={(e) => handleAlarmChange(e.target.value)}
              className="flex-1 bg-muted/60 hover:bg-muted border border-border text-xs font-medium text-foreground rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer truncate"
            >
              {FOCUS_ALARM_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tag})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => playFocusAlarmSound(alarmSoundId)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-[11px] font-semibold text-primary cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
              title="Test alarm soundscape"
            >
              <Play className="h-2.5 w-2.5 fill-current" />
              <span>Test</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Task Objective & Subtasks Dock (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col p-6 bg-card border border-border rounded-2xl shadow-card space-y-5 h-full">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Current Objective
              </h3>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {subtasks.filter((s) => s.is_completed === 1).length}/{subtasks.length} done
            </span>
          </div>

          {/* Task Selector Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              Link Focus to Task:
            </label>
            {tasks.length > 0 ? (
              <select
                value={selectedTaskId || ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const t = tasks.find((item) => item.id === id);
                  setSelectedTask(id, t ? t.title : null);
                }}
                className="w-full bg-muted/50 hover:bg-muted border border-border text-xs font-semibold text-foreground rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
              >
                <option value="">Free Focus (No task linked)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.priority})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No active tasks. You can focus freely or create one.
              </p>
            )}
          </div>

          {/* Subtasks Interactive Action List */}
          <div className="flex-1 flex flex-col space-y-3 min-h-[160px]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Session Subtasks</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-56 pr-1">
              {subtasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-2xl space-y-1">
                  <p className="font-medium text-foreground/80">No subtasks yet</p>
                  <p className="text-[11px]">Break your session down into 2-3 quick actionable steps below.</p>
                </div>
              ) : (
                subtasks.map((sub) => {
                  const isDone = sub.is_completed === 1;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => void handleToggleSubtask(sub)}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer",
                        isDone
                          ? "bg-muted/30 border-border/50 text-muted-foreground line-through"
                          : "bg-background border-border hover:border-primary/40 text-foreground"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                      )}
                      <span className="truncate">{sub.title}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Add Subtask Input */}
            {selectedTaskId && (
              <form onSubmit={handleAddSubtask} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add quick checklist step…"
                  className="flex-1 bg-muted/40 border border-border text-xs rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer shadow-xs"
                  title="Add subtask"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. BOTTOM STATS & HISTORY BAR ─── */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">Sessions Today</span>
                <p className="text-lg font-bold font-mono text-foreground">{sessionsCompletedToday}</p>
              </div>
            </div>

            {sessionLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="px-2.5 py-1 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Toggle session history list"
              >
                <History className="h-3.5 w-3.5" />
                <span>{showHistory ? "Hide" : "Logs"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-border bg-card shadow-card">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium">Focus Time Logged</span>
              <p className="text-lg font-bold font-mono text-foreground">
                {totalFocusMinutesToday > 60
                  ? `${Math.floor(totalFocusMinutesToday / 60)}h ${totalFocusMinutesToday % 60}m`
                  : `${totalFocusMinutesToday}m`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-border bg-card shadow-card">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium">Active Focus Target</span>
              <p className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                {selectedTask ? selectedTask.title : (selectedTaskTitle || "Free Session")}
              </p>
            </div>
          </div>
        </div>

        {/* Expandable Session Logs Drawer */}
        {showHistory && (
          <div className="p-4 bg-card border border-border rounded-2xl shadow-card space-y-3 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Today's Completed Sessions ({sessionLogs.length})
                </h4>
              </div>

              <button
                type="button"
                onClick={clearTodayHistory}
                className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-1"
                title="Reset today's logs"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear Today</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {sessionLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl border border-border/80 bg-background/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground">{log.durationMinutes}m</span>
                      <span className="text-[10px] text-muted-foreground font-mono">@{log.completedAt}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                      {log.taskTitle || "Free Focus"}
                    </p>
                  </div>

                  {log.taskId && tasks.some((t) => t.id === log.taskId) && (
                    <button
                      type="button"
                      onClick={() => handleCompleteLinkedTask(log.taskId!)}
                      className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                      title="Mark linked task as done"
                    >
                      <Check className="h-3 w-3" />
                      <span>Finish</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
