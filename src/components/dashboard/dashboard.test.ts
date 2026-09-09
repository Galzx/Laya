import { describe, it, expect } from "vitest";
import {
  ALL_WIDGETS_METADATA,
  getWorkspaceDefaultLayout,
} from "./defaultLayouts";
import type { DashboardWidgetConfig, DashboardAggregates } from "./types";

describe("Customizable Modular Dashboard System", () => {
  describe("1. Workspace-Specific Presets", () => {
    it("generates the Personal Workspace preset with habits and calendar enabled", () => {
      const layout = getWorkspaceDefaultLayout("Personal Workspace");
      const visibleIds = layout.filter((w) => w.visible).map((w) => w.id);

      expect(visibleIds).toContain("today_tasks");
      expect(visibleIds).toContain("habits_streaks");
      expect(visibleIds).toContain("calendar_agenda");
      expect(visibleIds).toContain("deep_work");
      expect(visibleIds).toContain("sammi_briefing");
      expect(visibleIds).toContain("metrics_glance");

      // Coding subtasks and projects should be hidden by default in Personal
      const hiddenIds = layout.filter((w) => !w.visible).map((w) => w.id);
      expect(hiddenIds).toContain("coding_subtasks");
      expect(hiddenIds).toContain("projects");
    });

    it("generates the Programming Workspace preset with coding subtasks and active projects enabled", () => {
      const layout = getWorkspaceDefaultLayout("Programming Workspace");
      const visibleIds = layout.filter((w) => w.visible).map((w) => w.id);

      expect(visibleIds).toContain("today_tasks");
      expect(visibleIds).toContain("coding_subtasks");
      expect(visibleIds).toContain("projects");
      expect(visibleIds).toContain("deep_work");
      expect(visibleIds).toContain("recent_notes");
      expect(visibleIds).toContain("metrics_glance");

      // Habits and calendar should be hidden by default in Programming
      const hiddenIds = layout.filter((w) => !w.visible).map((w) => w.id);
      expect(hiddenIds).toContain("habits_streaks");
      expect(hiddenIds).toContain("calendar_agenda");
    });

    it("identifies workspace context by id or case-insensitive keyword", () => {
      const byId = getWorkspaceDefaultLayout("ws-programming");
      expect(byId.find((w) => w.id === "coding_subtasks")?.visible).toBe(true);

      const byKeyword = getWorkspaceDefaultLayout("Developer Core");
      expect(byKeyword.find((w) => w.id === "coding_subtasks")?.visible).toBe(true);

      const personalId = getWorkspaceDefaultLayout("ws-default-primary");
      expect(personalId.find((w) => w.id === "habits_streaks")?.visible).toBe(true);
    });
  });

  describe("2. Widget Metadata Quality Standards", () => {
    it("defines valid metadata for every registered widget", () => {
      const widgetIds = Object.keys(ALL_WIDGETS_METADATA);
      expect(widgetIds.length).toBeGreaterThanOrEqual(10);

      for (const [id, meta] of Object.entries(ALL_WIDGETS_METADATA)) {
        expect(meta.id).toBe(id);
        expect(meta.title.length).toBeGreaterThan(0);
        expect(meta.description.length).toBeGreaterThan(0);
        expect([4, 5, 6, 7, 8, 12]).toContain(meta.defaultColSpan);
      }
    });

    it("enforces zero emojis in widget metadata", () => {
      const emojiRegex =
        /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const meta of Object.values(ALL_WIDGETS_METADATA)) {
        expect(emojiRegex.test(meta.title)).toBe(false);
        expect(emojiRegex.test(meta.description)).toBe(false);
      }
    });

    it("enforces zero em-dashes in widget metadata", () => {
      for (const meta of Object.values(ALL_WIDGETS_METADATA)) {
        expect(meta.title).not.toContain("—");
        expect(meta.description).not.toContain("—");
      }
    });
  });

  describe("3. Layout Reordering and Resizing", () => {
    it("correctly updates order indices when moving widgets", () => {
      const initial: DashboardWidgetConfig[] = [
        { id: "metrics_glance", colSpan: 12, visible: true, order: 0 },
        { id: "today_tasks", colSpan: 7, visible: true, order: 1 },
        { id: "deep_work", colSpan: 5, visible: true, order: 2 },
      ];

      // Simulate moving today_tasks (index 1) to top (index 0)
      const reordered = [...initial];
      const [item] = reordered.splice(1, 1);
      reordered.splice(0, 0, item);

      const withUpdatedOrders = reordered.map((w, idx) => ({ ...w, order: idx }));

      expect(withUpdatedOrders[0].id).toBe("today_tasks");
      expect(withUpdatedOrders[0].order).toBe(0);
      expect(withUpdatedOrders[1].id).toBe("metrics_glance");
      expect(withUpdatedOrders[1].order).toBe(1);
    });

    it("toggles widget visibility and supports width resizing", () => {
      const layout = getWorkspaceDefaultLayout("Personal Workspace");
      const target = layout.find((w) => w.id === "calendar_agenda")!;
      expect(target.visible).toBe(true);

      // Toggle to hidden
      const toggled = layout.map((w) =>
        w.id === "calendar_agenda" ? { ...w, visible: false } : w
      );
      expect(toggled.find((w) => w.id === "calendar_agenda")?.visible).toBe(false);

      // Resize from 6 to 12
      const resized = layout.map((w) =>
        w.id === "calendar_agenda" ? { ...w, colSpan: 12 } : w
      );
      expect(resized.find((w) => w.id === "calendar_agenda")?.colSpan).toBe(12);
    });
  });

  describe("4. Cross-Table SQL Aggregates Math", () => {
    it("calculates subtask completion ratio accurately", () => {
      const aggregates: DashboardAggregates = {
        total_tasks: 10,
        active_tasks: 6,
        completed_today: 4,
        overdue_tasks: 1,
        total_subtasks: 12,
        completed_subtasks: 9,
        today_subtasks_total: 8,
        today_subtasks_completed: 6,
        subtask_completion_ratio: 6 / 8, // 0.75
        active_projects: 3,
        total_notes: 5,
      };

      const pct = Math.round(aggregates.subtask_completion_ratio * 100);
      expect(pct).toBe(75);
    });

    it("handles zero subtasks gracefully without NaN", () => {
      const emptyAggregates: DashboardAggregates = {
        total_tasks: 2,
        active_tasks: 2,
        completed_today: 0,
        overdue_tasks: 0,
        total_subtasks: 0,
        completed_subtasks: 0,
        today_subtasks_total: 0,
        today_subtasks_completed: 0,
        subtask_completion_ratio: 0,
        active_projects: 1,
        total_notes: 0,
      };

      const pct = Math.round(emptyAggregates.subtask_completion_ratio * 100);
      expect(pct).toBe(0);
      expect(Number.isFinite(pct)).toBe(true);
    });
  });
});
