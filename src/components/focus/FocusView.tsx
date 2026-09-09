import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  playTaskPopSound,
  playFocusAlarmSound,
  FOCUS_ALARM_PROFILES,
  ambientSound,
  soundscapeStudio,
  SOUNDSCAPE_TRACKS,
  type SoundscapeTrackId,
  type AmbientSoundType,
} from "../../lib/sound";
import type { Task, Subtask } from "../tasks/TasksView";

interface FocusViewProps {
  workspaceId: string;
}

type TimerMode = "pomodoro" | "deepFocus" | "shortBreak" | "longBreak" | "custom";

const TIMER_PRESETS: Record<Exclude<TimerMode, "custom">, { label: string; minutes: number; icon: React.ComponentType<{ className?: string }> }> = {
  pomodoro: { label: "Focus (25m)", minutes: 25, icon: Target },
  deepFocus: { label: "Deep Work (50m)", minutes: 50, icon: Flame },
  shortBreak: { label: "Short Break (5m)", minutes: 5, icon: Coffee },
  longBreak: { label: "Long Break (15m)", minutes: 15, icon: Sparkles },
};

const AMBIENT_PRESETS: { id: AmbientSoundType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "none", label: "Mute", icon: VolumeX },
  { id: "rain", label: "Rain", icon: CloudRain },
  { id: "fire", label: "Fireplace", icon: FlameKindling },
  { id: "forest", label: "Forest", icon: Trees },
  { id: "brown-noise", label: "Brown Noise", icon: Radio },
];

export const FocusView: React.FC<FocusViewProps> = ({ workspaceId }) => {
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [customMinutes, setCustomMinutes] = useState<number>(() => {
    const saved = localStorage.getItem("laya-focus-custom-minutes");
    return saved ? Math.max(1, Math.min(180, parseInt(saved, 10))) : 45;
  });
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    const saved = localStorage.getItem("laya-focus-sessions-today");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [totalFocusMinutesToday, setTotalFocusMinutesToday] = useState(() => {
    const saved = localStorage.getItem("laya-focus-minutes-today");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Active Task & Subtasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Selected Alarm Sound
  const [alarmSoundId, setAlarmSoundId] = useState<string>(() => {
    return localStorage.getItem("laya-focus-alarm-sound") || "temple-gong";
  });

  // Ambient Sound Generator
  const [ambientType, setAmbientType] = useState<AmbientSoundType>("none");
  const [ambientVol, setAmbientVol] = useState<number>(() => {
    const saved = localStorage.getItem("laya-focus-ambient-vol");
    return saved ? parseFloat(saved) : 0.35;
  });

  // Multi-Track Ambient Sound Studio
  const [showMixerStudio, setShowMixerStudio] = useState(false);
  const [activeSoundTracks, setActiveSoundTracks] = useState<SoundscapeTrackId[]>(() =>
    soundscapeStudio.getActiveTracks()
  );
  const [masterSoundVol, setMasterSoundVol] = useState<number>(() =>
    soundscapeStudio.getMasterVolume()
  );
  const [trackVols, setTrackVols] = useState<Record<SoundscapeTrackId, number>>(() => {
    const vols: Partial<Record<SoundscapeTrackId, number>> = {};
    SOUNDSCAPE_TRACKS.forEach((t) => {
      vols[t.id] = soundscapeStudio.getTrackVolume(t.id);
    });
    return vols as Record<SoundscapeTrackId, number>;
  });

  const timerRef = useRef<number | null>(null);

  // Load active tasks for focus task selector
  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await invoke<Task[]>("get_tasks", { workspaceId });
        const active = res.filter((t) => t.status !== "completed" && t.status !== "archived");
        setTasks(active);
        if (active.length > 0 && !selectedTaskId) {
          setSelectedTaskId(active[0].id);
        }
      } catch (err) {
        console.error("Failed to load tasks for focus timer:", err);
      }
    }
    if (workspaceId) void loadTasks();
  }, [workspaceId]);

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

  // Clean up ambient sound on unmount
  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  // Timer countdown loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, alarmSoundId, totalDurationSeconds]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playFocusAlarmSound(alarmSoundId);

    if (mode === "pomodoro" || mode === "deepFocus" || mode === "custom") {
      const sessionMins = Math.round(totalDurationSeconds / 60);
      const nextCompleted = sessionsCompleted + 1;
      const nextMins = totalFocusMinutesToday + sessionMins;

      setSessionsCompleted(nextCompleted);
      setTotalFocusMinutesToday(nextMins);
      localStorage.setItem("laya-focus-sessions-today", String(nextCompleted));
      localStorage.setItem("laya-focus-minutes-today", String(nextMins));

      // Auto-suggest break
      const nextMode = nextCompleted % 4 === 0 ? "longBreak" : "shortBreak";
      setMode(nextMode);
      const nextSecs = TIMER_PRESETS[nextMode].minutes * 60;
      setTotalDurationSeconds(nextSecs);
      setTimeLeft(nextSecs);
    } else {
      setMode("pomodoro");
      const nextSecs = TIMER_PRESETS.pomodoro.minutes * 60;
      setTotalDurationSeconds(nextSecs);
      setTimeLeft(nextSecs);
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    let seconds = 25 * 60;
    if (newMode === "custom") {
      seconds = customMinutes * 60;
    } else {
      seconds = TIMER_PRESETS[newMode].minutes * 60;
    }
    setTotalDurationSeconds(seconds);
    setTimeLeft(seconds);
  };

  const handleCustomMinutesChange = (newMins: number) => {
    const clamped = Math.max(1, Math.min(180, newMins));
    setCustomMinutes(clamped);
    localStorage.setItem("laya-focus-custom-minutes", String(clamped));
    if (mode === "custom") {
      setIsRunning(false);
      setTotalDurationSeconds(clamped * 60);
      setTimeLeft(clamped * 60);
    }
  };

  const adjustTimeByMinutes = (delta: number) => {
    if (mode === "custom") {
      handleCustomMinutesChange(customMinutes + delta);
    } else {
      setTimeLeft((prev) => Math.max(60, prev + delta * 60));
      setTotalDurationSeconds((prev) => Math.max(60, prev + delta * 60));
    }
  };

  const handleAlarmChange = (soundId: string) => {
    setAlarmSoundId(soundId);
    localStorage.setItem("laya-focus-alarm-sound", soundId);
    playFocusAlarmSound(soundId);
  };

  const handleAmbientChange = (type: AmbientSoundType) => {
    setAmbientType(type);
    if (type === "none") {
      ambientSound.stop();
    } else {
      ambientSound.start(type, ambientVol);
    }
  };

  const handleAmbientVolChange = (vol: number) => {
    setAmbientVol(vol);
    localStorage.setItem("laya-focus-ambient-vol", String(vol));
    ambientSound.setVolume(vol);
  };

  const handleToggleSoundTrack = (trackId: SoundscapeTrackId) => {
    playTaskPopSound();
    soundscapeStudio.toggleTrack(trackId);
    setActiveSoundTracks(soundscapeStudio.getActiveTracks());
  };

  const handleTrackVolumeChange = (trackId: SoundscapeTrackId, vol: number) => {
    soundscapeStudio.setTrackVolume(trackId, vol);
    setTrackVols((prev) => ({ ...prev, [trackId]: vol }));
  };

  const handleMasterVolumeChange = (vol: number) => {
    soundscapeStudio.setMasterVolume(vol);
    setMasterSoundVol(vol);
  };

  const handleMuteAllTracks = () => {
    playTaskPopSound();
    soundscapeStudio.stopAll();
    ambientSound.stop();
    setAmbientType("none");
    setActiveSoundTracks([]);
  };

  const toggleRunning = () => {
    playTaskPopSound();
    if (!isRunning && ambientType !== "none") {
      ambientSound.start(ambientType, ambientVol);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(totalDurationSeconds);
  };

  const skipTimer = () => {
    handleTimerComplete();
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercent = totalDurationSeconds > 0
    ? ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100
    : 0;

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-6 animate-smooth-in select-none">
      {/* ─── 1. TOP HEADER & AMBIENT CONTROLLER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-border rounded-2xl shadow-card">
        {/* Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center bg-muted/60 p-1 rounded-xl border border-border/80 gap-1">
          {(Object.keys(TIMER_PRESETS) as (keyof typeof TIMER_PRESETS)[]).map((m) => {
            const cfg = TIMER_PRESETS[m];
            const Icon = cfg.icon;
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
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
                Layer multiple procedural focus soundscapes concurrently with independent volume channels.
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
                  onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
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
                  onClick={handleMuteAllTracks}
                  className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Mute all active tracks"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Mute All</span>
                </button>
              )}
            </div>
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
                      onClick={() => handleToggleSoundTrack(track.id)}
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
                        onChange={(e) => handleTrackVolumeChange(track.id, parseFloat(e.target.value))}
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
                onChange={(e) => setSelectedTaskId(e.target.value || null)}
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

      {/* ─── 3. BOTTOM STATS BAR ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-border bg-card shadow-card">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground font-medium">Sessions Today</span>
            <p className="text-lg font-bold font-mono text-foreground">{sessionsCompleted}</p>
          </div>
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
              {selectedTask ? selectedTask.title : "Free Session"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
