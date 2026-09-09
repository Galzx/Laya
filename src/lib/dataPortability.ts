import type { Task } from "../components/tasks/TasksView";
import type { Project } from "../components/projects/ProjectsView";
import type { Note } from "../components/notes/NoteEditor";

/**
 * Escapes a cell value for standard RFC 4180 CSV
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a list of Tasks into a standard CSV spreadsheet string
 */
export function generateTasksCsv(tasks: Task[], projects: Project[]): string {
  const projectsMap = new Map(projects.map((p) => [p.id, p.name]));

  const headers = [
    "Task ID",
    "Title",
    "Project",
    "Status",
    "Priority",
    "Due Date",
    "Completed Date",
    "Created Date",
    "Next Action",
    "Description",
  ];

  const rows = tasks.map((t) => {
    const projectName = t.project_id ? projectsMap.get(t.project_id) || "" : "";
    const dueStr = t.due_date ? new Date(t.due_date * 1000).toISOString().slice(0, 10) : "";
    const compStr = t.completed_at ? new Date(t.completed_at * 1000).toISOString().slice(0, 10) : "";
    const createdStr = new Date(t.created_at * 1000).toISOString().slice(0, 10);

    return [
      escapeCsvCell(t.id),
      escapeCsvCell(t.title),
      escapeCsvCell(projectName),
      escapeCsvCell(t.status),
      escapeCsvCell(t.priority),
      escapeCsvCell(dueStr),
      escapeCsvCell(compStr),
      escapeCsvCell(createdStr),
      escapeCsvCell(t.next_action),
      escapeCsvCell(t.description),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Converts a list of Notes into a CSV spreadsheet string
 */
export function generateNotesCsv(notes: Note[], projects: Project[]): string {
  const projectsMap = new Map(projects.map((p) => [p.id, p.name]));

  const headers = [
    "Note ID",
    "Title",
    "Project",
    "Pinned",
    "Archived",
    "Color",
    "Created Date",
    "Updated Date",
    "Word Count",
  ];

  const rows = notes.map((n) => {
    const projectName = n.project_id ? projectsMap.get(n.project_id) || "" : "";
    const createdStr = new Date(n.created_at * 1000).toISOString().slice(0, 10);
    const updatedStr = new Date(n.updated_at * 1000).toISOString().slice(0, 10);
    const wordCount = (n.content || "").trim().split(/\s+/).filter(Boolean).length;

    return [
      escapeCsvCell(n.id),
      escapeCsvCell(n.title),
      escapeCsvCell(projectName),
      escapeCsvCell(n.is_pinned ? "Yes" : "No"),
      escapeCsvCell(n.is_archived ? "Yes" : "No"),
      escapeCsvCell(n.color),
      escapeCsvCell(createdStr),
      escapeCsvCell(updatedStr),
      escapeCsvCell(wordCount),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Triggers a client-side file download for any string payload
 */
export function triggerFileDownload(content: string, filename: string, mimeType = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * One-click exporter for tasks CSV
 */
export function exportTasksToCsv(tasks: Task[], projects: Project[]): void {
  const csv = generateTasksCsv(tasks, projects);
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `laya_tasks_${dateStr}.csv`);
}

/**
 * One-click exporter for notes CSV
 */
export function exportNotesToCsv(notes: Note[], projects: Project[]): void {
  const csv = generateNotesCsv(notes, projects);
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `laya_notes_${dateStr}.csv`);
}
