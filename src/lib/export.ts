import type { Task, Subtask } from "../components/tasks/TasksView";
import type { Project } from "../components/projects/ProjectsView";
import type { Note } from "../components/notes/NoteEditor";

export interface DatabaseStats {
  file_path: string;
  file_size_bytes: number;
  workspaces_count: number;
  tasks_count: number;
  subtasks_count: number;
  projects_count: number;
  notes_count: number;
}

export interface BackupFileInfo {
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  created_at: number;
}

export interface FullWorkspaceExport {
  version: string;
  exported_at: number;
  workspace: unknown;
  projects: Project[];
  tasks: {
    task: Task;
    subtasks: Subtask[];
  }[];
  notes: Note[];
}

/**
 * Trigger client-side file download via Blob URL
 */
export function downloadBlob(content: string, filename: string, mimeType: string = "text/plain;charset=utf-8") {
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
 * Format raw byte size into human readable string
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Escape string for RFC 4180 CSV compliance
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Export tasks to spreadsheet-ready CSV
 */
export function exportTasksToCsv(
  tasks: Task[],
  projects: Project[],
  subtasksMap: Record<string, Subtask[]> = {}
) {
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const headers = [
    "ID",
    "Title",
    "Status",
    "Priority",
    "Due Date",
    "Project",
    "Subtasks",
    "Created Date",
  ];

  const rows = tasks.map((t) => {
    const projName = t.project_id ? projectMap.get(t.project_id) || "Unassigned" : "Unassigned";
    const dueDateStr = t.due_date ? new Date(t.due_date * 1000).toISOString().split("T")[0] : "None";
    const createdDateStr = new Date(t.created_at * 1000).toISOString().split("T")[0];
    const subs = subtasksMap[t.id] || [];
    const subtaskStr = subs.map((s) => `${s.is_completed ? "[x]" : "[ ]"} ${s.title}`).join(" | ");

    return [
      escapeCsvCell(t.id),
      escapeCsvCell(t.title),
      escapeCsvCell(t.status),
      escapeCsvCell(t.priority),
      escapeCsvCell(dueDateStr),
      escapeCsvCell(projName),
      escapeCsvCell(subtaskStr),
      escapeCsvCell(createdDateStr),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadBlob(csvContent, `laya-tasks-${dateStr}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export projects to CSV
 */
export function exportProjectsToCsv(projects: Project[], tasks: Task[]) {
  const headers = [
    "ID",
    "Name",
    "Status",
    "Due Date",
    "Total Tasks",
    "Completed Tasks",
    "Progress %",
    "Created Date",
  ];

  const rows = projects.map((p) => {
    const projTasks = tasks.filter((t) => t.project_id === p.id);
    const completed = projTasks.filter((t) => t.status === "completed").length;
    const progressPct = projTasks.length > 0 ? Math.round((completed / projTasks.length) * 100) : 0;
    const dueDateStr = p.due_date ? new Date(p.due_date * 1000).toISOString().split("T")[0] : "None";
    const createdDateStr = new Date(p.created_at * 1000).toISOString().split("T")[0];

    return [
      escapeCsvCell(p.id),
      escapeCsvCell(p.name),
      escapeCsvCell(p.status),
      escapeCsvCell(dueDateStr),
      escapeCsvCell(projTasks.length),
      escapeCsvCell(completed),
      escapeCsvCell(`${progressPct}%`),
      escapeCsvCell(createdDateStr),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadBlob(csvContent, `laya-projects-${dateStr}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export all notes as a structured Markdown bundle (compatible with Obsidian & Notion)
 */
export function exportNotesToMarkdown(notes: Note[], projects: Project[]) {
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const dateStr = new Date().toISOString().split("T")[0];

  let bundleContent = `# Laya Notes Export Archive\n`;
  bundleContent += `Exported on ${new Date().toLocaleString()}\n`;
  bundleContent += `Total Notes: ${notes.length}\n\n`;
  bundleContent += `=========================================================\n\n`;

  notes.forEach((n, idx) => {
    const projName = n.project_id ? projectMap.get(n.project_id) || "None" : "None";
    const createdStr = new Date(n.created_at * 1000).toISOString();
    const updatedStr = new Date(n.updated_at * 1000).toISOString();

    bundleContent += `---
title: "${n.title.replace(/"/g, '\\"')}"
id: "${n.id}"
project: "${projName}"
pinned: ${n.is_pinned === 1}
archived: ${n.is_archived === 1}
color: "${n.color}"
created_at: "${createdStr}"
updated_at: "${updatedStr}"
---

# ${n.title || "Untitled Note"}

${n.content || "*(Empty note)*"}

\n\n`;
    if (idx < notes.length - 1) {
      bundleContent += `\n<!-- NOTE_BREAK -->\n\n`;
    }
  });

  downloadBlob(bundleContent, `laya-notes-bundle-${dateStr}.md`, "text/markdown;charset=utf-8;");
}

/**
 * Parse a CSV text file into task objects for bulk import
 */
export function parseTasksFromCsv(csvContent: string): { title: string; priority: string; dueDate?: number }[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
  const titleIdx = headers.findIndex((h) => h === "title" || h === "task" || h === "name");
  const priorityIdx = headers.findIndex((h) => h === "priority");
  const dueDateIdx = headers.findIndex((h) => h.includes("due") || h === "date");

  const results: { title: string; priority: string; dueDate?: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells: string[] = [];
    let inQuotes = false;
    let current = "";

    for (let c = 0; c < rawLine.length; c++) {
      const ch = rawLine[c];
      if (ch === '"') {
        if (inQuotes && rawLine[c + 1] === '"') {
          current += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());

    const title = titleIdx >= 0 ? cells[titleIdx] : cells[0];
    if (!title) continue;

    const rawPriority = priorityIdx >= 0 ? cells[priorityIdx]?.toLowerCase() : "medium";
    const priority = ["low", "medium", "high", "urgent"].includes(rawPriority) ? rawPriority : "medium";

    let dueDate: number | undefined;
    if (dueDateIdx >= 0 && cells[dueDateIdx]) {
      const parsedDate = new Date(cells[dueDateIdx]);
      if (!isNaN(parsedDate.getTime())) {
        dueDate = Math.floor(parsedDate.getTime() / 1000);
      }
    }

    results.push({ title, priority, dueDate });
  }

  return results;
}
