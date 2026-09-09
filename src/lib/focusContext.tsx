import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  playTaskPopSound,
  playFocusAlarmSound,
  ambientSound,
  soundscapeStudio,
  SOUNDSCAPE_TRACKS,
  sendFocusNotification,
  type SoundscapeTrackId,
  type AmbientSoundType,
} from "./sound";
import {
  setAlwaysOnTop,
  setNativeFullscreen,
  showMiniTimer,
  hideMiniTimer,
} from "./desktopWindow";

export type TimerMode = "pomodoro" | "deepFocus" | "shortBreak" | "longBreak" | "custom";

export const TIMER_PRESETS: Record<Exclude<TimerMode, "custom">, { label: string; minutes: number }> = {
  pomodoro: { label: "Focus", minutes: 25 },
  deepFocus: { label: "Deep Work", minutes: 50 },
  shortBreak: { label: "Short Break", minutes: 5 },
  longBreak: { label: "Long Break", minutes: 15 },
};

export interface FocusSessionLog {
  id: string;
  completedAt: string;
  durationMinutes: number;
  mode: TimerMode;
  taskId?: string | null;
  taskTitle?: string | null;
}

export function getTodayDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface FocusContextType {
  mode: TimerMode;
  customMinutes: number;
  totalDurationSeconds: number;
  timeLeft: number;
  isRunning: boolean;
  progressPercent: number;
  sessionsCompletedToday: number;
  totalFocusMinutesToday: number;
  selectedTaskId: string | null;
  selectedTaskTitle: string | null;
  alarmSoundId: string;
  isZenMode: boolean;
  setIsZenMode: (zen: boolean) => void;
  toggleZenMode: () => void;
  isAlwaysOnTop: boolean;
  toggleAlwaysOnTop: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  autoFullscreenZen: boolean;
  setAutoFullscreenZen: (val: boolean) => void;
  autoAlwaysOnTopFocus: boolean;
  setAutoAlwaysOnTopFocus: (val: boolean) => void;
  autoPopoutMiniTimer: boolean;
  setAutoPopoutMiniTimer: (val: boolean) => void;
  isMiniTimerOpen: boolean;
  openMiniTimer: () => void;
  closeMiniTimer: () => void;
  ambientType: AmbientSoundType;
  ambientVol: number;
  showMixerStudio: boolean;
  activeSoundTracks: SoundscapeTrackId[];
  masterSoundVol: number;
  trackVols: Record<SoundscapeTrackId, number>;
  sessionLogs: FocusSessionLog[];

  // Actions
  toggleRunning: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
  switchMode: (newMode: TimerMode) => void;
  handleCustomMinutesChange: (mins: number) => void;
  adjustTimeByMinutes: (delta: number) => void;
  setSelectedTask: (taskId: string | null, title?: string | null) => void;
  handleAlarmChange: (soundId: string) => void;
  handleAmbientChange: (type: AmbientSoundType) => void;
  handleAmbientVolChange: (vol: number) => void;
  setShowMixerStudio: (show: boolean) => void;
  toggleSoundTrack: (trackId: SoundscapeTrackId) => void;
  setTrackVolume: (trackId: SoundscapeTrackId, vol: number) => void;
  setMasterSoundVol: (vol: number) => void;
  muteAllTracks: () => void;
  applySoundMix: (mixId: string) => void;
  clearTodayHistory: () => void;
  formatTime: (seconds: number) => string;
}

const FocusContext = createContext<FocusContextType | null>(null);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [customMinutes, setCustomMinutes] = useState<number>(() => {
    if (typeof window === "undefined") return 45;
    const saved = localStorage.getItem("laya-focus-custom-minutes");
    return saved ? Math.max(1, Math.min(180, parseInt(saved, 10))) : 45;
  });

  const [totalDurationSeconds, setTotalDurationSeconds] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isAlwaysOnTopState, setIsAlwaysOnTopState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("laya-focus-always-on-top") === "true";
  });
  const [isFullscreenState, setIsFullscreenState] = useState<boolean>(false);

  // Settings: Preferences
  const [autoFullscreenZen, setAutoFullscreenZenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const val = localStorage.getItem("laya-focus-auto-fullscreen-zen");
    return val !== null ? val === "true" : true;
  });

  const [autoAlwaysOnTopFocus, setAutoAlwaysOnTopFocusState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("laya-focus-auto-aot") === "true";
  });

  const [autoPopoutMiniTimer, setAutoPopoutMiniTimerState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const val = localStorage.getItem("laya-focus-auto-popout-mini");
    return val !== null ? val === "true" : true;
  });
  const [isMiniTimerOpen, setIsMiniTimerOpen] = useState<boolean>(false);
  const isMiniTimerOpenRef = useRef<boolean>(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Selected Task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | null>(null);

  // Daily reset & session tracking
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(0);
  const [totalFocusMinutesToday, setTotalFocusMinutesToday] = useState(0);
  const [sessionLogs, setSessionLogs] = useState<FocusSessionLog[]>([]);

  // Alarm Sound
  const [alarmSoundId, setAlarmSoundId] = useState<string>(() => {
    if (typeof window === "undefined") return "temple-gong";
    return localStorage.getItem("laya-focus-alarm-sound") || "temple-gong";
  });

  // Ambient sound
  const [ambientType, setAmbientType] = useState<AmbientSoundType>("none");
  const [ambientVol, setAmbientVol] = useState<number>(() => {
    if (typeof window === "undefined") return 0.35;
    const saved = localStorage.getItem("laya-focus-ambient-vol");
    return saved ? parseFloat(saved) : 0.35;
  });

  // Multi-track mixer studio
  const [showMixerStudio, setShowMixerStudio] = useState(false);
  const [activeSoundTracks, setActiveSoundTracks] = useState<SoundscapeTrackId[]>(() =>
    soundscapeStudio.getActiveTracks()
  );
  const [masterSoundVol, setMasterSoundVolState] = useState<number>(() =>
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

  // Synchronize initial always-on-top state
  useEffect(() => {
    if (isAlwaysOnTopState) {
      void setAlwaysOnTop(true);
    }
  }, [isAlwaysOnTopState]);

  // Handle auto always-on-top when timer runs
  useEffect(() => {
    if (autoAlwaysOnTopFocus) {
      if (isRunning) {
        void setAlwaysOnTop(true);
      } else if (!isAlwaysOnTopState) {
        void setAlwaysOnTop(false);
      }
    }
  }, [isRunning, autoAlwaysOnTopFocus, isAlwaysOnTopState]);

  // Initialize and verify today's date
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = getTodayDateKey();
    const storedDate = localStorage.getItem("laya-focus-date");

    if (storedDate !== today) {
      localStorage.setItem("laya-focus-date", today);
      localStorage.setItem("laya-focus-sessions-today", "0");
      localStorage.setItem("laya-focus-minutes-today", "0");
      localStorage.setItem(`laya-focus-logs-${today}`, "[]");
      setSessionsCompletedToday(0);
      setTotalFocusMinutesToday(0);
      setSessionLogs([]);
    } else {
      const savedSessions = localStorage.getItem("laya-focus-sessions-today");
      const savedMinutes = localStorage.getItem("laya-focus-minutes-today");
      const savedLogs = localStorage.getItem(`laya-focus-logs-${today}`);
      setSessionsCompletedToday(savedSessions ? parseInt(savedSessions, 10) : 0);
      setTotalFocusMinutesToday(savedMinutes ? parseInt(savedMinutes, 10) : 0);
      if (savedLogs) {
        try {
          setSessionLogs(JSON.parse(savedLogs));
        } catch {
          setSessionLogs([]);
        }
      }
    }
  }, []);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    playFocusAlarmSound(alarmSoundId);

    const isFocusSession = mode === "pomodoro" || mode === "deepFocus" || mode === "custom";

    if (isFocusSession) {
      const sessionMins = Math.round(totalDurationSeconds / 60);
      const nextCompleted = sessionsCompletedToday + 1;
      const nextMins = totalFocusMinutesToday + sessionMins;
      const today = getTodayDateKey();

      const newLog: FocusSessionLog = {
        id: `flog-${Date.now()}`,
        completedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes: sessionMins,
        mode,
        taskId: selectedTaskId,
        taskTitle: selectedTaskTitle,
      };

      const updatedLogs = [newLog, ...sessionLogs];
      setSessionsCompletedToday(nextCompleted);
      setTotalFocusMinutesToday(nextMins);
      setSessionLogs(updatedLogs);

      localStorage.setItem("laya-focus-sessions-today", String(nextCompleted));
      localStorage.setItem("laya-focus-minutes-today", String(nextMins));
      localStorage.setItem(`laya-focus-logs-${today}`, JSON.stringify(updatedLogs));

      sendFocusNotification(
        "Focus Session Complete!",
        `Great job! ${sessionMins}m session recorded. Take a quick break to recharge.`
      );

      // Auto-suggest next break mode
      const nextMode = nextCompleted % 4 === 0 ? "longBreak" : "shortBreak";
      setMode(nextMode);
      const nextSecs = TIMER_PRESETS[nextMode].minutes * 60;
      setTotalDurationSeconds(nextSecs);
      setTimeLeft(nextSecs);
    } else {
      sendFocusNotification("Break Finished!", "Ready to lock in for your next focus sprint?");
      setMode("pomodoro");
      const nextSecs = TIMER_PRESETS.pomodoro.minutes * 60;
      setTotalDurationSeconds(nextSecs);
      setTimeLeft(nextSecs);
    }
  }, [
    alarmSoundId,
    mode,
    selectedTaskId,
    selectedTaskTitle,
    sessionLogs,
    sessionsCompletedToday,
    totalDurationSeconds,
    totalFocusMinutesToday,
  ]);

  // Timer interval countdown
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
  }, [isRunning, handleTimerComplete]);

  const toggleRunning = useCallback(() => {
    playTaskPopSound();
    if (!isRunning && ambientType !== "none") {
      ambientSound.start(ambientType, ambientVol);
    }
    setIsRunning((prev) => !prev);
  }, [ambientType, ambientVol, isRunning]);

  // Global shortcut handler for laya:toggle-timer
  useEffect(() => {
    const handleToggleEvent = () => {
      toggleRunning();
    };
    window.addEventListener("laya:toggle-timer", handleToggleEvent);
    return () => window.removeEventListener("laya:toggle-timer", handleToggleEvent);
  }, [toggleRunning]);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      playTaskPopSound();
      if (ambientType !== "none") ambientSound.start(ambientType, ambientVol);
      setIsRunning(true);
    }
  }, [ambientType, ambientVol, isRunning]);

  const pauseTimer = useCallback(() => {
    if (isRunning) {
      playTaskPopSound();
      setIsRunning(false);
    }
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    playTaskPopSound();
    setIsRunning(false);
    setTimeLeft(totalDurationSeconds);
  }, [totalDurationSeconds]);

  const skipTimer = useCallback(() => {
    handleTimerComplete();
  }, [handleTimerComplete]);

  const switchMode = useCallback(
    (newMode: TimerMode) => {
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
    },
    [customMinutes]
  );

  const handleCustomMinutesChange = useCallback(
    (newMins: number) => {
      const clamped = Math.max(1, Math.min(180, newMins));
      setCustomMinutes(clamped);
      localStorage.setItem("laya-focus-custom-minutes", String(clamped));
      if (mode === "custom") {
        setIsRunning(false);
        setTotalDurationSeconds(clamped * 60);
        setTimeLeft(clamped * 60);
      }
    },
    [mode]
  );

  const adjustTimeByMinutes = useCallback(
    (delta: number) => {
      if (mode === "custom") {
        handleCustomMinutesChange(customMinutes + delta);
      } else {
        setTimeLeft((prev) => Math.max(60, prev + delta * 60));
        setTotalDurationSeconds((prev) => Math.max(60, prev + delta * 60));
      }
    },
    [customMinutes, handleCustomMinutesChange, mode]
  );

  const setSelectedTask = useCallback((taskId: string | null, title?: string | null) => {
    setSelectedTaskId(taskId);
    setSelectedTaskTitle(title ?? null);
  }, []);

  const handleAlarmChange = useCallback((soundId: string) => {
    setAlarmSoundId(soundId);
    localStorage.setItem("laya-focus-alarm-sound", soundId);
    playFocusAlarmSound(soundId);
  }, []);

  const handleAmbientChange = useCallback(
    (type: AmbientSoundType) => {
      setAmbientType(type);
      if (type === "none") {
        ambientSound.stop();
      } else {
        ambientSound.start(type, ambientVol);
      }
    },
    [ambientVol]
  );

  const handleAmbientVolChange = useCallback((vol: number) => {
    setAmbientVol(vol);
    localStorage.setItem("laya-focus-ambient-vol", String(vol));
    ambientSound.setVolume(vol);
  }, []);

  const toggleSoundTrack = useCallback((trackId: SoundscapeTrackId) => {
    playTaskPopSound();
    soundscapeStudio.toggleTrack(trackId);
    setActiveSoundTracks(soundscapeStudio.getActiveTracks());
  }, []);

  const setTrackVolume = useCallback((trackId: SoundscapeTrackId, vol: number) => {
    soundscapeStudio.setTrackVolume(trackId, vol);
    setTrackVols((prev) => ({ ...prev, [trackId]: vol }));
  }, []);

  const setMasterSoundVol = useCallback((vol: number) => {
    soundscapeStudio.setMasterVolume(vol);
    setMasterSoundVolState(vol);
  }, []);

  const muteAllTracks = useCallback(() => {
    playTaskPopSound();
    soundscapeStudio.stopAll();
    ambientSound.stop();
    setAmbientType("none");
    setActiveSoundTracks([]);
  }, []);

  const applySoundMix = useCallback((mixId: string) => {
    playTaskPopSound();
    soundscapeStudio.applyMix(mixId);
    setActiveSoundTracks(soundscapeStudio.getActiveTracks());
    setShowMixerStudio(true);
  }, []);

  const clearTodayHistory = useCallback(() => {
    const today = getTodayDateKey();
    localStorage.setItem("laya-focus-sessions-today", "0");
    localStorage.setItem("laya-focus-minutes-today", "0");
    localStorage.setItem(`laya-focus-logs-${today}`, "[]");
    setSessionsCompletedToday(0);
    setTotalFocusMinutesToday(0);
    setSessionLogs([]);
  }, []);

  // Zen Mode with optional Native OS Fullscreen
  const toggleZenMode = useCallback(() => {
    playTaskPopSound();
    setIsZenMode((prev) => {
      const next = !prev;
      if (next && autoFullscreenZen) {
        void setNativeFullscreen(true);
        setIsFullscreenState(true);
      } else if (!next) {
        void setNativeFullscreen(false);
        setIsFullscreenState(false);
      }
      return next;
    });
  }, [autoFullscreenZen]);

  const handleSetIsZenMode = useCallback(
    (zen: boolean) => {
      setIsZenMode(zen);
      if (zen && autoFullscreenZen) {
        void setNativeFullscreen(true);
        setIsFullscreenState(true);
      } else if (!zen) {
        void setNativeFullscreen(false);
        setIsFullscreenState(false);
      }
    },
    [autoFullscreenZen]
  );

  // Always on top toggle
  const toggleAlwaysOnTop = useCallback(() => {
    playTaskPopSound();
    setIsAlwaysOnTopState((prev) => {
      const next = !prev;
      localStorage.setItem("laya-focus-always-on-top", String(next));
      void setAlwaysOnTop(next);
      return next;
    });
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    playTaskPopSound();
    setIsFullscreenState((prev) => {
      const next = !prev;
      void setNativeFullscreen(next);
      return next;
    });
  }, []);

  const setAutoFullscreenZen = useCallback((val: boolean) => {
    setAutoFullscreenZenState(val);
    localStorage.setItem("laya-focus-auto-fullscreen-zen", String(val));
  }, []);

  const setAutoAlwaysOnTopFocus = useCallback((val: boolean) => {
    setAutoAlwaysOnTopFocusState(val);
    localStorage.setItem("laya-focus-auto-aot", String(val));
  }, []);

  const openMiniTimer = useCallback(() => {
    playTaskPopSound();
    void showMiniTimer();
    setIsMiniTimerOpen(true);
    isMiniTimerOpenRef.current = true;
  }, []);

  const closeMiniTimer = useCallback(() => {
    playTaskPopSound();
    void hideMiniTimer();
    setIsMiniTimerOpen(false);
    isMiniTimerOpenRef.current = false;
  }, []);

  const setAutoPopoutMiniTimer = useCallback((val: boolean) => {
    setAutoPopoutMiniTimerState(val);
    localStorage.setItem("laya-focus-auto-popout-mini", String(val));
  }, []);

  // Track latest state in ref to avoid re-binding BroadcastChannel listener on every second
  const latestStateRef = useRef({
    isRunning,
    timeLeft,
    totalDurationSeconds,
    mode,
    selectedTaskTitle,
    sessionsCompletedToday,
    toggleRunning,
    skipTimer,
  });

  useEffect(() => {
    latestStateRef.current = {
      isRunning,
      timeLeft,
      totalDurationSeconds,
      mode,
      selectedTaskTitle,
      sessionsCompletedToday,
      toggleRunning,
      skipTimer,
    };
  });

  // Sync state snapshot to localStorage and BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot = {
      isRunning,
      timeLeft,
      totalDuration: totalDurationSeconds,
      currentMode: mode,
      activeTaskTitle: selectedTaskTitle,
      sessionsCompletedToday,
    };
    try {
      localStorage.setItem("laya_focus_state_snapshot", JSON.stringify(snapshot));
    } catch {
      // Ignore storage errors
    }

    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "STATE_UPDATE",
          payload: snapshot,
        });
      }
    } catch {
      // Guard against channel closed errors
    }
  }, [isRunning, timeLeft, totalDurationSeconds, mode, selectedTaskTitle, sessionsCompletedToday]);

  // Setup broadcast channel receiver once on mount
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("laya_focus_sync_channel");
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        try {
          const { type } = event.data || {};
          if (type === "TOGGLE_PLAY") {
            latestStateRef.current.toggleRunning();
          } else if (type === "SKIP") {
            latestStateRef.current.skipTimer();
          } else if (type === "REQUEST_STATE") {
            const s = latestStateRef.current;
            channel?.postMessage({
              type: "STATE_UPDATE",
              payload: {
                isRunning: s.isRunning,
                timeLeft: s.timeLeft,
                totalDuration: s.totalDurationSeconds,
                currentMode: s.mode,
                activeTaskTitle: s.selectedTaskTitle,
                sessionsCompletedToday: s.sessionsCompletedToday,
              },
            });
          }
        } catch {
          // Guard against message handler errors
        }
      };
    } catch {
      // BroadcastChannel unavailable
    }

    return () => {
      broadcastChannelRef.current = null;
      if (channel) {
        try {
          channel.close();
        } catch {
          // Ignore close errors
        }
      }
    };
  }, []);

  // Auto pop-out mini timer on leaving Laya (window blur) when timer is actively running
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBlur = () => {
      if (isRunning && autoPopoutMiniTimer && !isMiniTimerOpenRef.current) {
        void showMiniTimer();
        setIsMiniTimerOpen(true);
        isMiniTimerOpenRef.current = true;
      }
    };

    const handleFocus = () => {
      if (isMiniTimerOpenRef.current) {
        void hideMiniTimer();
        setIsMiniTimerOpen(false);
        isMiniTimerOpenRef.current = false;
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isRunning, autoPopoutMiniTimer]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  const progressPercent =
    totalDurationSeconds > 0
      ? ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100
      : 0;

  return (
    <FocusContext.Provider
      value={{
        mode,
        customMinutes,
        totalDurationSeconds,
        timeLeft,
        isRunning,
        progressPercent,
        sessionsCompletedToday,
        totalFocusMinutesToday,
        selectedTaskId,
        selectedTaskTitle,
        alarmSoundId,
        isZenMode,
        setIsZenMode: handleSetIsZenMode,
        toggleZenMode,
        isAlwaysOnTop: isAlwaysOnTopState,
        toggleAlwaysOnTop,
        isFullscreen: isFullscreenState,
        toggleFullscreen,
        autoFullscreenZen,
        setAutoFullscreenZen,
        autoAlwaysOnTopFocus,
        setAutoAlwaysOnTopFocus,
        autoPopoutMiniTimer,
        setAutoPopoutMiniTimer,
        isMiniTimerOpen,
        openMiniTimer,
        closeMiniTimer,
        ambientType,
        ambientVol,
        showMixerStudio,
        activeSoundTracks,
        masterSoundVol,
        trackVols,
        sessionLogs,
        toggleRunning,
        startTimer,
        pauseTimer,
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
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export function useFocusTimer(): FocusContextType {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    throw new Error("useFocusTimer must be used within a FocusProvider");
  }
  return ctx;
}
