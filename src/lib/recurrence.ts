/**
 * Laya Recurring Tasks & Habit Streaks Engine
 * 
 * Provides deterministic calculation of recurring task intervals and habit streaks
 * with zero AI tokens and zero database schema changes (persisted via standardized tags).
 */

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "biweekly"
  | "monthly";

export interface RecurrenceData {
  frequency: RecurrenceFrequency;
  streak: number;
  lastCompleted?: number; // epoch in seconds
}

const RECURRENCE_REGEX = /<!--\s*laya:recurrence:(\{.*?\})\s*-->/;

/**
 * Calculates the next due date epoch based on the recurrence frequency
 */
export function getNextDueDate(baseEpoch: number, frequency: RecurrenceFrequency): number {
  if (frequency === "none") return baseEpoch;

  const date = new Date(baseEpoch * 1000);

  switch (frequency) {
    case "daily": {
      date.setDate(date.getDate() + 1);
      break;
    }
    case "weekdays": {
      // Advance to the next Monday - Friday
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6);
      break;
    }
    case "weekly": {
      date.setDate(date.getDate() + 7);
      break;
    }
    case "biweekly": {
      date.setDate(date.getDate() + 14);
      break;
    }
    case "monthly": {
      const originalDay = date.getDate();
      date.setMonth(date.getMonth() + 1);
      // Handle months with fewer days (e.g. Jan 31 -> Feb 28)
      if (date.getDate() !== originalDay) {
        date.setDate(0); // last day of target month
      }
      break;
    }
  }

  return Math.floor(date.getTime() / 1000);
}

/**
 * Extracts recurrence metadata from a task description
 */
export function parseRecurrenceFromDescription(description: string | null | undefined): {
  data: RecurrenceData | null;
  cleanDescription: string;
} {
  if (!description) {
    return { data: null, cleanDescription: "" };
  }

  const match = description.match(RECURRENCE_REGEX);
  if (!match) {
    return { data: null, cleanDescription: description };
  }

  try {
    const parsed = JSON.parse(match[1]) as {
      freq?: RecurrenceFrequency;
      streak?: number;
      lastCompleted?: number;
    };

    const clean = description.replace(RECURRENCE_REGEX, "").trim();

    return {
      data: {
        frequency: parsed.freq || "none",
        streak: parsed.streak || 0,
        lastCompleted: parsed.lastCompleted,
      },
      cleanDescription: clean,
    };
  } catch {
    return { data: null, cleanDescription: description };
  }
}

/**
 * Embeds or updates recurrence metadata in a task description
 */
export function embedRecurrenceInDescription(
  description: string | null | undefined,
  frequency: RecurrenceFrequency,
  streak = 0,
  lastCompleted?: number
): string {
  const { cleanDescription } = parseRecurrenceFromDescription(description);

  if (frequency === "none") {
    return cleanDescription;
  }

  const payload = JSON.stringify({
    freq: frequency,
    streak,
    lastCompleted: lastCompleted || Math.floor(Date.now() / 1000),
  });

  const tag = `<!-- laya:recurrence:${payload} -->`;
  return cleanDescription ? `${cleanDescription}\n\n${tag}` : tag;
}

/**
 * Handles completing a recurring task:
 * Advances the due date and increments the habit streak if completed in time.
 */
export function processRecurringCompletion(
  currentDueDate: number | null,
  description: string | null | undefined
): {
  isRecurring: boolean;
  nextDueDate: number | null;
  nextDescription: string;
  nextStreak: number;
} {
  const { data, cleanDescription } = parseRecurrenceFromDescription(description);

  if (!data || data.frequency === "none") {
    return {
      isRecurring: false,
      nextDueDate: currentDueDate,
      nextDescription: description || "",
      nextStreak: 0,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const baseDate = currentDueDate && currentDueDate > 0 ? currentDueDate : now;
  const nextDueDate = getNextDueDate(baseDate, data.frequency);
  const nextStreak = data.streak + 1;

  const nextDescription = embedRecurrenceInDescription(
    cleanDescription,
    data.frequency,
    nextStreak,
    now
  );

  return {
    isRecurring: true,
    nextDueDate,
    nextDescription,
    nextStreak,
  };
}

/**
 * Returns a human-friendly label for a recurrence frequency
 */
export function formatRecurrenceLabel(freq: RecurrenceFrequency): string {
  switch (freq) {
    case "daily":
      return "Repeats daily";
    case "weekdays":
      return "Repeats Mon-Fri";
    case "weekly":
      return "Repeats weekly";
    case "biweekly":
      return "Repeats every 2 weeks";
    case "monthly":
      return "Repeats monthly";
    case "none":
    default:
      return "Does not repeat";
  }
}

