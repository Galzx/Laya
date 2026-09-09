import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Zap, CheckSquare, FileText, Plus, Check } from "lucide-react";
import { cn } from "../../../lib/utils";
import { playTaskPopSound } from "../../../lib/sound";
import type { WidgetProps } from "../types";

export const QuickCaptureWidget: React.FC<WidgetProps> = ({
  workspaceId,
  onRefreshData,
}) => {
  const [captureMode, setCaptureMode] = useState<"task" | "note">("task");
  const [title, setTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBadge, setSuccessBadge] = useState(false);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (captureMode === "task") {
        await invoke("create_task", {
          workspaceId,
          title: title.trim(),
          description: null,
          priority,
          startDate: null,
          dueDate: null,
          nextAction: null,
          projectId: null,
        });
        window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      } else {
        await invoke("create_note", {
          workspaceId,
          title: title.trim(),
          content: noteContent.trim(),
          projectId: null,
          color: "amber",
        });
        window.dispatchEvent(new CustomEvent("laya:notes-changed"));
      }

      setTitle("");
      setNoteContent("");
      playTaskPopSound();
      setSuccessBadge(true);
      setTimeout(() => setSuccessBadge(false), 2000);
      await onRefreshData();
    } catch (err) {
      console.error("Failed quick capture:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between hover:border-border/80 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Universal Quick Capture
            </h3>
          </div>
          {successBadge && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Check className="h-3 w-3" /> Captured!
            </span>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-muted/50 p-1 border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => setCaptureMode("task")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
              captureMode === "task"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
            <span>Task Capture</span>
          </button>
          <button
            type="button"
            onClick={() => setCaptureMode("note")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
              captureMode === "note"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5 text-emerald-500" />
            <span>Note Capture</span>
          </button>
        </div>

        <form onSubmit={handleCapture} className="space-y-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={captureMode === "task" ? "What needs to be done?" : "Note title or quick thought..."}
            className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {captureMode === "note" ? (
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Jot down notes, markdown snippets, or ideas..."
              rows={2}
              className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          ) : (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-muted-foreground font-medium mr-1">Priority:</span>
              {(["low", "medium", "high", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase border transition-all cursor-pointer",
                    priority === p
                      ? p === "urgent"
                        ? "bg-rose-500/15 text-rose-600 border-rose-500/40"
                        : p === "high"
                        ? "bg-amber-500/15 text-amber-600 border-amber-500/40"
                        : "bg-primary/15 text-primary border-primary/40"
                      : "bg-transparent text-muted-foreground border-transparent hover:border-border"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Capture to {captureMode === "task" ? "Tasks" : "Notes"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

