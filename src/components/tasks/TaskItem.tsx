import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  RotateCcw,
  Archive,
  Trash2,
  Save,
  CheckSquare,
  Square,
  FolderKanban,
  Sparkles,
  Loader2,
  KeyRound,
  X,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { DatePicker } from "../ui/DatePicker";
import type { Task, Subtask } from "./TasksView";
import { getProjectColorDef } from "../projects/ProjectsView";
import { deconstructWithSammi } from "../../lib/ai/engine";
import { getAiConfig, saveAiConfig } from "../../lib/ai/storage";
import { playTaskPopSound } from "../../lib/sound";

async function openExternalUrl(url: string) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export interface TaskItemProps {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  isCompleting: boolean;
  isDeparting: boolean;
  subtasks: Subtask[];
  onLoadSubtasks: () => void;
  onCreateSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (subtaskId: string) => Promise<void>;
  onDeleteSubtask: (subtaskId: string) => Promise<void>;
  onSaveEdits: (edits: {
    title: string;
    description: string | null;
    priority: Task["priority"];
    dueDate: number | null;
    nextAction: string | null;
  }) => Promise<void>;
  onUpdatePriority: (priority: Task["priority"]) => Promise<void>;
  onUpdateDueDate: (dueDateStr: string) => Promise<void>;
  onSetForToday?: () => void;
  onReturnToInbox?: () => void;
  onArchiveTask?: () => void;
  onRestoreTask?: () => void;
  onDeleteTask?: () => void;
  projectName?: string;
  projectColor?: string;
  isArchiveView?: boolean;
}

function dateInputToEpoch(value: string): number | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(new Date(year, month - 1, day, 12).getTime() / 1000);
}

function toLocalDateInput(epochSeconds: number | null): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const priorityColor = (priority: Task["priority"]) =>
  ({
    urgent: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
    high: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
    medium: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    low: "text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/30",
  }[priority]);

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  isCompleting,
  isDeparting,
  subtasks,
  onLoadSubtasks,
  onCreateSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onSaveEdits,
  onUpdatePriority,
  onUpdateDueDate,
  onSetForToday,
  onReturnToInbox,
  onArchiveTask,
  onRestoreTask,
  onDeleteTask,
  projectName,
  projectColor,
  isArchiveView,
}) => {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? "");
  const [editPriority, setEditPriority] = useState<Task["priority"]>(task.priority);
  const [editDueDate, setEditDueDate] = useState(toLocalDateInput(task.due_date));
  const [editNextAction, setEditNextAction] = useState(task.next_action ?? "");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [deconstructFeedback, setDeconstructFeedback] = useState<string | null>(null);

  const executeDeconstruct = async (cfgToUse?: ReturnType<typeof getAiConfig>) => {
    setIsDeconstructing(true);
    setDeconstructFeedback(null);
    try {
      const cfg = cfgToUse || getAiConfig();
      const res = await deconstructWithSammi(
        task.title,
        task.description,
        cfg
      );

      if (res.steps && res.steps.length > 0) {
        for (const step of res.steps) {
          await onCreateSubtask(step);
        }
        playTaskPopSound();
        const sourceLabel =
          res.source === "gemini"
            ? `Deconstructed with Sammi (${res.model || "Gemini"})`
            : res.source === "ollama"
            ? `Deconstructed with Sammi (${res.model || "Ollama"})`
            : "Deconstructed via Offline Engine";
        setDeconstructFeedback(sourceLabel);
        setTimeout(() => setDeconstructFeedback(null), 3500);
      }
    } catch (err) {
      console.error("Failed to deconstruct task with Sammi:", err);
      setDeconstructFeedback("Deconstruct failed. Please check AI settings.");
      setTimeout(() => setDeconstructFeedback(null), 3500);
    } finally {
      setIsDeconstructing(false);
    }
  };

  const handleDeconstructClick = () => {
    const cfg = getAiConfig();
    if (cfg.provider === "gemini" && !cfg.geminiApiKey?.trim()) {
      setShowApiKeyModal(true);
      return;
    }
    void executeDeconstruct(cfg);
  };

  const handleSaveKeyAndDeconstruct = () => {
    const key = tempApiKey.trim();
    if (!key) return;
    const cfg = getAiConfig();
    const updated = { ...cfg, provider: "gemini" as const, geminiApiKey: key };
    saveAiConfig(updated);
    setShowApiKeyModal(false);
    setTempApiKey("");
    void executeDeconstruct(updated);
  };

  const handleUseOfflineFallback = () => {
    const cfg = getAiConfig();
    setShowApiKeyModal(false);
    void executeDeconstruct({ ...cfg, provider: "offline" });
  };

  // Sync edits when task updates
  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditDueDate(toLocalDateInput(task.due_date));
    setEditNextAction(task.next_action ?? "");
  }, [task]);

  // Load subtasks when expanding if not loaded yet
  useEffect(() => {
    if (isExpanded) {
      onLoadSubtasks();
    }
  }, [isExpanded]);

  const completedSubtasks = subtasks.filter((s) => s.is_completed === 1).length;
  const isDone = task.status === "completed" || isCompleting;
  const isArchived = task.status === "archived" || isArchiveView;

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    try {
      setIsSaving(true);
      await onSaveEdits({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        priority: editPriority,
        dueDate: dateInputToEpoch(editDueDate),
        nextAction: editNextAction.trim() || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const title = newSubtaskTitle.trim();
    setNewSubtaskTitle("");
    await onCreateSubtask(title);
  };

  return (
    <div
      className={cn(
        "grid transition-all duration-350 ease-smooth",
        isDeparting
          ? "opacity-0 scale-[0.98] -translate-y-1 pointer-events-none"
          : "opacity-100 scale-100 translate-y-0"
      )}
      style={{
        gridTemplateRows: isDeparting ? "0fr" : "1fr",
        transitionProperty: "grid-template-rows, opacity, transform",
      }}
    >
      <div className="overflow-hidden min-h-0">
        <div
          className={cn(
            "rounded-xl border bg-card transition-all duration-200 hover:shadow-card relative my-0.5",
            isExpanded ? "border-primary/40 shadow-xs" : "border-border hover:border-border/80",
            isCompleting && "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-xs",
            isDone && !isCompleting && "bg-muted/30 opacity-80"
          )}
        >
          {/* Main Card Summary Row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between p-3.5 gap-3 group">
            {/* Left: Expand Chevron + Checkbox + Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={onToggleExpand}
                className="text-muted-foreground hover:text-foreground p-0.5 transition-colors shrink-0 cursor-pointer"
                title={isExpanded ? "Hide details" : "Show details"}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 ease-smooth",
                    isExpanded && "rotate-90 text-primary"
                  )}
                />
              </button>

              {!isArchived ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete();
                  }}
                  className="shrink-0 transition-transform active:scale-90 relative cursor-pointer"
                  title={isDone ? "Mark incomplete" : "Complete task"}
                >
                  {isDone ? (
                    <div className="relative flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-task-glow" />
                      {isCompleting && (
                        <>
                          <span
                            className="absolute -top-1.5 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-sparkle"
                            style={{ animationDelay: "40ms" }}
                          />
                          <span
                            className="absolute -bottom-1 -left-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-sparkle"
                            style={{ animationDelay: "120ms" }}
                          />
                          <span
                            className="absolute -top-1 -left-2 w-1.5 h-1.5 rounded-full bg-pink-400 animate-sparkle"
                            style={{ animationDelay: "220ms" }}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-emerald-500 hover:scale-105 transition-all duration-150" />
                  )}
                </button>
              ) : null}

              {/* Title & Next Action */}
              <div className="min-w-0 flex-1 cursor-pointer select-text" onClick={onToggleExpand}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={cn(
                      "text-sm font-medium transition-all duration-200 text-foreground",
                      isDone && "line-through text-muted-foreground/80 opacity-70"
                    )}
                  >
                    {task.title}
                  </p>

                  {/* Optional Project Badge */}
                  {projectName && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shrink-0",
                        projectColor ? getProjectColorDef(projectColor).badgeClass : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      <FolderKanban className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate max-w-[120px]">{projectName}</span>
                    </span>
                  )}
                </div>

                {task.next_action && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    <span className="text-primary font-medium">Next:</span> {task.next_action}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Subtasks counter + DatePicker + Priority Badge + Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center ml-7 sm:ml-0">
              {subtasks.length > 0 && (
                <span
                  className="text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md border border-border shrink-0 cursor-pointer"
                  onClick={onToggleExpand}
                  title="Checklist steps completed"
                >
                  {completedSubtasks}/{subtasks.length}
                </span>
              )}

              {/* Inline Date Picker */}
              {!isArchived && (
                <DatePicker
                  value={toLocalDateInput(task.due_date)}
                  onChange={(dateStr) => void onUpdateDueDate(dateStr)}
                  placeholder="Set date"
                  compact
                  align="right"
                />
              )}

              {/* Inline Priority Selector */}
              {!isArchived && (
                <select
                  value={task.priority}
                  onChange={(e) => void onUpdatePriority(e.target.value as Task["priority"])}
                  className={cn(
                    "text-[10px] font-semibold uppercase px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors",
                    priorityColor(task.priority)
                  )}
                  title="Change priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              )}

              {/* Row Action Buttons */}
              {isArchived ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/50 hidden sm:inline">
                    {task.archived_at
                      ? `Archived ${new Date(task.archived_at * 1000).toLocaleDateString()}`
                      : "Archived"}
                  </span>
                  {onRestoreTask && (
                    <button
                      type="button"
                      onClick={onRestoreTask}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                      title="Restore task to active list"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                  )}
                  {onDeleteTask && (
                    <button
                      type="button"
                      onClick={onDeleteTask}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Permanently delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {onSetForToday && (task.status === "inbox" || (task.due_date && task.due_date < Math.floor(Date.now() / 1000))) ? (
                    <button
                      type="button"
                      onClick={onSetForToday}
                      className="text-xs px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors font-medium cursor-pointer"
                      title="Move to Today"
                    >
                      Today
                    </button>
                  ) : null}

                  {onReturnToInbox && task.status !== "inbox" && (
                    <button
                      type="button"
                      onClick={onReturnToInbox}
                      className="text-muted-foreground hover:text-foreground p-1.5 transition-colors cursor-pointer"
                      title="Return to Inbox"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {onArchiveTask && (
                    <button
                      type="button"
                      onClick={onArchiveTask}
                      className="text-muted-foreground hover:text-foreground p-1.5 transition-colors cursor-pointer"
                      title="Archive task"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {onDeleteTask && (
                    <button
                      type="button"
                      onClick={onDeleteTask}
                      className="text-muted-foreground hover:text-rose-500 p-1.5 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Full Expanded Edit Drawer with smooth drop-down accordion */}
          {isExpanded && (
            <div className="bg-muted/20 border-t border-border rounded-b-xl px-6 py-4 space-y-4 animate-drawer-down origin-top">
              {/* Title, Priority & Due Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2.5 items-center">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />

                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Task["priority"])}
                  className="bg-background border border-border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors cursor-pointer"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>

                <DatePicker
                  value={editDueDate}
                  onChange={setEditDueDate}
                  placeholder="Set due date"
                  align="right"
                />
              </div>

              {/* Next Action input */}
              <div>
                <input
                  value={editNextAction}
                  onChange={(e) => setEditNextAction(e.target.value)}
                  placeholder="What is the next visible action?"
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Description / Notes Textarea */}
              <div>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Notes or additional context..."
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none text-foreground placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Subtasks Checklist */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold text-foreground">
                      Checklist & Steps {subtasks.length > 0 && `(${completedSubtasks}/${subtasks.length})`}
                    </p>
                    {deconstructFeedback && (
                      <span className="text-[10px] text-primary font-medium animate-fade-in">
                        {deconstructFeedback}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDeconstructClick()}
                      disabled={isDeconstructing}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                      title="Deconstruct goal into subtasks with Sammi AI"
                    >
                      {isDeconstructing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-primary" />
                      )}
                      <span>{isDeconstructing ? "Sammi is thinking…" : "Deconstruct with Sammi"}</span>
                    </button>

                    {subtasks.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {Math.round((completedSubtasks / subtasks.length) * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {subtasks.length > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300 ease-smooth"
                      style={{
                        width: `${Math.round((completedSubtasks / subtasks.length) * 100)}%`,
                      }}
                    />
                  </div>
                )}

                {/* Subtask Items */}
                {subtasks.length > 0 && (
                  <div className="space-y-1">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-background border border-border/70 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => void onToggleSubtask(subtask.id)}
                          className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1"
                        >
                          {subtask.is_completed === 1 ? (
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span
                            className={cn(
                              "truncate",
                              subtask.is_completed === 1 && "line-through text-muted-foreground"
                            )}
                          >
                            {subtask.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteSubtask(subtask.id)}
                          className="text-muted-foreground hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          title="Delete subtask"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Step Form */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a step..."
                    className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim()}
                    className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Drawer Actions Row */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                {onDeleteTask && (
                  <button
                    type="button"
                    onClick={onDeleteTask}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Task
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={onToggleExpand}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !editTitle.trim()}
                    onClick={() => void handleSave()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-2xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      {showApiKeyModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in select-none"
            onClick={() => setShowApiKeyModal(false)}
          >
            <div
              className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-dialog space-y-4 animate-dialog-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>Connect Gemini API Key for Sammi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Sammi uses Google Gemini cloud intelligence to deconstruct your task into customized, sequential subtasks. Enter your free API key to unlock full generative reasoning.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Google Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-muted/40 border border-border rounded-xl pl-3 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    title={showApiKey ? "Hide API key" : "Show API key"}
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => void openExternalUrl("https://aistudio.google.com/apikey")}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Get free key (Google AI Studio)</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={handleUseOfflineFallback}
                  className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer"
                >
                  Use Offline Heuristics
                </button>
                <button
                  type="button"
                  onClick={handleSaveKeyAndDeconstruct}
                  disabled={!tempApiKey.trim()}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Save & Deconstruct</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

