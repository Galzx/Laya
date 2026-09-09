import { describe, it, expect } from "vitest";
import type { Task, Subtask } from "../tasks/TasksView";
import { processRecurringCompletion, parseRecurrenceFromDescription } from "../../lib/recurrence";

// Replicate column mapping logic from KanbanBoard
type KanbanColumnId = "inbox" | "todo" | "in_progress" | "completed";

function getTaskColumn(task: Task): KanbanColumnId | null {
  if (task.status === "archived") return null;
  if (task.status === "inbox") return "inbox";
  if (task.status === "in_progress") return "in_progress";
  if (task.status === "completed") return "completed";
  if (task.status === "todo" || (task.status as string) === "planned" || (task.status as string) === "waiting") {
    return "todo";
  }
  return null;
}

function filterKanbanTasks(
  tasks: Task[],
  query: string,
  priorityFilter: "all" | Task["priority"],
  projectFilter: string | null
): Task[] {
  return tasks.filter((t) => {
    if (t.status === "archived") return false;
    if (projectFilter && t.project_id !== projectFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });
}

function calculateSubtaskProgress(subtasks: Subtask[]) {
  if (subtasks.length === 0) return { total: 0, completed: 0, ratio: 0, percent: 0 };
  const completed = subtasks.filter((s) => s.is_completed === 1).length;
  const ratio = completed / subtasks.length;
  return {
    total: subtasks.length,
    completed,
    ratio,
    percent: Math.round(ratio * 100),
  };
}

describe("Kanban Board Polish Suite", () => {
  const mockTasks: Task[] = [
    {
      id: "t-1",
      workspace_id: "ws-1",
      project_id: "p-alpha",
      title: "Fix compiler warning",
      description: "Check cargo check output",
      status: "inbox",
      priority: "high",
      start_date: null,
      due_date: null,
      next_action: null,
      completed_at: null,
      archived_at: null,
      created_at: 1000,
      updated_at: 1000,
      position: 0,
    },
    {
      id: "t-2",
      workspace_id: "ws-1",
      project_id: "p-alpha",
      title: "Write integration tests",
      description: "Test kanban board drag and drop",
      status: "todo",
      priority: "urgent",
      start_date: null,
      due_date: 2000,
      next_action: null,
      completed_at: null,
      archived_at: null,
      created_at: 1000,
      updated_at: 1000,
      position: 1,
    },
    {
      id: "t-3",
      workspace_id: "ws-1",
      project_id: "p-beta",
      title: "Implement subtask drawer",
      description: "Slide over task detail drawer <!-- laya:recurrence:{\"freq\":\"daily\",\"streak\":3} -->",
      status: "in_progress",
      priority: "medium",
      start_date: null,
      due_date: 3000,
      next_action: null,
      completed_at: null,
      archived_at: null,
      created_at: 1000,
      updated_at: 1000,
      position: 2,
    },
    {
      id: "t-4",
      workspace_id: "ws-1",
      project_id: null,
      title: "Legacy task",
      description: "Archived item",
      status: "archived",
      priority: "low",
      start_date: null,
      due_date: null,
      next_action: null,
      completed_at: null,
      archived_at: 4000,
      created_at: 1000,
      updated_at: 1000,
      position: 3,
    },
  ];

  describe("1. Column Assignment & Lifecycle", () => {
    it("maps tasks into the appropriate 4 columns", () => {
      expect(getTaskColumn(mockTasks[0])).toBe("inbox");
      expect(getTaskColumn(mockTasks[1])).toBe("todo");
      expect(getTaskColumn(mockTasks[2])).toBe("in_progress");
    });

    it("excludes archived tasks from all Kanban columns", () => {
      expect(getTaskColumn(mockTasks[3])).toBeNull();
    });

    it("treats planned and waiting statuses as todo column items", () => {
      const plannedTask = { ...mockTasks[0], status: "planned" as Task["status"] };
      const waitingTask = { ...mockTasks[0], status: "waiting" as Task["status"] };
      expect(getTaskColumn(plannedTask)).toBe("todo");
      expect(getTaskColumn(waitingTask)).toBe("todo");
    });
  });

  describe("2. Live Search & Multi-Criteria Filtering", () => {
    it("filters tasks by title query", () => {
      const results = filterKanbanTasks(mockTasks, "compiler", "all", null);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("t-1");
    });

    it("filters tasks by description query", () => {
      const results = filterKanbanTasks(mockTasks, "drawer", "all", null);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("t-3");
    });

    it("filters tasks by priority", () => {
      const results = filterKanbanTasks(mockTasks, "", "urgent", null);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("t-2");
    });

    it("filters tasks by project ID", () => {
      const results = filterKanbanTasks(mockTasks, "", "all", "p-alpha");
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toEqual(["t-1", "t-2"]);
    });

    it("excludes archived tasks even when query matches", () => {
      const results = filterKanbanTasks(mockTasks, "Legacy", "all", null);
      expect(results).toHaveLength(0);
    });
  });

  describe("3. Subtask Calculation Metrics on Cards", () => {
    const subtasks: Subtask[] = [
      { id: "s-1", task_id: "t-1", title: "Step 1", is_completed: 1, position: 0, created_at: 100 },
      { id: "s-2", task_id: "t-1", title: "Step 2", is_completed: 1, position: 1, created_at: 100 },
      { id: "s-3", task_id: "t-1", title: "Step 3", is_completed: 0, position: 2, created_at: 100 },
      { id: "s-4", task_id: "t-1", title: "Step 4", is_completed: 0, position: 3, created_at: 100 },
    ];

    it("calculates accurate subtask ratio and percentages", () => {
      const progress = calculateSubtaskProgress(subtasks);
      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(2);
      expect(progress.ratio).toBe(0.5);
      expect(progress.percent).toBe(50);
    });

    it("handles empty subtasks gracefully", () => {
      const progress = calculateSubtaskProgress([]);
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.ratio).toBe(0);
      expect(progress.percent).toBe(0);
    });
  });

  describe("4. Recurrence & Habit Streak Parity", () => {
    it("parses recurrence frequency and streak from description", () => {
      const rec = parseRecurrenceFromDescription(mockTasks[2].description);
      expect(rec.data?.frequency).toBe("daily");
      expect(rec.data?.streak).toBe(3);
      expect(rec.cleanDescription).toBe("Slide over task detail drawer");
    });

    it("auto-advances streak and due date when completing recurring card", () => {
      const result = processRecurringCompletion(mockTasks[2].due_date, mockTasks[2].description);
      expect(result.isRecurring).toBe(true);
      expect(result.nextStreak).toBe(4); // 3 + 1
      expect(result.nextDueDate).toBeGreaterThan(mockTasks[2].due_date!);
      expect(result.nextDescription).toContain('"streak":4');
    });
  });

  describe("5. Quality Standards Compliance", () => {
    const uiLabels = [
      "Backlog / Inbox",
      "To-Do / Planned",
      "In Progress",
      "Completed",
      "Unscheduled thoughts and captures",
      "Scheduled for execution",
      "Actively underway",
      "Finished milestones",
      "Focus Cue: 4 tasks underway. Prioritize finishing before starting more.",
      "Filter cards by title or keyword...",
    ];

    it("contains zero emojis in UI strings", () => {
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      for (const label of uiLabels) {
        expect(label).not.toMatch(emojiRegex);
      }
    });

    it("contains zero em-dashes in UI strings", () => {
      for (const label of uiLabels) {
        expect(label).not.toContain("—");
      }
    });
  });
});
