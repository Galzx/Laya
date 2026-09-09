import { describe, it, expect } from "vitest";
import type { Task } from "../../components/tasks/TasksView";
import type { Project } from "../../components/projects/ProjectsView";
import type { Note } from "../../components/notes/NoteEditor";
import {
  levenshteinDistance,
  stringSimilarity,
  calculateEntityMatchScore,
  tryDeterministicIntent,
} from "./deterministic";

describe("Deterministic AI Engine & Algorithms", () => {
  describe("Levenshtein Distance & String Similarity", () => {
    it("computes exact distance between strings", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(levenshteinDistance("", "test")).toBe(4);
      expect(levenshteinDistance("same", "same")).toBe(0);
    });

    it("evaluates string similarity between 0 and 1", () => {
      expect(stringSimilarity("hello", "hello")).toBe(1.0);
      expect(stringSimilarity("", "test")).toBe(0.0);
      expect(stringSimilarity("task", "tasks")).toBeGreaterThan(0.7);
    });

    it("scores entity matches robustly", () => {
      expect(calculateEntityMatchScore("build rust backend", "build rust backend")).toBe(1.0);
      expect(calculateEntityMatchScore("rust", "build rust backend")).toBeGreaterThan(0.5);
      expect(calculateEntityMatchScore("xylophone", "build rust backend")).toBeLessThan(0.2);
    });
  });

  describe("Query Parser & Rule Engine", () => {
    const mockContext: { tasks: Task[]; projects: Project[]; notes: Note[] } = {
      tasks: [
        {
          id: "t1",
          workspace_id: "ws-1",
          title: "Implement auth token validation",
          status: "pending" as const,
          priority: "high" as const,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
          is_archived: 0,
        },
      ] as unknown as Task[],
      projects: [],
      notes: [],
    };

    it("responds to greeting prompts with helpful guidance", () => {
      const res = tryDeterministicIntent("hello sammi", mockContext);
      expect(res).not.toBeNull();
      expect(res?.source).toBe("deterministic");
      expect(res?.content).toContain("Sammi");
    });

    it("responds to workspace audit and health requests", () => {
      const res = tryDeterministicIntent("audit workspace health", mockContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Active Tasks");
      expect(res?.content).toContain("Overdue Tasks");
    });

    it("returns keyboard shortcuts guide upon inquiry", () => {
      const res = tryDeterministicIntent("show me shortcuts", mockContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Command Palette");
      expect(res?.content).toContain("Ctrl+K");
    });

    it("recommends the highest impact next action deterministically", () => {
      const res = tryDeterministicIntent("what should i work on right now", mockContext);
      expect(res).not.toBeNull();
      expect(res?.source).toBe("deterministic");
      expect(res?.content).toContain("Recommended Next Action");
      expect(res?.content).toContain("Implement auth token validation");
    });

    it("generates an Eisenhower Priority Matrix from active tasks", () => {
      const res = tryDeterministicIntent("prioritize my tasks", mockContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Eisenhower Priority Matrix");
      expect(res?.content).toContain("Schedule");
    });

    it("detects overdue batch reschedule intents", () => {
      const overdueContext = {
        ...mockContext,
        tasks: [
          {
            id: "t-overdue",
            workspace_id: "ws-1",
            title: "Submit invoice",
            status: "pending" as const,
            priority: "urgent" as const,
            due_date: Math.floor(Date.now() / 1000) - 86400 * 2,
            created_at: Math.floor(Date.now() / 1000) - 86400 * 3,
            updated_at: Math.floor(Date.now() / 1000),
            is_archived: 0,
          },
        ] as unknown as Task[],
      };
      const res = tryDeterministicIntent("reschedule overdue tasks", overdueContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Overdue Tasks Triage");
      expect(res?.actionPayload?.type).toBe("reschedule_task");
    });

    it("inspects recurring routines and habit streaks", () => {
      const habitContext = {
        ...mockContext,
        tasks: [
          {
            id: "t-habit",
            workspace_id: "ws-1",
            title: "Morning code review",
            description: "Daily routine <!-- laya:recurrence:{\"freq\":\"daily\",\"streak\":4} -->",
            status: "pending" as const,
            priority: "high" as const,
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000),
            is_archived: 0,
          },
        ] as unknown as Task[],
      };
      const res = tryDeterministicIntent("show my habits and streaks", habitContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Active Habits & Recurring Routines");
      expect(res?.content).toContain("4x");
    });

    it("provides weekly velocity productivity reports", () => {
      const res = tryDeterministicIntent("how did i do this week", mockContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Weekly Productivity Velocity Report");
      expect(res?.content).toContain("Weekly Completion Velocity");
    });

    it("provides data portability and export assistance", () => {
      const res = tryDeterministicIntent("how do i export to csv", mockContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Data Portability & Workspace Backups");
      expect(res?.content).toContain("CSV Spreadsheets");
    });

    it("provides ambient soundscape guidance", () => {
      const res = tryDeterministicIntent("play rain and ambient sound", mockContext);
      expect(res).not.toBeNull();
      expect(res?.content).toContain("Multi-Track Soundscape Studio");
      expect(res?.content).toContain("40Hz Gamma Focus");
    });

    it("strictly contains zero em-dashes in deterministic outputs", () => {
      const queries = [
        "hello",
        "audit",
        "shortcuts",
        "what can you do",
        "what should i work on",
        "prioritize my tasks",
        "reschedule overdue",
        "show my habits",
        "how did i do this week",
        "export to csv",
        "ambient sound studio",
      ];
      queries.forEach((q) => {
        const res = tryDeterministicIntent(q, mockContext);
        if (res) {
          expect(res.content).not.toContain("—");
        }
      });
    });

    it("strictly contains zero emojis in deterministic outputs", () => {
      const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]/;
      const queries = [
        "hello",
        "audit",
        "shortcuts",
        "what can you do",
        "what should i work on",
        "prioritize my tasks",
        "reschedule overdue",
        "show my habits",
        "how did i do this week",
        "export to csv",
        "ambient sound studio",
      ];
      queries.forEach((q) => {
        const res = tryDeterministicIntent(q, mockContext);
        if (res) {
          expect(emojiRegex.test(res.content)).toBe(false);
        }
      });
    });
  });
});
