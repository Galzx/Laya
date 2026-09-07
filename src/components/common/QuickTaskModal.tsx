import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Sparkles,
  X,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { playTaskPopSound } from "../../lib/sound";
import { DatePicker } from "../ui/DatePicker";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projects: Project[];
  onTaskCreated: () => void;
}

export const QuickTaskModal: React.FC<QuickTaskModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  projects,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDateStr, setDueDateStr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setProjectId("");
      // Default to today
      const today = new Date();
      const yr = today.getFullYear();
      const mo = String(today.getMonth() + 1).padStart(2, "0");
      const da = String(today.getDate()).padStart(2, "0");
      setDueDateStr(`${yr}-${mo}-${da}`);

      const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    playTaskPopSound();

    let dueEpoch: number | null = null;
    if (dueDateStr) {
      const [y, m, d] = dueDateStr.split("-").map(Number);
      if (y && m && d) {
        dueEpoch = Math.floor(new Date(y, m - 1, d, 12, 0, 0).getTime() / 1000);
      }
    }

    try {
      await invoke("create_task", {
        workspaceId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueEpoch,
        projectId: projectId || null,
      });

      onTaskCreated();
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      onClose();
    } catch (err) {
      console.error("Failed to create task via quick capture:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityColors = {
    low: "text-muted-foreground hover:bg-muted/80",
    medium: "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10",
    high: "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
    urgent: "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-dialog overflow-hidden animate-dialog-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-foreground tracking-wide">
              Quick Task Capture
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-md bg-muted border border-border/50">
              Esc to cancel
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you like to achieve?…"
              className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 border-none outline-none focus:ring-0 px-0"
            />

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add optional notes or context…"
              className="w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/40 border-none outline-none focus:ring-0 px-0"
            />
          </div>

          {/* Quick Property Selectors */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            {/* Due Date Picker */}
            <div className="flex items-center gap-1.5">
              <DatePicker
                value={dueDateStr}
                onChange={setDueDateStr}
                placeholder="Set schedule"
                align="left"
              />
            </div>

            {/* Priority Selector */}
            <div className="flex items-center bg-muted/60 rounded-xl p-0.5 border border-border/50">
              {(["low", "medium", "high", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-all cursor-pointer",
                    priority === p
                      ? "bg-background text-foreground shadow-2xs"
                      : priorityColors[p]
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Project Selector */}
            {projects.length > 0 && (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-muted/60 text-muted-foreground hover:text-foreground text-[11px] font-medium border border-border/50 rounded-xl px-2.5 py-1 outline-none cursor-pointer"
              >
                <option value="">No Project</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Footer Submit Button */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
            >
              <span>Capture Task</span>
              <CornerDownLeft className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
