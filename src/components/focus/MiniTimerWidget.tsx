import React, { useEffect, useState, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  ExternalLink,
  X,
  Target,
  Sparkles,
} from "lucide-react";
import { restoreMainWindow, hideMiniTimer } from "../../lib/desktopWindow";

interface FocusSyncState {
  isRunning: boolean;
  timeLeft: number;
  totalDuration: number;
  currentMode: "focus" | "shortBreak" | "longBreak";
  activeTaskTitle?: string;
  sessionsCompletedToday: number;
}

const DEFAULT_STATE: FocusSyncState = {
  isRunning: false,
  timeLeft: 25 * 60,
  totalDuration: 25 * 60,
  currentMode: "focus",
  activeTaskTitle: undefined,
  sessionsCompletedToday: 0,
};

export const MiniTimerWidget: React.FC = () => {
  const [state, setState] = useState<FocusSyncState>(() => {
    try {
      const saved = localStorage.getItem("laya_focus_state_snapshot");
      if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) };
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_STATE;
  });

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Style root and body for transparent frameless window
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.userSelect = "none";

    // Setup broadcast channel for live 0ms communication with main Laya window
    const channel = new BroadcastChannel("laya_focus_sync_channel");
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === "STATE_UPDATE" && payload) {
        setState((prev) => ({ ...prev, ...payload }));
      }
    };

    // Request immediate sync from main window
    try {
      channel.postMessage({ type: "REQUEST_STATE" });
    } catch {
      // Ignore initial message error
    }

    // Also listen for storage event as backup
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "laya_focus_state_snapshot" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState((prev) => ({ ...prev, ...parsed }));
        } catch {
          // Ignore invalid parse
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      channelRef.current = null;
      try {
        channel.close();
      } catch {
        // Ignore close error
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const sendCommand = (cmd: string) => {
    try {
      if (channelRef.current) {
        channelRef.current.postMessage({ type: cmd });
      }
    } catch {
      // Ignore channel closed error
    }
  };

  const handleTogglePlay = () => {
    sendCommand("TOGGLE_PLAY");
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleSkip = () => {
    sendCommand("SKIP");
  };

  const handleExpand = async () => {
    await restoreMainWindow();
  };

  const handleClose = async () => {
    await hideMiniTimer();
  };

  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = state.timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress = state.totalDuration > 0
    ? Math.max(0, Math.min(100, ((state.totalDuration - state.timeLeft) / state.totalDuration) * 100))
    : 0;

  // Circumference for small circular arc
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const isBreak = state.currentMode !== "focus";

  return (
    <div
      data-tauri-drag-region
      className="w-full h-full p-1.5 select-none flex items-center justify-center font-sans"
    >
      <div
        data-tauri-drag-region
        className="w-full h-[80px] rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl px-3 py-2 flex items-center justify-between gap-2.5 transition-all text-card-foreground group cursor-grab active:cursor-grabbing"
      >
        {/* Progress Arc & Mode Icon */}
        <div data-tauri-drag-region className="relative flex items-center justify-center shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r={radius}
              className="text-muted/40"
              strokeWidth="3"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="18"
              cy="18"
              r={radius}
              className={isBreak ? "text-emerald-500 transition-all duration-300" : "text-primary transition-all duration-300"}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {isBreak ? (
              <Sparkles className="w-4 h-4 text-emerald-500" />
            ) : (
              <Target className="w-4 h-4 text-primary" />
            )}
          </div>
        </div>

        {/* Center: Countdown & Task title */}
        <div data-tauri-drag-region className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-mono text-lg font-bold tracking-tight text-foreground">
              {formattedTime}
            </span>
            {state.isRunning && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[125px] mt-0.5 font-medium">
            {state.activeTaskTitle || (isBreak ? "Break Time" : "Focus Session")}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer shadow-2xs"
            title={state.isRunning ? "Pause" : "Start"}
          >
            {state.isRunning ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip */}
          <button
            type="button"
            onClick={handleSkip}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Skip to next"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Expand to main Laya */}
          <button
            type="button"
            onClick={handleExpand}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors cursor-pointer"
            title="Return to Laya"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Close mini window */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Hide mini timer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default MiniTimerWidget;
