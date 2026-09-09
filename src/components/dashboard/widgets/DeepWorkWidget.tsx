import React from "react";
import { Flame, Headphones, Play } from "lucide-react";
import type { WidgetProps } from "../types";

export const DeepWorkWidget: React.FC<WidgetProps> = ({
  onNavigateTab,
}) => {
  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between hover:border-border/80 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Deep Work Launchpad
            </h3>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            25m Pomodoro
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Lock in with ambient background soundscapes (Rain, 40Hz Gamma, Brown Noise) and procedural alarms.
        </p>

        {/* Quick Duration Presets */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onNavigateTab("focus")}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted text-[11px] font-medium text-foreground transition-all cursor-pointer text-center group"
          >
            <span className="block font-bold group-hover:text-primary transition-colors">15m</span>
            <span className="text-[9px] text-muted-foreground">Sprint</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("focus")}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted text-[11px] font-medium text-foreground transition-all cursor-pointer text-center group"
          >
            <span className="block font-bold group-hover:text-primary transition-colors">25m</span>
            <span className="text-[9px] text-muted-foreground">Standard</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("focus")}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted text-[11px] font-medium text-foreground transition-all cursor-pointer text-center group"
          >
            <span className="block font-bold group-hover:text-primary transition-colors">50m</span>
            <span className="text-[9px] text-muted-foreground">Deep Work</span>
          </button>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
          <Headphones className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px] truncate">Multi-Track Sound Studio ready</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigateTab("focus")}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs mt-1"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>Launch Focus Timer</span>
      </button>
    </div>
  );
};
