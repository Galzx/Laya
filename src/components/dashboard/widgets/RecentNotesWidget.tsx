import React from "react";
import { FileText, Pin, Plus, ArrowRight } from "lucide-react";
import type { WidgetProps } from "../types";

export const RecentNotesWidget: React.FC<WidgetProps> = ({
  notes,
  onNavigateTab,
}) => {
  const activeNotes = notes.filter((n) => !n.is_archived);
  const sortedNotes = [...activeNotes].sort((a, b) => {
    if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
    return b.updated_at - a.updated_at;
  });

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between hover:border-border/80 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Recent Notes & Scratchpad
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("notes")}
            className="text-[10px] text-primary hover:underline cursor-pointer font-medium"
          >
            View all ({activeNotes.length})
          </button>
        </div>

        {activeNotes.length === 0 ? (
          <div className="py-6 text-center space-y-2 text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl p-4">
            <FileText className="h-6 w-6 text-muted-foreground/60 mx-auto" />
            <p className="font-semibold text-foreground">No notes written yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Draft engineering specs, sprint meeting notes, or quick ideas.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab("notes")}
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold cursor-pointer pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create first note</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {sortedNotes.slice(0, 4).map((n) => {
              const updatedDate = new Date(n.updated_at * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={n.id}
                  onClick={() => onNavigateTab("notes")}
                  className="p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 text-xs text-foreground cursor-pointer transition-all space-y-1 min-w-0 border border-border/50 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {n.is_pinned === 1 && (
                        <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <span className="font-medium truncate group-hover:text-primary transition-colors">
                        {n.title || "Untitled Note"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {updatedDate}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate line-clamp-1">
                    {n.content?.slice(0, 100) || "No content"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onNavigateTab("notes")}
        className="inline-flex items-center justify-between text-xs font-semibold text-primary hover:underline cursor-pointer pt-2 border-t border-border/40 w-full"
      >
        <span>Open Notes Editor & Publishing Suite</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
};
