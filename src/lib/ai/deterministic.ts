import type { Task } from "../../components/tasks/TasksView";
import type { Project } from "../../components/projects/ProjectsView";
import type { Note } from "../../components/notes/NoteEditor";
import type { AiResponse } from "./engine";
import { parseRecurrenceFromDescription } from "../recurrence";

// ─── LEVENSHTEIN & STRING SIMILARITY ──────────────────────────────────────────

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  if (s1.includes(s2)) return Math.min(1.0, (s2.length / s1.length) * 1.1);
  if (s2.includes(s1)) return Math.min(1.0, (s1.length / s2.length) * 1.1);

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1.0 - dist / maxLen);
}

// ─── TOKEN-LEVEL ENTITY MATCH SCORING ─────────────────────────────────────────

export function calculateEntityMatchScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (q === t) return 1.0;
  if (t.includes(q)) return 0.95;
  if (q.includes(t)) return 0.9;

  const qWords = q.split(/\s+/).filter((w) => w.length > 1);
  const tWords = t.split(/\s+/).filter((w) => w.length > 1);
  if (qWords.length === 0 || tWords.length === 0) return 0.0;

  let totalScore = 0;
  for (const qw of qWords) {
    let bestWordSim = 0;
    for (const tw of tWords) {
      const sim = stringSimilarity(qw, tw);
      if (sim > bestWordSim) bestWordSim = sim;
    }
    totalScore += bestWordSim;
  }

  const directSim = stringSimilarity(q, t);
  const tokenSim = totalScore / qWords.length;
  return Math.max(directSim, tokenSim);
}

export interface MatchResult<T> {
  match: T | null;
  confidence: "high" | "suggest" | "none";
  score: number;
  suggestions: { item: T; score: number }[];
}

export function matchEntityWithTypoTolerance<T extends { title?: string; name?: string }>(
  query: string,
  items: T[]
): MatchResult<T> {
  const scored = items
    .map((item) => {
      const name = item.title || item.name || "";
      const score = calculateEntityMatchScore(query, name);
      return { item, score };
    })
    .filter((s) => s.score > 0.25)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      match: null,
      confidence: "none",
      score: 0,
      suggestions: [],
    };
  }

  const best = scored[0];
  if (best.score >= 0.70) {
    return {
      match: best.item,
      confidence: "high",
      score: best.score,
      suggestions: scored.slice(1, 3),
    };
  }

  if (best.score >= 0.38) {
    return {
      match: best.item,
      confidence: "suggest",
      score: best.score,
      suggestions: scored.slice(0, 3),
    };
  }

  return {
    match: null,
    confidence: "none",
    score: best.score,
    suggestions: scored.slice(0, 2),
  };
}

// ─── TYPO NORMALIZER FOR INTENTS ─────────────────────────────────────────────

export function normalizeTypos(text: string): string {
  const corrections: [RegExp, string][] = [
    [/\b(complte|complet|cmplete|compelete|compleet|finsh|finsih|mrk as done)\b/gi, "complete"],
    [/\b(reschedul|reschedle|reschedulee|rescheudle|pospone|postpon)\b/gi, "reschedule"],
    [/\b(tmrw|tommorow|tomorow|tommorrow|tomrrow|2morrow)\b/gi, "tomorrow"],
    [/\b(tody|toda|2day)\b/gi, "today"],
    [/\b(urgnt|ugrent|urgetn|critcal)\b/gi, "urgent"],
    [/\b(priorty|priortiy|proirity)\b/gi, "priority"],
    [/\b(projct|prject|proejct|projk)\b/gi, "project"],
    [/\b(shortct|shortcts|shorcut|shrotcut|shrotcuts|hotkys)\b/gi, "shortcuts"],
    [/\b(overdu|overduee|ovrdue|pastdue)\b/gi, "overdue"],
    [/\b(agnda|agenad|schedle|scheudle)\b/gi, "schedule"],
    [/\b(deconstrct|deconstruct|brak down|brek down)\b/gi, "break down"],
    [/\b(subtaks|subtassks|cheklist|checklst)\b/gi, "subtasks"],
    [/\b(wokspace|workspce|wrkspace)\b/gi, "workspace"],
    [/\b(hygene|healt|helth|audt)\b/gi, "audit"],
  ];
  let res = text;
  for (const [pattern, rep] of corrections) {
    res = res.replace(pattern, rep);
  }
  return res;
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

function getStartOfToday(): number {
  return new Date().setHours(0, 0, 0, 0) / 1000;
}

function getEndOfToday(): number {
  return new Date().setHours(23, 59, 59, 999) / 1000;
}

function getTodayNoon(): number {
  return Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
}

function getTomorrowNoon(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function parseRelativeDate(text: string): number | null {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes("today") || lower.includes("tonight") || lower.includes("tody") || lower.includes("2day")) {
    return getTodayNoon();
  }
  if (lower.includes("tomorrow") || lower.includes("tmrw") || lower.includes("tomorow")) {
    return getTomorrowNoon();
  }

  // in X days
  const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(12, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }

  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < daysOfWeek.length; i++) {
    const day = daysOfWeek[i];
    if (lower.includes(day)) {
      const target = new Date();
      const currentDay = now.getDay();
      let diff = (i - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      target.setDate(now.getDate() + diff);
      target.setHours(12, 0, 0, 0);
      return Math.floor(target.getTime() / 1000);
    }
  }

  if (lower.includes("next week") || lower.includes("in a week") || lower.includes("in 1 week")) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(12, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }

  if (lower.includes("in 2 weeks")) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(12, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }

  return null;
}

// ─── DOMAIN SUBTASK BLUEPRINTS ───────────────────────────────────────────────

const DOMAIN_SUBTASK_BLUEPRINTS: { keywords: string[]; title: string; steps: string[] }[] = [
  {
    keywords: ["frontend", "ui", "ux", "landing page", "screen", "component", "tailwind", "responsive", "css", "layout"],
    title: "Frontend UI Component & Layout",
    steps: [
      "Review UI requirements & design specifications",
      "Set up component structure, props contract, and initial layout",
      "Implement responsive styling and theme tokens",
      "Wire interactive state, user feedback, and form validations",
      "Test responsiveness across window sizes and polish micro-interactions",
    ],
  },
  {
    keywords: ["backend", "api", "database", "endpoint", "crud", "migration", "schema", "rest", "sql", "server"],
    title: "Backend Service & API Implementation",
    steps: [
      "Design database schema, tables, and migration script",
      "Define request/response contracts and data models",
      "Implement core business logic and handler functions",
      "Add validation, authorization, and error handling",
      "Write integration tests and verify database queries",
    ],
  },
  {
    keywords: ["bug", "fix", "issue", "error", "crash", "debug", "broken", "refactor", "cleanup"],
    title: "Bug Triage & Resolution",
    steps: [
      "Reproduce error condition with minimal reproducible steps",
      "Trace execution stack and identify root cause in code",
      "Implement targeted fix preserving backwards compatibility",
      "Verify edge cases and regression scenarios",
      "Run build and test suite to ensure clean pass",
    ],
  },
  {
    keywords: ["exam", "study", "test", "quiz", "midterm", "final", "course", "lecture"],
    title: "High-Yield Study & Active Recall",
    steps: [
      "Review syllabus and identify core high-yield exam topics",
      "Create condensed active-recall flashcards / summaries",
      "Solve 3-5 real practice questions under timed conditions",
      "Analyze mistakes and re-review difficult concepts",
      "Conduct final confidence review 24 hours prior",
    ],
  },
  {
    keywords: ["paper", "essay", "thesis", "research", "article", "report", "write"],
    title: "Research & Document Drafting",
    steps: [
      "Outline core argument, thesis, and primary section headers",
      "Gather relevant citations, data sources, and literature",
      "Draft introduction, core methodology, and analysis",
      "Synthesize conclusions and format bibliography",
      "Proofread for clarity, tone, and grammar polish",
    ],
  },
  {
    keywords: ["meeting", "presentation", "deck", "slides", "pitch", "talk", "demo"],
    title: "Presentation & Meeting Execution",
    steps: [
      "Define primary objective and single key takeaway for audience",
      "Draft presentation narrative and slide outline",
      "Build visual slides with supporting data and diagrams",
      "Rehearse presentation timing and prepare Q&A talking points",
      "Send follow-up recap email with agreed action items",
    ],
  },
  {
    keywords: ["trip", "travel", "flight", "vacation", "packing", "hotel", "itinerary"],
    title: "Travel & Itinerary Planning",
    steps: [
      "Confirm dates and book transportation / flights",
      "Reserve lodging and central accommodations",
      "Draft day-by-day itinerary of key attractions & dining",
      "Prepare packing checklist for weather and destination",
      "Download offline maps and save tickets to device",
    ],
  },
  {
    keywords: ["clean", "organize", "declutter", "apartment", "room", "chores", "tidy"],
    title: "Deep Cleaning & Space Reset",
    steps: [
      "Clear all visible trash, laundry, and surface clutter",
      "Sort items into keep, donate, and discard piles",
      "Wipe down and sanitize all key surfaces and desks",
      "Vacuum / mop floors and empty all trash bins",
      "Reset desktop setup for a fresh work week",
    ],
  },
  {
    keywords: ["tax", "budget", "finance", "expense", "receipts", "money", "invest"],
    title: "Financial Review & Organization",
    steps: [
      "Download recent bank and credit card statements",
      "Categorize expenses and calculate savings rate",
      "Organize deductible receipts and financial documents",
      "Update budget allocations and forecast upcoming bills",
      "Archive finalized records into secure backup folder",
    ],
  },
  {
    keywords: ["workout", "fitness", "gym", "exercise", "run", "diet", "meal"],
    title: "Fitness & Training Plan",
    steps: [
      "Set weekly schedule (e.g. Mon/Wed/Fri focus days)",
      "Outline specific exercises, sets, and progression goals",
      "Prepare athletic gear and post-workout nutrition",
      "Execute warmup dynamic mobility drill",
      "Complete core routine and record weights in log",
    ],
  },
];

export function matchDomainSubtasks(prompt: string): { title: string; steps: string[] } {
  const lower = prompt.toLowerCase();
  for (const domain of DOMAIN_SUBTASK_BLUEPRINTS) {
    if (domain.keywords.some((kw) => lower.includes(kw))) {
      return { title: domain.title, steps: domain.steps };
    }
  }

  return {
    title: "Action Checklist",
    steps: [
      `Clarify scope, deliverables, and requirements for ${prompt}`,
      "Gather necessary tools, documents, and reference materials",
      "Execute the first core milestone or draft",
      "Review output against quality criteria and iterate",
      "Finalize, verify, and complete deliverable",
    ],
  };
}

// ─── NOTE TEMPLATE BLUEPRINTS ────────────────────────────────────────────────

function generateNoteTemplate(topic: string): { title: string; content: string } {
  const lower = topic.toLowerCase();
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (lower.includes("meeting") || lower.includes("sync") || lower.includes("standup")) {
    return {
      title: `${topic} (${dateStr})`,
      content: `# ${topic}
*Date: ${dateStr}*

## Attendees
- [ ] Person 1
- [ ] Person 2

## Agenda
1. Updates & Progress
2. Blockers & Discussion
3. Action Items

## Discussion Notes
- 

## Decisions Made
- 

## Action Items
- [ ] Task 1
- [ ] Task 2
`,
    };
  }

  if (lower.includes("1-on-1") || lower.includes("one on one")) {
    return {
      title: `1-on-1 Sync (${dateStr})`,
      content: `# 1-on-1 Sync Notes
*Date: ${dateStr}*

## Wins & Accomplishments
- 

## Top Challenges & Blockers
- 

## Career & Growth Focus
- 

## Action Items & Follow-ups
- [ ] 
`,
    };
  }

  if (lower.includes("spec") || lower.includes("rfc") || lower.includes("architecture")) {
    return {
      title: `Technical Spec: ${topic}`,
      content: `# Technical Spec: ${topic}
*Author: Engineering · Date: ${dateStr}*

## Problem Statement
What problem does this solve and why does it matter?

## Proposed Architecture
- Data Model changes:
- API contracts:
- Frontend layout:

## Alternatives Considered
- Option A vs Option B

## Rollout & Verification Plan
- [ ] Step 1
- [ ] Step 2
`,
    };
  }

  if (lower.includes("retro") || lower.includes("retrospective")) {
    return {
      title: `Sprint Retrospective (${dateStr})`,
      content: `# Sprint Retrospective
*Date: ${dateStr}*

## What Went Well
- Key win 1
- Key win 2

## What Could Be Improved
- Friction point 1
- Friction point 2

## Action Items for Next Sprint
- [ ] Action item 1
- [ ] Action item 2
`,
    };
  }

  if (lower.includes("bug") || lower.includes("incident") || lower.includes("issue")) {
    return {
      title: `Bug Report: ${topic}`,
      content: `# Bug Report: ${topic}
*Date: ${dateStr}*

## Summary
Brief description of unexpected behavior.

## Steps to Reproduce
1. Navigate to ...
2. Click on ...
3. Observe error ...

## Expected Behavior
What was expected to happen.

## Actual Behavior
What actually occurred (including logs).

## Fix Checklist
- [ ] Root cause verified
- [ ] Unit test written
- [ ] Fix deployed
`,
    };
  }

  return {
    title: topic,
    content: `# ${topic}
*Created on ${dateStr}*

## Overview
Summary of objectives and context for ${topic}.

## Key Points
- Point 1
- Point 2
- Point 3

## Next Steps
- [ ] Next action 1
- [ ] Next action 2
`,
  };
}

// ─── MAIN DETERMINISTIC INTENT ENGINE WITH TYPO TOLERANCE ─────────────────────

export function tryDeterministicIntent(
  rawPrompt: string,
  context: { tasks: Task[]; projects: Project[]; notes: Note[] },
  options?: { hasApiKey?: boolean }
): AiResponse | null {
  const prompt = normalizeTypos(rawPrompt);
  const q = prompt.toLowerCase().trim();

  const activeTasks = context.tasks.filter((t) => t.status !== "completed" && t.status !== "archived");
  const completedTasks = context.tasks.filter((t) => t.status === "completed");
  const todayStart = getStartOfToday();
  const todayEnd = getEndOfToday();
  const overdueTasks = activeTasks.filter((t) => t.due_date && t.due_date < todayStart);
  const todayTasks = activeTasks.filter((t) => t.due_date && t.due_date >= todayStart && t.due_date <= todayEnd);
  const urgentTasks = activeTasks.filter((t) => t.priority === "urgent");
  const highPriorityTasks = activeTasks.filter((t) => t.priority === "high");

  const getActiveTasksSummary = (limit = 4) => {
    if (activeTasks.length === 0) return "No active tasks in your workspace.";
    return activeTasks
      .slice(0, limit)
      .map((t, i) => `${i + 1}. **${t.title}** [${t.priority.toUpperCase()}]`)
      .join("\n");
  };

  const nowSeconds = Math.floor(Date.now() / 1000);

  // 0A. NEXT-ACTION RECOMMENDATION / WHAT SHOULD I WORK ON
  if (
    q.includes("what should i work on") ||
    q.includes("what should i do") ||
    q.includes("what do i work on") ||
    q.includes("what's my next task") ||
    q.includes("whats my next task") ||
    q.includes("next action") ||
    q.includes("pick a task") ||
    q.includes("what to do next") ||
    q.includes("next task")
  ) {
    if (activeTasks.length === 0) {
      return {
        source: "deterministic",
        content: `**No active tasks in your queue!**\n\nYour task backlog is completely clear. You can capture a new task (<kbd>Ctrl+Shift+N</kbd>) or brainstorm in Notes (<kbd>Alt+7</kbd>).`,
      };
    }

    const scoredTasks = activeTasks.map((t) => {
      let score = 0;
      const reasons: string[] = [];

      if (t.priority === "urgent") {
        score += 45;
        reasons.push("Marked Urgent");
      } else if (t.priority === "high") {
        score += 30;
        reasons.push("High Priority");
      } else if (t.priority === "medium") {
        score += 15;
      }

      if (t.due_date) {
        if (t.due_date < todayStart) {
          score += 50;
          reasons.push("Overdue");
        } else if (t.due_date <= todayEnd) {
          score += 35;
          reasons.push("Due Today");
        } else if (t.due_date <= todayEnd + 86400) {
          score += 20;
          reasons.push("Due Tomorrow");
        }
      }

      if (t.next_action) {
        score += 10;
        reasons.push("Clear Next Action Ready");
      }

      if (t.project_id) {
        score += 5;
      }

      return { task: t, score, reasons };
    });

    scoredTasks.sort((a, b) => b.score - a.score);
    const top = scoredTasks[0];
    const runnersUp = scoredTasks.slice(1, 3);
    const topProj = top.task.project_id ? context.projects.find((p) => p.id === top.task.project_id) : null;

    let rec = `### Recommended Next Action\n\n`;
    rec += `**Target Task**: **${top.task.title}** [${top.task.priority.toUpperCase()}]\n`;
    if (topProj) {
      rec += `- **Project**: ${topProj.name}\n`;
    }
    if (top.reasons.length > 0) {
      rec += `- **Rationale**: ${top.reasons.join(" · ")}\n`;
    }
    if (top.task.next_action) {
      rec += `- **Immediate Step**: *${top.task.next_action}*\n`;
    }
    if (top.task.due_date) {
      rec += `- **Target Deadline**: ${new Date(top.task.due_date * 1000).toLocaleDateString()}\n`;
    }

    if (runnersUp.length > 0) {
      rec += `\n**Runners-Up Alternatives:**\n`;
      runnersUp.forEach((r, idx) => {
        rec += `${idx + 1}. **${r.task.title}** [${r.task.priority.toUpperCase()}]\n`;
      });
    }

    rec += `\n*Recommendation*: Open the **Focus view** (<kbd>Alt+5</kbd>) and lock in a 25-minute sprint on **"${top.task.title}"**!`;

    return {
      source: "deterministic",
      content: rec,
      actionPayload: {
        type: "toggle_task",
        taskToggle: {
          taskId: top.task.id,
          taskTitle: top.task.title,
          nextStatus: "completed",
        },
      },
    };
  }

  // 0B. EISENHOWER MATRIX & PRIORITY TRIAGE
  if (
    q.includes("eisenhower") ||
    q.includes("matrix") ||
    q.includes("prioritize") ||
    q.includes("triage") ||
    (q.includes("sort") && (q.includes("priority") || q.includes("urgency")))
  ) {
    if (activeTasks.length === 0) {
      return {
        source: "deterministic",
        content: `**No active tasks to triage!**\n\nYour task queue is clear. Capture tasks with <kbd>Ctrl+Shift+N</kbd>.`,
      };
    }

    const q1: Task[] = [];
    const q2: Task[] = [];
    const q3: Task[] = [];
    const q4: Task[] = [];

    activeTasks.forEach((t) => {
      const isUrgent = t.priority === "urgent" || (t.due_date && t.due_date <= todayEnd);
      const isImportant = t.priority === "urgent" || t.priority === "high";

      if (isUrgent && isImportant) {
        q1.push(t);
      } else if (!isUrgent && isImportant) {
        q2.push(t);
      } else if (isUrgent && !isImportant) {
        q3.push(t);
      } else {
        q4.push(t);
      }
    });

    let matrix = `### Eisenhower Priority Matrix (${activeTasks.length} Active Tasks)\n\n`;

    matrix += `#### 1. Do First (Urgent & Important) - ${q1.length} tasks\n`;
    if (q1.length === 0) matrix += `*Clear - no urgent fires right now.*\n\n`;
    else {
      q1.slice(0, 4).forEach((t) => {
        matrix += `- **${t.title}** [${t.priority.toUpperCase()}]\n`;
      });
      matrix += `\n`;
    }

    matrix += `#### 2. Schedule (Important, Strategic) - ${q2.length} tasks\n`;
    if (q2.length === 0) matrix += `*No scheduled strategic tasks.*\n\n`;
    else {
      q2.slice(0, 4).forEach((t) => {
        matrix += `- **${t.title}** [${t.priority.toUpperCase()}]\n`;
      });
      matrix += `\n`;
    }

    matrix += `#### 3. Delegate / Quick Batch (Urgent, Less Critical) - ${q3.length} tasks\n`;
    if (q3.length === 0) matrix += `*No urgent maintenance items.*\n\n`;
    else {
      q3.slice(0, 4).forEach((t) => {
        matrix += `- **${t.title}**\n`;
      });
      matrix += `\n`;
    }

    matrix += `#### 4. Backlog (Low Priority) - ${q4.length} tasks\n`;
    if (q4.length === 0) matrix += `*No low priority backlog.*\n\n`;
    else {
      q4.slice(0, 3).forEach((t) => {
        matrix += `- ${t.title}\n`;
      });
      matrix += `\n`;
    }

    matrix += `*Triage Rule*: Work through Quadrant 1 first, then protect dedicated deep work time for Quadrant 2.`;
    return { source: "deterministic", content: matrix };
  }

  // 0C. BATCH OVERDUE RESCHEDULER
  if (
    (q.includes("reschedule") || q.includes("postpone") || q.includes("push") || q.includes("move") || q.includes("clean") || q.includes("fix")) &&
    q.includes("overdue")
  ) {
    if (overdueTasks.length === 0) {
      return {
        source: "deterministic",
        content: `**All clear!** You have no overdue tasks to reschedule.`,
      };
    }

    let out = `### Overdue Tasks Triage (${overdueTasks.length} overdue)\n\n`;
    overdueTasks.forEach((t, i) => {
      out += `${i + 1}. **${t.title}** [${t.priority.toUpperCase()}]\n`;
    });

    const leadOverdue = overdueTasks[0];
    const targetEpoch = getTodayNoon();

    out += `\nClick below to reschedule the lead overdue task **"${leadOverdue.title}"** to Today (12:00 PM), or visit Calendar (<kbd>Alt+8</kbd>) to drag all overdue items to new dates:`;

    return {
      source: "deterministic",
      content: out,
      actionPayload: {
        type: "reschedule_task",
        taskReschedule: {
          taskId: leadOverdue.id,
          taskTitle: leadOverdue.title,
          dueDateEpoch: targetEpoch,
        },
      },
    };
  }

  // 0D. HABITS & RECURRING TASKS
  if (
    q.includes("habit") ||
    q.includes("streak") ||
    q.includes("recurring") ||
    q.includes("repeating")
  ) {
    const recurringList = activeTasks
      .map((t) => {
        const info = parseRecurrenceFromDescription(t.description);
        return { task: t, recurrence: info.data };
      })
      .filter((item) => item.recurrence && item.recurrence.frequency !== "none");

    if (recurringList.length === 0) {
      return {
        source: "deterministic",
        content: `**No recurring tasks or habits set up yet.**\n\nTo create a recurring habit, expand any task in Tasks (<kbd>Alt+2</kbd>) and select a repeat interval (Daily, Mon-Fri, Weekly, etc.).`,
      };
    }

    let out = `### Active Habits & Recurring Routines (${recurringList.length})\n\n`;
    recurringList.forEach((r, idx) => {
      const streak = r.recurrence?.streak || 0;
      const streakLabel = streak > 0 ? `· Streak: **${streak}x**` : "";
      out += `${idx + 1}. **${r.task.title}** (${r.recurrence?.frequency}) ${streakLabel}\n`;
      if (r.task.due_date) {
        out += `   - Next due: ${new Date(r.task.due_date * 1000).toLocaleDateString()}\n`;
      }
    });

    out += `\n*Tip*: Completing recurring tasks automatically increments your streak and schedules the next date!`;
    return { source: "deterministic", content: out };
  }

  // 0E. WEEKLY PRODUCTIVITY VELOCITY REPORT
  if (
    q.includes("how did i do") ||
    q.includes("weekly summary") ||
    q.includes("weekly report") ||
    q.includes("weekly velocity") ||
    q.includes("velocity report") ||
    q.includes("productivity report")
  ) {
    const oneWeekAgo = nowSeconds - 7 * 86400;
    const completedThisWeek = context.tasks.filter(
      (t) => t.status === "completed" && t.completed_at && t.completed_at >= oneWeekAgo
    );
    const activeCount = activeTasks.length;
    const overdueCount = overdueTasks.length;
    const totalWeekTouches = completedThisWeek.length + activeCount;
    const velocityRate = totalWeekTouches > 0 ? Math.round((completedThisWeek.length / totalWeekTouches) * 100) : 0;

    let rep = `### Weekly Productivity Velocity Report\n\n`;
    rep += `- **Completed Tasks (Last 7 Days)**: **${completedThisWeek.length}**\n`;
    rep += `- **Remaining Active Queue**: **${activeCount}**\n`;
    rep += `- **Overdue Ratio**: **${overdueCount}** ${overdueCount > 0 ? "(Action Needed)" : "(All on Schedule)"}\n`;
    rep += `- **Weekly Completion Velocity**: **${velocityRate}%**\n\n`;

    if (completedThisWeek.length > 0) {
      rep += `**Completed Highlights:**\n`;
      completedThisWeek.slice(0, 4).forEach((t) => {
        rep += `- [x] **${t.title}**\n`;
      });
      rep += `\n`;
    }

    if (overdueCount === 0 && completedThisWeek.length >= 5) {
      rep += `**Velocity Assessment**: Outstanding focus! You are maintaining high completion velocity with zero overdue debt.\n`;
    } else if (overdueCount > 0) {
      rep += `**Recommendation**: Clear the ${overdueCount} overdue task(s) today or reschedule them to protect your schedule integrity.\n`;
    } else {
      rep += `**Recommendation**: Great steady pace! Use the **Focus timer** (<kbd>Alt+5</kbd>) to batch through your active priorities.\n`;
    }

    rep += `\nCheck the **Analytics view** (<kbd>Alt+6</kbd>) for graphical velocity charts and historical heatmaps!`;
    return { source: "deterministic", content: rep };
  }

  // 0F. EXPORT & DATA PORTABILITY
  if (
    q.includes("export to csv") ||
    q.includes("export csv") ||
    q.includes("backup workspace") ||
    q.includes("backup database") ||
    q.includes("export tasks") ||
    q.includes("export notes") ||
    (q.includes("how to") && q.includes("export"))
  ) {
    return {
      source: "deterministic",
      content: `### Data Portability & Workspace Backups\n\n` +
        `Laya provides 100% offline data portability with zero cloud lock-in:\n\n` +
        `1. **CSV Spreadsheets**: Export Tasks, Projects, or Notes to standard RFC 4180 CSV files (openable in Excel, Numbers, Google Sheets).\n` +
        `2. **Full Workspace JSON**: Export a complete relational snapshot of all workspaces, projects, notes, and task hierarchies.\n` +
        `3. **Atomic SQLite Snapshots**: Instant atomic database backup with zero downtime.\n` +
        `4. **Note Publishing**: In any note (<kbd>Alt+7</kbd>), click the **Export** button to generate styled printable PDFs or Markdown downloads.\n\n` +
        `Access all backup and export tools in **Settings > Workspace & Data** (<kbd>Ctrl+,</kbd>)!`,
    };
  }

  // 0G. AMBIENT SOUND STUDIO
  if (
    q.includes("ambient sound") ||
    q.includes("sound studio") ||
    q.includes("play rain") ||
    q.includes("binaural") ||
    q.includes("brown noise") ||
    q.includes("focus sound")
  ) {
    return {
      source: "deterministic",
      content: `### Multi-Track Soundscape Studio\n\n` +
        `Laya includes a 100% offline procedural ambient audio synthesizer in the **Focus view** (<kbd>Alt+5</kbd>):\n\n` +
        `- **Rain & Drizzle**: Filtered pink noise for deep calm.\n` +
        `- **40Hz Gamma Focus**: Binaural beat (200Hz / 240Hz) for deep problem solving.\n` +
        `- **Deep Brown Noise**: 1/f^2 acoustic masking for noisy environments.\n` +
        `- **Ocean Waves**: Rhythmic 0.1Hz modulated swells.\n` +
        `- **Campfire Embers**: Low triangle rumble with random crackles.\n` +
        `- **Forest Breeze**: Resonant wind bandpass.\n\n` +
        `Open **Focus** (<kbd>Alt+5</kbd>) and click **Studio** to layer tracks and adjust channel volumes!`,
    };
  }

  // 1. GREETING & CAPABILITIES
  if (/^(hi|hello|hey|greetings|who are you|what can you do|help me|sammi)\b/.test(q)) {
    return {
      source: "deterministic",
      content: `Hello! I'm **Sammi**, your focused workspace co-pilot in Laya.

I operate with instant deterministic intelligence across your workspace:
- **Today's Agenda**: *"What do I have to do today?"*
- **Workload Audit**: *"Show my overdue and urgent tasks"*
- **Goal Breakdown**: *"Break down [project/goal]"* for an instant checklist
- **Fast Task Capture**: *"Add task 'Call John' due tomorrow urgent"*
- **Complete Task**: *"Mark 'Prepare report' as done"*
- **Reschedule**: *"Reschedule 'Wireframes' to Friday"*
- **Note Blueprints**: *"Draft meeting note for Sprint Review"*
- **Daily Focus Flow**: *"Plan my day"* to get a time-blocked schedule

*(I also understand typos like 'complte', 'reschedle', 'tmrw', etc.!)*`,
    };
  }

  // 2. COMPLETE TASK / MARK AS DONE
  const completeMatch = q.match(/^(?:complete|finish|mark|check off|done with)\s+(?:task\s+)?(.+?)(?:\s+(?:as\s+)?(?:done|completed))?$/i);
  if (completeMatch && !q.includes("what did i") && !q.includes("show completed") && !q.includes("how many")) {
    const rawTarget = completeMatch[1].trim();
    const result = matchEntityWithTypoTolerance(rawTarget, activeTasks);

    if (result.confidence === "high" && result.match) {
      return {
        source: "deterministic",
        content: `I found the task **"${result.match.title}"** [${result.match.priority.toUpperCase()}]. Click below to mark it as completed:`,
        actionPayload: {
          type: "toggle_task",
          taskToggle: {
            taskId: result.match.id,
            taskTitle: result.match.title,
            nextStatus: "completed",
          },
        },
      };
    }

    if (result.confidence === "suggest" && result.match) {
      return {
        source: "deterministic",
        content: `I couldn't find an exact task for **"${rawTarget}"**. Did you mean: **"${result.match.title}"**?

Click below if you want to complete this task:`,
        actionPayload: {
          type: "toggle_task",
          taskToggle: {
            taskId: result.match.id,
            taskTitle: result.match.title,
            nextStatus: "completed",
          },
        },
      };
    }

    return {
      source: "deterministic",
      content: `I couldn't find any active task matching **"${rawTarget}"**.

Here are your active tasks:
${getActiveTasksSummary()}`,
    };
  }

  // 3. RESCHEDULE TASK
  const rescheduleMatch = q.match(/^(?:reschedule|move|postpone)\s+(?:task\s+)?(.+?)(?:\s+to\s+(.+))?$/i);
  if (rescheduleMatch) {
    const rawTarget = rescheduleMatch[1].trim();
    const rawDate = rescheduleMatch[2]?.trim() || "tomorrow";
    const targetEpoch = parseRelativeDate(rawDate) || getTomorrowNoon();
    const dateStr = new Date(targetEpoch * 1000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const result = matchEntityWithTypoTolerance(rawTarget, activeTasks);

    if (result.confidence === "high" && result.match) {
      return {
        source: "deterministic",
        content: `I found the task **"${result.match.title}"**. Click below to reschedule it to **${dateStr}**:`,
        actionPayload: {
          type: "reschedule_task",
          taskReschedule: {
            taskId: result.match.id,
            taskTitle: result.match.title,
            dueDateEpoch: targetEpoch,
          },
        },
      };
    }

    if (result.confidence === "suggest" && result.match) {
      return {
        source: "deterministic",
        content: `I couldn't find an exact task for **"${rawTarget}"**. Did you mean: **"${result.match.title}"**?

Click below to reschedule it to **${dateStr}**:`,
        actionPayload: {
          type: "reschedule_task",
          taskReschedule: {
            taskId: result.match.id,
            taskTitle: result.match.title,
            dueDateEpoch: targetEpoch,
          },
        },
      };
    }

    return {
      source: "deterministic",
      content: `I couldn't find any active task matching **"${rawTarget}"** to reschedule.

Here are your active tasks:
${getActiveTasksSummary()}`,
    };
  }

  // 4. UPDATE TASK PRIORITY
  const priorityMatch = q.match(/^(?:make|set|change)\s+(?:priority\s+of\s+)?(?:task\s+)?(.+?)(?:\s+(?:to\s+)?(urgent|high|medium|low))$/i);
  if (priorityMatch) {
    const rawTarget = priorityMatch[1].trim();
    const newPriority = priorityMatch[2].toLowerCase() as "low" | "medium" | "high" | "urgent";
    const result = matchEntityWithTypoTolerance(rawTarget, activeTasks);

    if (result.confidence === "high" && result.match) {
      return {
        source: "deterministic",
        content: `Update priority of **"${result.match.title}"** to **${newPriority.toUpperCase()}**:`,
        actionPayload: {
          type: "update_priority",
          taskPriority: {
            taskId: result.match.id,
            taskTitle: result.match.title,
            priority: newPriority,
          },
        },
      };
    }

    if (result.confidence === "suggest" && result.match) {
      return {
        source: "deterministic",
        content: `I couldn't find an exact task for **"${rawTarget}"**. Did you mean: **"${result.match.title}"**?

Click below to update its priority to **${newPriority.toUpperCase()}**:`,
        actionPayload: {
          type: "update_priority",
          taskPriority: {
            taskId: result.match.id,
            taskTitle: result.match.title,
            priority: newPriority,
          },
        },
      };
    }

    return {
      source: "deterministic",
      content: `I couldn't find any active task matching **"${rawTarget}"** to change priority.

Here are your active tasks:
${getActiveTasksSummary()}`,
    };
  }

  // 5. CREATE PROJECT
  const createProjMatch = q.match(/^(?:create|add|new|start)\s+project(?:\s+(?:called|named))?\s+(.+)/i);
  if (createProjMatch) {
    const projName = createProjMatch[1].trim();
    const cleanName = projName.charAt(0).toUpperCase() + projName.slice(1);

    return {
      source: "deterministic",
      content: `I've prepared a new project notebook for **"${cleanName}"**. Click below to add it to your workspace:`,
      actionPayload: {
        type: "create_project",
        project: {
          name: cleanName,
          color: "emerald",
        },
      },
    };
  }

  // 6. TASK CREATION
  const addTaskMatch = q.match(/^(?:add|create|make|schedule|remind me to|log|new)\s+(?:a\s+)?task(?:\s+(?:called|named|for|to))?\s+(.+)/i);
  if (addTaskMatch) {
    const rawSubject = addTaskMatch[1].trim();

    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    if (/\b(urgent|critical|p0)\b/i.test(rawSubject)) priority = "urgent";
    else if (/\b(high|important|p1)\b/i.test(rawSubject)) priority = "high";
    else if (/\b(low|someday|p3)\b/i.test(rawSubject)) priority = "low";

    const dueDateEpoch = parseRelativeDate(rawSubject) || getTodayNoon();

    let cleanTitle = rawSubject
      .replace(/\b(urgent|critical|high priority|medium priority|low priority)\b/gi, "")
      .replace(/\b(due today|due tomorrow|today|tomorrow|by friday|next week)\b/gi, "")
      .trim()
      .replace(/^(to\s+|for\s+)/i, "");

    if (!cleanTitle) cleanTitle = rawSubject;
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    const blueprint = matchDomainSubtasks(cleanTitle);

    return {
      source: "deterministic",
      content: `I've prepared a new task card for you: **"${cleanTitle}"** (${priority.toUpperCase()}, due ${new Date(dueDateEpoch * 1000).toLocaleDateString()}).

Click below to commit it directly to your workspace:`,
      actionPayload: {
        type: "create_task",
        task: {
          title: cleanTitle,
          priority,
          dueDateEpoch,
          subtasks: blueprint.steps.slice(0, 4),
        },
      },
    };
  }

  // 7. TODAY'S TASKS & AGENDA
  if (
    q.includes("today") &&
    (q.includes("task") || q.includes("agenda") || q.includes("do i have") || q.includes("schedule") || q.includes("list") || q.includes("what"))
  ) {
    if (todayTasks.length === 0 && overdueTasks.length === 0) {
      return {
        source: "deterministic",
        content: `**Your schedule is wide open for today!**

You have **0 tasks scheduled for today** and no overdue backlog.
Total active tasks in workspace: **${activeTasks.length}**.

Would you like to plan a task or review your projects?`,
      };
    }

    let out = `### Today's Agenda (${todayTasks.length} scheduled, ${overdueTasks.length} overdue)\n\n`;

    if (overdueTasks.length > 0) {
      out += `**Overdue (${overdueTasks.length} items to address first):**\n`;
      overdueTasks.slice(0, 5).forEach((t) => {
        const pBadge = t.priority === "urgent" ? "[URGENT]" : t.priority === "high" ? "[HIGH]" : "[NORMAL]";
        out += `- ${pBadge} **${t.title}** (was due ${new Date((t.due_date || 0) * 1000).toLocaleDateString()})\n`;
      });
      out += "\n";
    }

    if (todayTasks.length > 0) {
      out += `**Due Today (${todayTasks.length}):**\n`;
      todayTasks.forEach((t, i) => {
        const pBadge = t.priority === "urgent" ? "Urgent" : t.priority === "high" ? "High" : "Normal";
        out += `${i + 1}. **${t.title}** [${pBadge}]\n`;
      });
    }

    out += `\n**Focus Recommendation**: Start with the highest-priority item above. Use the **Focus timer** (<kbd>Alt+5</kbd>) to lock in a 25-minute sprint!`;
    return { source: "deterministic", content: out };
  }

  // 8. OVERDUE TASKS
  if (q.includes("overdue") || q.includes("late") || q.includes("past due") || q.includes("missed")) {
    if (overdueTasks.length === 0) {
      return {
        source: "deterministic",
        content: `**Zero overdue tasks!** All your scheduled tasks are on time or in the future. Great job maintaining workspace momentum!`,
      };
    }

    const list = overdueTasks.map((t, idx) => {
      const days = Math.floor((todayStart - (t.due_date || 0)) / 86400);
      const daysStr = days === 1 ? "1 day ago" : `${days} days ago`;
      return `${idx + 1}. **${t.title}** - *Was due ${daysStr} [${t.priority.toUpperCase()}]*`;
    }).join("\n");

    return {
      source: "deterministic",
      content: `### Overdue Tasks (${overdueTasks.length})\n\n${list}\n\nJump to the **Calendar tab** (<kbd>Alt+8</kbd>) to reschedule these by dragging them to today!`,
    };
  }

  // 9. URGENT & HIGH PRIORITY TASKS
  if (q.includes("urgent") || q.includes("high priority") || q.includes("top priority") || q.includes("critical")) {
    const important = [...urgentTasks, ...highPriorityTasks];
    if (important.length === 0) {
      return {
        source: "deterministic",
        content: `You currently have **0 urgent or high-priority tasks**. All ${activeTasks.length} active tasks are marked as normal or low priority.`,
      };
    }

    const list = important.map((t, i) => {
      const tag = t.priority === "urgent" ? "URGENT" : "HIGH";
      const due = t.due_date ? `Due: ${new Date(t.due_date * 1000).toLocaleDateString()}` : "No deadline";
      return `${i + 1}. [${tag}] **${t.title}** (${due})`;
    }).join("\n");

    return {
      source: "deterministic",
      content: `### Urgent & High Priority Tasks (${important.length})\n\n${list}\n\nThese represent your most impactful deliverables right now.`,
    };
  }

  // 10. COMPLETED TASKS & PRODUCTIVITY SUMMARY
  if (q.includes("completed") || q.includes("done") || q.includes("finished") || q.includes("what did i do") || q.includes("accomplish")) {
    const completedToday = completedTasks.filter((t) => t.updated_at >= todayStart);
    const total = context.tasks.length;
    const rate = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;

    let out = `### Completion & Progress Report\n\n`;
    out += `- **Completed Today**: ${completedToday.length} task(s)\n`;
    out += `- **All-Time Completed**: ${completedTasks.length} task(s)\n`;
    out += `- **Completion Rate**: ${rate}% of all tracked tasks\n\n`;

    if (completedToday.length > 0) {
      out += `**Finished Today:**\n`;
      completedToday.slice(0, 8).forEach((t) => {
        out += `- ~~${t.title}~~ [Completed]\n`;
      });
    }

    out += `\nCheck the **Analytics tab** (<kbd>Alt+6</kbd>) for your 7-day velocity chart!`;
    return { source: "deterministic", content: out };
  }

  // 11. GOAL & TASK BREAKDOWN (Skipped if API key is present so Sammi AI manages it)
  if (
    !options?.hasApiKey &&
    (q.includes("break down") ||
      q.includes("deconstruct") ||
      q.includes("subtask") ||
      q.includes("checklist for") ||
      q.includes("steps for") ||
      q.includes("how do i do") ||
      q.includes("plan for"))
  ) {
    const targetGoal = prompt
      .replace(/(?:can you\s+)?(?:please\s+)?(?:break down|deconstruct|generate subtasks for|give me steps for|checklist for|steps for|plan for)\s*/i, "")
      .trim() || "Your Goal";

    const blueprint = matchDomainSubtasks(targetGoal);

    return {
      source: "deterministic",
      content: `### Action Checklist for "${targetGoal}"\n\n${blueprint.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nClick below to create this task with all subtasks attached:`,
      actionPayload: {
        type: "create_task",
        task: {
          title: targetGoal,
          priority: "medium",
          dueDateEpoch: getTodayNoon(),
          subtasks: blueprint.steps,
        },
      },
    };
  }

  // 12. DAY PLANNING & TIME-BLOCKING FOCUS FLOW
  if (
    q.includes("plan my day") ||
    q.includes("plan today") ||
    q.includes("daily plan") ||
    q.includes("focus flow") ||
    q.includes("what should i work on") ||
    q.includes("how should i spend my day")
  ) {
    if (activeTasks.length === 0) {
      return {
        source: "deterministic",
        content: `**Your workspace has no pending tasks right now!**\n\nEnjoy your clear schedule, or tell me *"Add task [name]"* to schedule something new.`,
      };
    }

    const sorted = [...activeTasks].sort((a, b) => {
      const isOverdueA = a.due_date && a.due_date < todayStart ? 1 : 0;
      const isOverdueB = b.due_date && b.due_date < todayStart ? 1 : 0;
      if (isOverdueA !== isOverdueB) return isOverdueB - isOverdueA;

      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const block1 = sorted[0];
    const block2 = sorted[1];
    const block3 = sorted.slice(2, 5);

    let plan = `### Time-Blocked Daily Focus Plan\n\n`;
    if (block1) {
      plan += `**1. Morning Deep Work Sprint (9:00 AM – 11:30 AM)**\n`;
      plan += `**Tackle Lead Priority**: **${block1.title}** [${block1.priority.toUpperCase()}]\n`;
      plan += `*Set 2 Pomodoro focus sessions with zero distractions.*\n\n`;
    }

    if (block2) {
      plan += `**2. Afternoon Execution Block (1:00 PM – 3:30 PM)**\n`;
      plan += `**Secondary Focus**: **${block2.title}** [${block2.priority.toUpperCase()}]\n`;
      plan += `*Momentum builder block to push core deliverables forward.*\n\n`;
    }

    if (block3.length > 0) {
      plan += `**3. Wrap-up & Administrative Sprint (4:00 PM – 5:00 PM)**\n`;
      block3.forEach((t) => {
        plan += `- **${t.title}**\n`;
      });
      plan += `*Clear small items, review notes, and set tomorrow's priorities.*\n\n`;
    }

    plan += `Open the **Focus view** (<kbd>Alt+5</kbd>) to start your first session timer!`;
    return { source: "deterministic", content: plan };
  }

  // 13. DRAFT NOTE / CREATE NOTE
  if (q.includes("note") && (q.includes("draft") || q.includes("create") || q.includes("write") || q.includes("new note"))) {
    const noteSubject = prompt
      .replace(/(?:draft|create|write|make|new)\s+(?:a\s+)?note(?:\s+(?:about|on|for))?\s*/i, "")
      .trim() || "Workspace Brainstorm";

    const template = generateNoteTemplate(noteSubject);

    return {
      source: "deterministic",
      content: `I've prepared a structured Markdown note blueprint for **"${template.title}"**. Click below to save it directly to your Notes workspace:`,
      actionPayload: {
        type: "create_note",
        note: {
          title: template.title,
          content: template.content,
          color: "amber",
        },
      },
    };
  }

  // 14. PROJECT QUERIES & INVENTORIES
  if (q.includes("project") || q.includes("projects")) {
    if (context.projects.length === 0) {
      return {
        source: "deterministic",
        content: `You don't have any projects created in this workspace yet. You can create projects in the **Projects tab** (<kbd>Alt+4</kbd>)!`,
      };
    }

    const rawTarget = prompt.replace(/(?:how is|status of|show|about|project|projects|tell me about)\s*/gi, "").trim();
    if (rawTarget.length > 2) {
      const pResult = matchEntityWithTypoTolerance(rawTarget, context.projects);
      if ((pResult.confidence === "high" || pResult.confidence === "suggest") && pResult.match) {
        const specificProj = pResult.match;
        const projTasks = context.tasks.filter((t) => t.project_id === specificProj.id);
        const projActive = projTasks.filter((t) => t.status !== "completed" && t.status !== "archived");
        const projCompleted = projTasks.filter((t) => t.status === "completed");
        const projNotes = context.notes.filter((n) => n.project_id === specificProj.id);
        const pct = projTasks.length > 0 ? Math.round((projCompleted.length / projTasks.length) * 100) : 0;

        let summary = `### Project: ${specificProj.name}\n\n`;
        if (pResult.confidence === "suggest") {
          summary = `*(Matched nearest project: **${specificProj.name}**)*\n\n` + summary;
        }
        summary += `- **Status**: ${specificProj.status.toUpperCase()}\n`;
        summary += `- **Progress**: ${pct}% complete (${projCompleted.length}/${projTasks.length} tasks)\n`;
        summary += `- **Attached Notes**: ${projNotes.length} note(s)\n\n`;

        if (projActive.length > 0) {
          summary += `**Active Tasks:**\n`;
          projActive.slice(0, 5).forEach((t) => {
            summary += `- [${t.priority.toUpperCase()}] **${t.title}**\n`;
          });
        } else {
          summary += `No pending tasks for this project!\n`;
        }

        return { source: "deterministic", content: summary };
      }
    }

    let list = `### Active Projects (${context.projects.length})\n\n`;
    context.projects.forEach((p, idx) => {
      const count = context.tasks.filter((t) => t.project_id === p.id && t.status !== "completed").length;
      list += `${idx + 1}. **${p.name}** - *${count} active tasks* (${p.status})\n`;
    });
    list += `\nAsk me *"How is [Project Name] doing?"* for a deep dive!`;
    return { source: "deterministic", content: list };
  }

  // 15. SEARCH & NOTE QUERIES
  if (q.includes("find note") || q.includes("search note") || q.includes("notes on") || q.includes("my notes")) {
    if (context.notes.length === 0) {
      return {
        source: "deterministic",
        content: "You don't have any notes saved yet. Tell me *'Draft a note about [topic]'* to start!",
      };
    }

    const keyword = prompt.replace(/(?:find|search|show|list)\s+(?:all\s+)?notes?(?:\s+(?:about|for|on))?\s*/i, "").trim().toLowerCase();
    let matches = keyword
      ? context.notes.filter((n) => n.title.toLowerCase().includes(keyword) || n.content.toLowerCase().includes(keyword))
      : context.notes.slice(0, 6);

    if (matches.length === 0 && keyword.length > 2) {
      const nResult = matchEntityWithTypoTolerance(keyword, context.notes);
      if (nResult.match) {
        matches = [nResult.match];
      }
    }

    if (matches.length === 0) {
      return {
        source: "deterministic",
        content: `No notes matched the search term **"${keyword}"**.\n\nHere are your available notes:\n` +
          context.notes.slice(0, 4).map((n) => `- **${n.title || "Untitled"}**`).join("\n"),
      };
    }

    let out = `### Notes (${matches.length} matching):\n\n`;
    matches.slice(0, 6).forEach((n) => {
      const snippet = n.content.slice(0, 80).replace(/\n/g, " ") || "Empty note";
      out += `- **${n.title || "Untitled Note"}**: *${snippet}*\n`;
    });
    out += `\nJump to the **Notes view** (<kbd>Alt+7</kbd>) to read or edit these notes!`;
    return { source: "deterministic", content: out };
  }

  // 16. WORKSPACE AUDIT & HYGIENE
  if (q.includes("audit") || q.includes("hygiene") || q.includes("health") || q.includes("clean") || q.includes("status")) {
    const unprioritized = activeTasks.filter((t) => t.priority === "medium" && !t.due_date);
    const staleTasks = activeTasks.filter((t) => Date.now() / 1000 - t.created_at > 14 * 86400);

    let audit = `### Workspace Diagnostic Audit\n\n`;
    audit += `- **Active Tasks**: ${activeTasks.length}\n`;
    audit += `- **Overdue Tasks**: ${overdueTasks.length} ${overdueTasks.length > 0 ? "(Attention Required)" : "(All Clear)"}\n`;
    audit += `- **Urgent Tasks**: ${urgentTasks.length}\n`;
    audit += `- **Unscheduled Tasks**: ${unprioritized.length}\n`;
    audit += `- **Completed Tasks**: ${completedTasks.length}\n`;
    audit += `- **Projects**: ${context.projects.length}\n`;
    audit += `- **Notes**: ${context.notes.length}\n\n`;

    if (overdueTasks.length > 0) {
      audit += `**Recommended Fix**: Visit the Calendar (<kbd>Alt+8</kbd>) to drag overdue tasks into today.\n`;
    }
    if (staleTasks.length > 0) {
      audit += `**Stale Backlog**: You have ${staleTasks.length} tasks created over 2 weeks ago without completion.\n`;
    }
    if (overdueTasks.length === 0 && staleTasks.length === 0) {
      audit += `**Status**: Workspace hygiene is in optimal condition!\n`;
    }

    return { source: "deterministic", content: audit };
  }

  // 17. SHORTCUTS & HELP
  if (q.includes("shortcut") || q.includes("hotkey") || q.includes("keybind") || q.includes("how to use") || q.includes("navigation")) {
    return {
      source: "deterministic",
      content: `### Laya Global Shortcut Guide

| Action | Shortcut |
| :--- | :--- |
| **Command Palette** | <kbd>Ctrl+K</kbd> |
| **Quick Task Capture** | <kbd>Ctrl+Shift+N</kbd> |
| **Dashboard** | <kbd>Alt+1</kbd> |
| **Tasks Workspace** | <kbd>Alt+2</kbd> |
| **Kanban Board** | <kbd>Alt+3</kbd> |
| **Projects** | <kbd>Alt+4</kbd> |
| **Focus Timer** | <kbd>Alt+5</kbd> |
| **Analytics & Velocity** | <kbd>Alt+6</kbd> |
| **Notes & Scratchpad** | <kbd>Alt+7</kbd> |
| **Calendar View** | <kbd>Alt+8</kbd> |
| **Sammi AI** | <kbd>Alt+9</kbd> |
| **Settings** | <kbd>Ctrl+,</kbd> |

You can customize every shortcut in **Settings > Shortcuts**!`,
    };
  }

  return null;
}