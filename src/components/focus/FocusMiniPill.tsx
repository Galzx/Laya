import React, { useState } from "react";
import { Play, Pause, Target, Sparkles, Maximize2, X } from "lucide-react";
import { useFocusTimer } from "../../lib/focusContext";
import { cn } from "../../lib/utils";

interface FocusMiniPillProps {
  currentTab: string;
  onNavigateFocus: () => void;
}

export const FocusMiniPill: React.FC<FocusMiniPillProps> = ({ currentTab, onNavigateFocus }) => {
  const {
    mode,
    timeLeft,
    isRunning,
    progressPercent,
    formatTime,
    toggleRunning,
    selectedTaskTitle,
    isZenMode,
  } = useFocusTimer();

  const [isDismissed, setIsDismissed] = useState(false);

  // Hide if already in focus tab, or in Zen mode, or dismissed, or timer is fresh/idle
  if (currentTab === "focus" || isZenMode || isDismissed) {
    return null;
  }

  // Only display if timer is actively running or paused mid-countdown
  const isMidSession = timeLeft > 0 && progressPercent > 0;
  if (!isRunning && !isMidSession) {
    return null;
  }

  const isBreak = mode.includes("Break");

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-40 flex items-center gap-2.5 p-2 pr-3 rounded-2xl border shadow-dialog backdrop-blur-md transition-all animate-dialog-in",
        isBreak
          ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-100"
          : "bg-card/95 border-border text-foreground"
      )}
    >
      {/* Clickable Timer Core (Jumps to Focus view) */}
      <button
        type="button"
        onClick={onNavigateFocus}
        className="flex items-center gap-2 cursor-pointer group"
        title="Open full Focus view"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
            isBreak
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-primary/10 text-primary"
          )}
        >
          {isBreak ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <Target className="h-4 w-4" />
          )}
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-xs tracking-tight">
              {formatTime(timeLeft)}
            </span>
            {isRunning && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {selectedTaskTitle || (isBreak ? "Break" : "Focus Sprint")}
          </span>
        </div>
      </button>

      {/* Mini Progress Arc / Bar */}
      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
        <div
          className={cn(
            "h-full transition-all duration-500",
            isBreak ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Quick Play/Pause Action */}
      <button
        type="button"
        onClick={toggleRunning}
        className={cn(
          "p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:scale-105",
          isRunning
            ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
            : "bg-primary text-primary-foreground border-primary hover:opacity-90"
        )}
        title={isRunning ? "Pause session" : "Resume session"}
      >
        {isRunning ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
      </button>

      {/* Navigate Arrow */}
      <button
        type="button"
        onClick={onNavigateFocus}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Maximize Focus mode"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Dismiss / Minimize button */}
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
        title="Dismiss mini pill"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
