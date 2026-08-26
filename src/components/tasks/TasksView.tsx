import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertCircle, Archive, Calendar, Cat, CheckCircle2, CheckSquare, ChevronDown, ChevronRight, Circle, Inbox, ListTodo, Plus, RotateCcw, Save, Square, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: "inbox" | "todo" | "in_progress" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  start_date: number | null;
  due_date: number | null;
  next_action: string | null;
  completed_at: number | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Subtask { id: string; task_id: string; title: string; is_completed: number; position: number; created_at: number; }
interface TasksViewProps { workspaceId: string; }
type FilterType = "today" | "inbox" | "recovery" | "all" | "completed";
type TaskEdit = { dueDate: string; nextAction: string };

const toLocalDateInput = (timestamp: number | null) => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const dateInputToEpoch = (value: string) => value ? Math.floor(new Date(`${value}T12:00:00`).getTime() / 1000) : null;

export const TasksView: React.FC<TasksViewProps> = ({ workspaceId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [filter, setFilter] = useState<FilterType>("today");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<Record<string, string>>({});
  const [taskEdits, setTaskEdits] = useState<Record<string, TaskEdit>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearingCompleted, setClearingCompleted] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true); setErrorMessage(null);
      setTasks(await invoke<Task[]>("get_tasks", { workspaceId }));
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setErrorMessage(`Couldn't load your tasks: ${String(err)}`);
    } finally { setLoading(false); }
  };

  const loadSubtasks = async (taskId: string) => {
    try {
      const subtasks = await invoke<Subtask[]>("get_subtasks", { taskId });
      setSubtasksMap((previous) => ({ ...previous, [taskId]: subtasks }));
    }
    catch (err) { setErrorMessage(`Couldn't load subtasks: ${String(err)}`); }
  };

  useEffect(() => { if (workspaceId) void loadTasks(); }, [workspaceId]);

  const refreshAfter = async (action: () => Promise<unknown>, message: string) => {
    try { setErrorMessage(null); await action(); await loadTasks(); }
    catch (err) { console.error(message, err); setErrorMessage(`${message}: ${String(err)}`); }
  };

  const handleCapture = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    await refreshAfter(() => invoke("create_task", { workspaceId, title: newTitle.trim(), description: null, priority: newPriority, startDate: null, dueDate: dateInputToEpoch(newDueDate), nextAction: null }), "Couldn't capture this task");
    const isForToday = newDueDate === toLocalDateInput(Math.floor(Date.now() / 1000));
    setNewTitle(""); setNewDueDate(""); setFilter(isForToday ? "today" : newDueDate ? "all" : "inbox");
  };

  const toggleExpandTask = (task: Task) => setExpandedTaskIds((previous) => {
    const next = new Set(previous);
    if (next.has(task.id)) next.delete(task.id);
    else {
      next.add(task.id);
      if (!subtasksMap[task.id]) void loadSubtasks(task.id);
      setTaskEdits((edits) => ({ ...edits, [task.id]: edits[task.id] ?? { dueDate: toLocalDateInput(task.due_date), nextAction: task.next_action ?? "" } }));
    }
    return next;
  });

  const setTaskForToday = (taskId: string) => {
    const today = new Date();
    const dueDate = Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime() / 1000);
    return refreshAfter(() => invoke("plan_task_for_today", { taskId, dueDate }), "Couldn't move this task to Today");
  };
  const setTaskStatus = (taskId: string, status: Task["status"], message: string) => refreshAfter(() => invoke("set_task_status", { taskId, status }), message);

  const clearCompleted = async () => {
    try {
      setClearingCompleted(true);
      setErrorMessage(null);
      await invoke("clear_completed_tasks", { workspaceId });
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      await loadTasks();
      setShowClearDialog(false);
    } catch (err) {
      setErrorMessage(`Couldn't clear completed tasks: ${String(err)}`);
    } finally {
      setClearingCompleted(false);
    }
  };

  const saveTaskDetails = async (task: Task) => {
    const edit = taskEdits[task.id]; if (!edit) return;
    await refreshAfter(async () => {
      await invoke("update_task_due_date", { taskId: task.id, dueDate: dateInputToEpoch(edit.dueDate) });
      await invoke("update_task_next_action", { taskId: task.id, nextAction: edit.nextAction.trim() || null });
    }, "Couldn't save task details");
  };

  const handleCreateSubtask = async (taskId: string, event: React.FormEvent) => {
    event.preventDefault(); const title = (newSubtaskTitle[taskId] || "").trim(); if (!title) return;
    try { await invoke("create_subtask", { taskId, title }); setNewSubtaskTitle((previous) => ({ ...previous, [taskId]: "" })); await loadSubtasks(taskId); }
    catch (err) { setErrorMessage(`Couldn't create subtask: ${String(err)}`); }
  };
  const handleSubtaskAction = async (taskId: string, command: string, subtaskId: string) => {
    try { await invoke(command, { subtaskId }); await loadSubtasks(taskId); }
    catch (err) { setErrorMessage(`Couldn't update subtask: ${String(err)}`); }
  };

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday); endOfToday.setHours(23, 59, 59, 999);
  const startOfTodayEpoch = Math.floor(startOfToday.getTime() / 1000);
  const endOfTodayEpoch = Math.floor(endOfToday.getTime() / 1000);
  const isOpen = (task: Task) => task.status !== "completed" && task.status !== "archived";
  const isToday = (task: Task) => isOpen(task) && task.due_date !== null && task.due_date >= startOfTodayEpoch && task.due_date <= endOfTodayEpoch;
  const isOverdue = (task: Task) => isOpen(task) && task.due_date !== null && task.due_date < startOfTodayEpoch;
  const filteredTasks = tasks.filter((task) => filter === "today" ? isToday(task) : filter === "inbox" ? task.status === "inbox" : filter === "recovery" ? isOverdue(task) : filter === "completed" ? task.status === "completed" : task.status !== "archived");
  const counts = { today: tasks.filter(isToday).length, inbox: tasks.filter((task) => task.status === "inbox").length, recovery: tasks.filter(isOverdue).length, all: tasks.filter((task) => task.status !== "archived").length, completed: tasks.filter((task) => task.status === "completed").length };
  const filterLabels: Record<FilterType, { title: string; helper: string }> = {
    today: { title: "Today", helper: "A small, realistic list for the day ahead." }, inbox: { title: "Inbox", helper: "Capture first. Decide what matters when you are ready." }, recovery: { title: "Recovery", helper: "Nothing is behind forever. Choose what to keep, move, or let go." }, all: { title: "All tasks", helper: "Your complete active list, without archived items." }, completed: { title: "Completed", helper: "A record of what you have already moved forward." },
  };
  const priorityColor = (priority: Task["priority"]) => ({ urgent: "text-rose-500 bg-rose-500/10 border-rose-500/20", high: "text-amber-500 bg-amber-500/10 border-amber-500/20", medium: "text-blue-500 bg-blue-500/10 border-blue-500/20", low: "text-slate-400 bg-slate-500/10 border-slate-500/20" }[priority]);

  return <div className="space-y-6 max-w-4xl">
    <div className="space-y-1"><h2 className="text-xl font-semibold tracking-tight">{filterLabels[filter].title}</h2><p className="text-sm text-muted-foreground">{filterLabels[filter].helper}</p></div>
    <form onSubmit={handleCapture} className="flex flex-wrap items-center gap-2.5 bg-card border border-border p-3 rounded-xl shadow-xs">
      <Inbox className="h-4 w-4 text-muted-foreground ml-1" /><input type="text" autoFocus placeholder="Capture a task - you can plan it later" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="flex-1 min-w-[200px] bg-transparent px-2 py-1.5 text-sm focus:outline-none placeholder:text-muted-foreground/60 text-foreground" />
      <input type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} aria-label="Due date" className="bg-secondary text-secondary-foreground border border-border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none" />
      <select value={newPriority} onChange={(event) => setNewPriority(event.target.value as Task["priority"])} className="bg-secondary text-secondary-foreground border border-border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
      <button type="submit" disabled={!newTitle.trim()} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3.5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"><Plus className="h-4 w-4" /> Capture</button>
    </form>
    <div className="flex flex-wrap items-center gap-1.5"><div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border text-xs w-fit">{(["today", "inbox", "recovery", "all", "completed"] as FilterType[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={cn("px-3 py-1.5 rounded-md transition-colors font-medium capitalize", filter === item ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}>{item} ({counts[item]})</button>)}</div>{filter === "completed" && counts.completed > 0 && <button type="button" onClick={() => setShowClearDialog(true)} className="inline-flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg text-xs font-medium"><Trash2 className="h-3.5 w-3.5" /> Clear completed</button>}</div>
    {errorMessage && <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-500"><AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}</div>}
    {loading ? <p className="text-xs text-muted-foreground">Reading your local tasks...</p> : filteredTasks.length === 0 ? <div className="border border-dashed border-border rounded-xl p-8 text-center space-y-1"><p className="text-sm font-medium text-foreground">{filter === "today" ? "Your day is clear" : filter === "recovery" ? "Nothing needs rescuing" : "Nothing here yet"}</p><p className="text-xs text-muted-foreground">{filter === "today" ? "Move a task from Inbox when you are ready to make room for it." : "Capture a task above whenever it comes to mind."}</p></div> : <div className="space-y-2">{filteredTasks.map((task) => {
      const expanded = expandedTaskIds.has(task.id); const subtasks = subtasksMap[task.id] || []; const completedSubtasks = subtasks.filter((subtask) => subtask.is_completed === 1).length; const overdue = isOverdue(task); const edit = taskEdits[task.id] ?? { dueDate: toLocalDateInput(task.due_date), nextAction: task.next_action ?? "" };
      return <div key={task.id} className={cn("rounded-xl border border-border bg-card overflow-hidden transition-all duration-300", task.status === "completed" && "bg-muted/30 opacity-80")}>
        <div className="flex items-center justify-between p-3.5 gap-3 group"><div className="flex items-center gap-3 flex-1 min-w-0"><button type="button" onClick={() => toggleExpandTask(task)} className="text-muted-foreground hover:text-foreground p-0.5" title="Show task details">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button><button type="button" onClick={() => void refreshAfter(() => invoke("toggle_task_status", { taskId: task.id }), "Couldn't update this task")} className="shrink-0">{task.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-task-check" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-transform hover:scale-110" />}</button><div className="min-w-0 flex-1"><p className={cn("text-sm font-medium truncate transition-colors duration-300", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</p>{task.next_action && <p className="text-xs text-muted-foreground truncate mt-0.5">Next: {task.next_action}</p>}</div><div className="flex items-center gap-1.5 shrink-0">{subtasks.length > 0 && <span className="text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md border border-border">{completedSubtasks}/{subtasks.length}</span>}{task.due_date && <span className={cn("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border", overdue ? "text-rose-500 bg-rose-500/10 border-rose-500/20" : "text-muted-foreground bg-muted border-border")}><Calendar className="h-3 w-3" />{overdue ? "Needs a new plan" : isToday(task) ? "Today" : new Date(task.due_date * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}<span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border", priorityColor(task.priority))}>{task.priority}</span></div></div>
          {isOpen(task) && <div className="flex items-center gap-1">{task.status === "inbox" || overdue ? <button type="button" onClick={() => void setTaskForToday(task.id)} className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80" title="Move to Today">Today</button> : null}{task.status !== "inbox" ? <button type="button" onClick={() => void setTaskStatus(task.id, "inbox", "Couldn't move this task to Inbox")} className="text-muted-foreground hover:text-foreground p-1.5" title="Return to Inbox"><RotateCcw className="h-3.5 w-3.5" /></button> : null}<button type="button" onClick={() => void setTaskStatus(task.id, "archived", "Couldn't archive this task")} className="text-muted-foreground hover:text-foreground p-1.5" title="Archive task"><Archive className="h-3.5 w-3.5" /></button></div>}</div>
        {expanded && <div className="bg-muted/20 border-t border-border px-6 py-4 space-y-4"><div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2"><input value={edit.nextAction} onChange={(event) => setTaskEdits((previous) => ({ ...previous, [task.id]: { ...edit, nextAction: event.target.value } }))} placeholder="What is the next visible action?" className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" /><div className="flex gap-2"><input type="date" value={edit.dueDate} onChange={(event) => setTaskEdits((previous) => ({ ...previous, [task.id]: { ...edit, dueDate: event.target.value } }))} className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" /><button type="button" onClick={() => void saveTaskDetails(task)} className="inline-flex items-center gap-1 bg-secondary hover:bg-secondary/80 border border-border rounded-lg px-2.5 py-1.5 text-xs"><Save className="h-3.5 w-3.5" /> Save</button></div></div><div className="space-y-1.5">{subtasks.map((subtask) => <div key={subtask.id} className="flex items-center justify-between py-1 group/subtask text-xs"><div className="flex items-center gap-2.5 min-w-0"><button type="button" onClick={() => void handleSubtaskAction(task.id, "toggle_subtask", subtask.id)}>{subtask.is_completed === 1 ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> : <Square className="h-3.5 w-3.5 text-muted-foreground" />}</button><span className={cn("truncate", subtask.is_completed === 1 && "line-through text-muted-foreground")}>{subtask.title}</span></div><button type="button" onClick={() => void handleSubtaskAction(task.id, "delete_subtask", subtask.id)} className="text-muted-foreground hover:text-rose-500 p-1" title="Delete subtask"><Trash2 className="h-3 w-3" /></button></div>)}</div><form onSubmit={(event) => void handleCreateSubtask(task.id, event)} className="flex items-center gap-2"><ListTodo className="h-3.5 w-3.5 text-muted-foreground" /><input type="text" placeholder="Add a small next step..." value={newSubtaskTitle[task.id] || ""} onChange={(event) => setNewSubtaskTitle((previous) => ({ ...previous, [task.id]: event.target.value }))} className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none" /><button type="submit" disabled={!(newSubtaskTitle[task.id] || "").trim()} className="bg-secondary disabled:opacity-50 border border-border text-xs px-2.5 py-1 rounded-lg">Add step</button></form></div>}
      </div>;
    })}</div>}
    {showClearDialog && <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-5 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="clear-completed-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl text-center"><Cat className={cn("mx-auto mb-3 h-10 w-10 text-muted-foreground", clearingCompleted && "animate-cat-tidy")} strokeWidth={1.5} /><h3 id="clear-completed-title" className="text-base font-semibold">{clearingCompleted ? "Tidying up completed tasks…" : "Clear completed tasks?"}</h3><p className="mt-2 text-sm text-muted-foreground">{clearingCompleted ? "A small helper is putting them away." : `This will permanently remove ${counts.completed} completed task${counts.completed === 1 ? "" : "s"} and their steps.`}</p><div className="mt-5 flex justify-center gap-2">{!clearingCompleted && <button type="button" onClick={() => setShowClearDialog(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted">Keep them</button>}<button type="button" disabled={clearingCompleted} onClick={() => void clearCompleted()} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-70">{clearingCompleted ? "Tidying…" : "Clear them"}</button></div></div></div>}
  </div>;
};
