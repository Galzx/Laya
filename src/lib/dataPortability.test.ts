import { describe, it, expect } from "vitest";
import {
  escapeCsvCell,
  generateTasksCsv,
  generateNotesCsv,
} from "./dataPortability";
import type { Task } from "../components/tasks/TasksView";
import type { Project } from "../components/projects/ProjectsView";
import type { Note } from "../components/notes/NoteEditor";

describe("Data Portability & CSV Exporter", () => {
  it("properly escapes quotes, commas, and newlines in CSV cells", () => {
    expect(escapeCsvCell("simple")).toBe("simple");
    expect(escapeCsvCell("comma,separated")).toBe('"comma,separated"');
    expect(escapeCsvCell('with "quotes"')).toBe('"with ""quotes"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell(null)).toBe("");
  });

  it("generates structured Tasks CSV matching schema", () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        workspace_id: "ws-1",
        project_id: "proj-1",
        title: 'Review "Q3" report, send feedback',
        description: "Important notes\nSecond line",
        status: "in_progress",
        priority: "urgent",
        start_date: null,
        due_date: 1788955200,
        next_action: "Draft email",
        completed_at: null,
        archived_at: null,
        created_at: 1788900000,
        updated_at: 1788900000,
      },
    ];

    const mockProjects: Project[] = [
      {
        id: "proj-1",
        workspace_id: "ws-1",
        name: "Financial Operations",
        description: "",
        color: "amber",
        cover_image: null,
        status: "active",
        due_date: null,
        created_at: 1788900000,
        updated_at: 1788900000,
      },
    ];

    const csv = generateTasksCsv(mockTasks, mockProjects);
    expect(csv).toContain("Task ID,Title,Project,Status,Priority");
    expect(csv).toContain("Financial Operations");
    expect(csv).toContain('"Review ""Q3"" report, send feedback"');
    expect(csv).toContain("urgent");
  });

  it("generates structured Notes CSV with word count", () => {
    const mockNotes: Note[] = [
      {
        id: "note-1",
        workspace_id: "ws-1",
        project_id: null,
        title: "System Architecture Notes",
        content: "One two three four five words here.",
        is_pinned: 1,
        is_archived: 0,
        color: "indigo",
        created_at: 1788900000,
        updated_at: 1788900000,
      },
    ];

    const csv = generateNotesCsv(mockNotes, []);
    expect(csv).toContain("Note ID,Title,Project,Pinned,Archived,Color");
    expect(csv).toContain("System Architecture Notes");
    expect(csv).toContain("Yes"); // pinned
    expect(csv).toContain("7"); // 7 words
  });
});
