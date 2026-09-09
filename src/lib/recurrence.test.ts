import { describe, it, expect } from "vitest";
import {
  getNextDueDate,
  parseRecurrenceFromDescription,
  embedRecurrenceInDescription,
  processRecurringCompletion,
  formatRecurrenceLabel,
} from "./recurrence";

describe("Recurrence & Habit Streaks Engine", () => {
  it("formats human-friendly labels accurately", () => {
    expect(formatRecurrenceLabel("daily")).toBe("Repeats daily");
    expect(formatRecurrenceLabel("weekdays")).toBe("Repeats Mon-Fri");
    expect(formatRecurrenceLabel("weekly")).toBe("Repeats weekly");
    expect(formatRecurrenceLabel("none")).toBe("Does not repeat");
  });

  it("calculates daily next due date (+24 hours)", () => {
    // 2026-09-09 12:00:00 UTC
    const base = 1788955200;
    const next = getNextDueDate(base, "daily");
    expect(next - base).toBe(86400); // exactly 1 day
  });

  it("calculates weekly next due date (+7 days)", () => {
    const base = 1788955200;
    const next = getNextDueDate(base, "weekly");
    expect(next - base).toBe(7 * 86400);
  });

  it("advances weekdays skipping Saturday and Sunday", () => {
    // Friday
    const friday = new Date("2026-09-11T12:00:00Z");
    const fridayEpoch = Math.floor(friday.getTime() / 1000);
    const nextEpoch = getNextDueDate(fridayEpoch, "weekdays");
    const nextDate = new Date(nextEpoch * 1000);

    // Should be Monday (day 1)
    expect(nextDate.getUTCDay()).toBe(1);
    expect(nextEpoch - fridayEpoch).toBe(3 * 86400); // Friday to Monday is 3 days
  });

  it("embeds and extracts recurrence metadata seamlessly without altering description text", () => {
    const rawDesc = "Drink 2L of water and complete workout";
    const embedded = embedRecurrenceInDescription(rawDesc, "daily", 4);

    expect(embedded).toContain(rawDesc);
    expect(embedded).toContain("laya:recurrence");

    const parsed = parseRecurrenceFromDescription(embedded);
    expect(parsed.data).not.toBeNull();
    expect(parsed.data?.frequency).toBe("daily");
    expect(parsed.data?.streak).toBe(4);
    expect(parsed.cleanDescription).toBe(rawDesc);
  });

  it("advances due date and increments habit streak on completion", () => {
    const baseDue = 1788955200;
    const desc = embedRecurrenceInDescription("Morning meditation", "daily", 7);

    const result = processRecurringCompletion(baseDue, desc);

    expect(result.isRecurring).toBe(true);
    expect(result.nextStreak).toBe(8);
    expect(result.nextDueDate).toBe(baseDue + 86400);
    expect(result.nextDescription).toContain('"streak":8');
  });

  it("gracefully ignores non-recurring tasks on completion", () => {
    const result = processRecurringCompletion(123456, "One off task");
    expect(result.isRecurring).toBe(false);
    expect(result.nextStreak).toBe(0);
    expect(result.nextDueDate).toBe(123456);
  });
});

