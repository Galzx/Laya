import React, { useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Minimize2,
  Volume2,
  Target,
  Flame,
  Pin,
} from "lucide-react";
import { useFocusTimer } from "../../lib/focusContext";
import { cn } from "../../lib/utils";

export const ZenModeOverlay: React.FC = () => {
  const {
    isZenMode,
    setIsZenMode,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    mode,
    timeLeft,
    isRunning,
    progressPercent,
    formatTime,
    toggleRunning,
    resetTimer,
    skipTimer,
    adjustTimeByMinutes,
    selectedTaskTitle,
    sessionsCompletedToday,
    totalFocusMinutesToday,
    ambientType,
    handleAmbientChange,
    ambientVol,
    handleAmbientVolChange,
  } = useFocusTimer();

  // Escape key closes Zen Mode
  useEffect(() => {
    if (!isZenMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsZenMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode, setIsZenMode]);

  if (!isZenMode) return null;

  const isBreak = mode.includes("Break");

  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 select-none animate-fade-in text-foreground">
      {/* ─── Top Status Bar ─── */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-muted-foreground">
            Zen Focus Immersion
          </span>
          {selectedTaskTitle && (
            <span className="hidden sm:inline text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-card border border-border text-foreground truncate max-w-xs">
              {selectedTaskTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAlwaysOnTop}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs",
              isAlwaysOnTop
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/80 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
            )}
            title={isAlwaysOnTop ? "Float on Top active: Window stays above other applications" : "Pin window always on top"}
          >
            <Pin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isAlwaysOnTop ? "Pinned on Top" : "Float on Top"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card/80 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            title="Exit Zen Mode (Esc)"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span>Exit Zen (Esc)</span>
          </button>
        </div>
      </div>

      {/* ─── Center Hero Circular Countdown ─── */}
      <div className="flex flex-col items-center justify-center space-y-8 relative">
        {/* Subtle Breathing Ambient Aura Ring */}
        {isRunning && (
          <div
            className={cn(
              "absolute w-96 h-96 rounded-full blur-3xl animate-pulse pointer-events-none transition-all duration-1000",
              isBreak ? "bg-emerald-500/10" : "bg-primary/10"
            )}
          />
        )}

        {/* Big SVG Circular Indicator */}
        <div className="relative flex items-center justify-center w-72 h-72 sm:w-88 sm:h-88">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-muted/30 stroke-current"
              strokeWidth="2.5"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className={cn(
                "stroke-current transition-all duration-700 ease-linear",
                isBreak ? "text-emerald-500" : "text-primary"
              )}
              strokeWidth="3.2"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Central Digits */}
          <div className="absolute flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-6xl sm:text-7xl font-bold font-mono tracking-tighter text-foreground">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs uppercase font-semibold text-muted-foreground tracking-widest mt-1">
              {isRunning
                ? isBreak ? "Resting & Recharging" : "Deep Immersion Active"
                : "Paused"}
            </span>
          </div>
        </div>

        {/* Quick ±5m Steppers */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => adjustTimeByMinutes(-5)}
            className="px-3 py-1 rounded-xl border border-border bg-card hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
          >
            -5 min
          </button>
          <span className="text-muted-foreground/40">•</span>
          <button
            type="button"
            onClick={() => adjustTimeByMinutes(5)}
            className="px-3 py-1 rounded-xl border border-border bg-card hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
          >
            +5 min
          </button>
        </div>

        {/* Big Action Controls */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={resetTimer}
            className="p-4 rounded-2xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:scale-105"
            title="Reset timer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={toggleRunning}
            className={cn(
              "px-10 py-4 rounded-2xl font-bold text-base shadow-lg transition-all cursor-pointer flex items-center gap-3 hover:scale-105",
              isRunning
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-primary text-primary-foreground hover:opacity-90"
            )}
          >
            {isRunning ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
            <span>{isRunning ? "Pause" : "Resume"}</span>
          </button>

          <button
            type="button"
            onClick={skipTimer}
            className="p-4 rounded-2xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:scale-105"
            title="Skip session"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ─── Bottom Ambient & Stats Dock ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-4xl mx-auto border-t border-border/60 pt-4">
        {/* Ambient Soundscape Quick Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl">
            {(["none", "rain", "fire", "forest", "brown-noise"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAmbientChange(type)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer",
                  ambientType === type
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type === "none" ? "Mute" : type}
              </button>
            ))}
          </div>

          {ambientType !== "none" && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-card border border-border rounded-xl">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={ambientVol}
                onChange={(e) => handleAmbientVolChange(parseFloat(e.target.value))}
                className="w-20 h-1 accent-primary cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Daily Stats Summary */}
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span>Today: <strong className="text-foreground">{sessionsCompletedToday}</strong> sessions</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>Focus Logged: <strong className="text-foreground">{totalFocusMinutesToday}m</strong></span>
          </span>
        </div>
      </div>
    </div>
  );
};
