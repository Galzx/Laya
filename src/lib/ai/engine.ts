import type { Task } from "../../components/tasks/TasksView";
import type { Project } from "../../components/projects/ProjectsView";
import type { Note } from "../../components/notes/NoteEditor";
import type { AiProviderConfig, ChatMessage, ActionPayload } from "./types";
import { tryDeterministicIntent, matchDomainSubtasks } from "./deterministic";
import { getAiConfig } from "./storage";

export interface AiResponse {
  content: string;
  actionPayload?: ActionPayload;
  source?: "deterministic" | "gemini" | "ollama";
}

export interface DeconstructResult {
  title: string;
  steps: string[];
  source: "gemini" | "ollama" | "deterministic";
  model?: string;
  error?: string;
}

export function serializeWorkspaceContext(
  tasks: Task[],
  projects: Project[],
  notes: Note[],
  query?: string
): string {
  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const todayStart = new Date().setHours(0, 0, 0, 0) / 1000;
  const overdueTasks = activeTasks.filter((t) => t.due_date && t.due_date < todayStart);
  const todayTasks = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date * 1000);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  // Relevance sorting if query is present
  let sortedTasks = [...activeTasks];
  if (query) {
    const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    sortedTasks.sort((a, b) => {
      const aMatches = qWords.filter((w) => a.title.toLowerCase().includes(w)).length;
      const bMatches = qWords.filter((w) => b.title.toLowerCase().includes(w)).length;
      return bMatches - aMatches;
    });
  }

  const taskLines = sortedTasks.slice(0, 20).map((t) => {
    const proj = projects.find((p) => p.id === t.project_id);
    const dueStr = t.due_date ? new Date(t.due_date * 1000).toLocaleDateString() : "No deadline";
    return `- [${t.priority.toUpperCase()}] ${t.title} (${t.status}, due: ${dueStr}${proj ? `, project: ${proj.name}` : ""})`;
  });

  const noteLines = notes.slice(0, 10).map((n) => {
    return `- "${n.title || "Untitled"}" (${n.content.slice(0, 60).replace(/\n/g, " ")}...)`;
  });

  const projectLines = projects.map((p) => `- ${p.name} (status: ${p.status})`);

  return `Current Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
Workspace Overview:
- Active tasks: ${activeTasks.length} (${overdueTasks.length} overdue, ${todayTasks.length} due today, ${completedTasks.length} completed)
- Projects: ${projects.length}
- Notes: ${notes.length}

Key Active Tasks:
${taskLines.length ? taskLines.join("\n") : "No pending tasks."}

Active Projects:
${projectLines.length ? projectLines.join("\n") : "No projects defined."}

Recent Notes:
${noteLines.length ? noteLines.join("\n") : "No notes yet."}`;
}

// ─── CONNECTION TESTER ───────────────────────────────────────────────────────

export async function testAiConnection(
  config: AiProviderConfig
): Promise<{ ok: boolean; message: string }> {
  if (config.provider === "offline") {
    return { ok: true, message: "Offline Heuristic Engine is ready (0ms latency, 100% private)." };
  }

  if (config.provider === "gemini") {
    const key = config.geminiApiKey?.trim();
    if (!key) {
      return { ok: false, message: "Please provide a Google Gemini API key." };
    }
    const model = config.geminiModel || "gemini-3.6-flash";
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Respond with 'OK'." }] }],
          }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${res.status}`;
        return { ok: false, message: `Gemini API error: ${errMsg}` };
      }
      return { ok: true, message: `Successfully connected to Gemini API (${model})!` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Network error connecting to Gemini: ${msg}` };
    }
  }

  if (config.provider === "ollama") {
    const endpoint = (config.ollamaEndpoint || "http://localhost:11434").replace(/\/$/, "");
    try {
      const res = await fetch(`${endpoint}/api/tags`, { method: "GET" });
      if (!res.ok) {
        return { ok: false, message: `Ollama error HTTP ${res.status}` };
      }
      const data = await res.json();
      const models = (data.models || []).map((m: { name: string }) => m.name).join(", ");
      return {
        ok: true,
        message: `Connected to Ollama! Available models: ${models || "none found"}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        message: `Could not reach Ollama at ${endpoint}. Make sure 'ollama serve' is running. (${msg})`,
      };
    }
  }

  return { ok: true, message: "Ready." };
}

// ─── OFFLINE SMART HEURISTIC RESPONDER ──────────────────────────────────────

function generateOfflineResponse(
  prompt: string,
  context: { tasks: Task[]; projects: Project[]; notes: Note[] }
): AiResponse {
  const q = prompt.toLowerCase().trim();
  const todayNoonEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
  const activeTasks = context.tasks.filter((t) => t.status !== "completed" && t.status !== "archived");
  const todayStart = new Date().setHours(0, 0, 0, 0) / 1000;
  const overdue = activeTasks.filter((t) => t.due_date && t.due_date < todayStart);
  const highPriority = activeTasks.filter((t) => t.priority === "urgent" || t.priority === "high");

  // 1. GREETINGS & INTRODUCTIONS
  if (/^(hi|hello|hey|who are you|sammi)\b/.test(q)) {
    return {
      content: `Hello! I'm **Sammi**, your focused workspace co-pilot in Laya.

I can help you:
- **Prioritize your day**: Ask *"What should I work on today?"*
- **Audit your workload**: Ask *"Show my overdue or urgent tasks"*
- **Deconstruct goals**: Ask *"Break down [project/goal]"* to get a step-by-step checklist
- **Capture tasks & notes**: Tell me *"Create a task..."* or *"Draft a note about..."*

How can I assist your focus right now?`,
    };
  }

  // 2. FOCUS & DAILY PLANNING
  if (q.includes("focus") || q.includes("work on") || q.includes("plan today") || q.includes("schedule")) {
    if (activeTasks.length === 0) {
      return {
        content: `**Your workspace is completely clear!**

You have no pending tasks right now. Would you like to create a new task or draft a note for an upcoming project?`,
      };
    }

    const priorityItems = activeTasks
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 4);

    const planList = priorityItems
      .map((t, idx) => {
        const badge = t.priority === "urgent" ? "Urgent" : t.priority === "high" ? "High" : "Medium";
        return `${idx + 1}. **${t.title}** (${badge}) · *Focus block recommendation: 25-45 mins*`;
      })
      .join("\n");

    return {
      content: `Here is your recommended **Daily Focus Plan** based on your workspace priorities:

${planList}

**Productivity Tip**: Start with your highest priority task first thing in the morning when your cognitive energy is peak. Use the **Focus timer** (<kbd>Alt+5</kbd>) to lock in a 25-minute Pomodoro sprint!`,
    };
  }

  // 3. OVERDUE & WORKSPACE AUDIT
  if (q.includes("overdue") || q.includes("urgent") || q.includes("audit") || q.includes("status")) {
    if (overdue.length === 0 && highPriority.length === 0) {
      return {
        content: `**Excellent workspace hygiene!**

You have **0 overdue tasks** and all high-priority items are on schedule. Total pending tasks: **${activeTasks.length}**.`,
      };
    }

    let report = `### Workspace Diagnostic Audit\n\n`;
    if (overdue.length > 0) {
      report += `**Overdue Items (${overdue.length}):**\n` +
        overdue.map((t) => `- **${t.title}** (Was due: ${new Date((t.due_date || 0) * 1000).toLocaleDateString()})`).join("\n") + "\n\n";
    }
    if (highPriority.length > 0) {
      report += `**High & Urgent Priority Tasks (${highPriority.length}):**\n` +
        highPriority.map((t) => `- **${t.title}** [${t.priority.toUpperCase()}]`).join("\n");
    }

    return {
      content: report + `\n\nVisit the **Calendar tab** (<kbd>Alt+8</kbd>) or **Kanban board** (<kbd>Alt+3</kbd>) to quickly reschedule overdue tasks!`,
    };
  }

  // 4. TASK CREATION REQUEST
  const createMatch = q.match(/^(?:create|add|make|schedule)\s+(?:a\s+)?task(?:\s+(?:called|named|for|to))?\s+(.+)/i);
  if (createMatch) {
    const taskTitle = createMatch[1].trim();
    return {
      content: `I've prepared a new task card for you: **"${taskTitle}"**. Click below to add it directly to your workspace:`,
      actionPayload: {
        type: "create_task",
        task: {
          title: taskTitle,
          priority: q.includes("urgent") ? "urgent" : q.includes("high") ? "high" : "medium",
          dueDateEpoch: todayNoonEpoch,
        },
      },
    };
  }

  // 5. GOAL & TASK BREAKDOWN
  if (q.includes("break down") || q.includes("deconstruct") || q.includes("subtasks") || q.includes("steps for")) {
    const topic = prompt.replace(/(?:can you\s+)?(?:please\s+)?(?:break down|deconstruct|generate subtasks for|give me steps for)\s*/i, "").trim() || "Your Goal";

    let steps: string[] = [];
    if (q.includes("build") || q.includes("code") || q.includes("app") || q.includes("feature")) {
      steps = [
        "Define feature requirements & data contracts",
        "Implement backend models and database migrations",
        "Build frontend UI layout and user interaction states",
        "Polish edge cases, error feedback, and responsive layout",
        "Perform comprehensive verification build and tests",
      ];
    } else if (q.includes("study") || q.includes("exam") || q.includes("read") || q.includes("paper")) {
      steps = [
        "Skim table of contents and identify core concepts",
        "Draft quick active-recall notes and diagrams",
        "Solve 3-5 real test questions / practice problems",
        "Review difficult sticky areas with flashcards",
      ];
    } else if (q.includes("meeting") || q.includes("presentation") || q.includes("pitch")) {
      steps = [
        "Clarify primary objective and single takeaway message",
        "Draft outline and discussion talking points",
        "Gather supporting charts, numbers, and feedback",
        "Run dry rehearsal and prepare action item follow-up",
      ];
    } else {
      steps = [
        `Research scope and deliverables for ${topic}`,
        "Gather required materials and prerequisites",
        "Draft the initial working prototype or outline",
        "Refine, verify, and complete final deliverables",
      ];
    }

    return {
      content: `Here is a step-by-step checklist to execute **"${topic}"**:

${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

You can create this as a task with subtasks attached right now:`,
      actionPayload: {
        type: "create_task",
        task: {
          title: topic,
          priority: "medium",
          dueDateEpoch: todayNoonEpoch,
          subtasks: steps,
        },
      },
    };
  }

  // 6. DRAFT NOTE REQUEST
  if (q.includes("draft a note") || q.includes("create a note") || q.includes("write a note")) {
    const noteTitle = prompt.replace(/(?:draft|create|write)\s+(?:a\s+)?note(?:\s+(?:about|on|for))?\s*/i, "").trim() || "Meeting Summary";
    const content = `# ${noteTitle}

*Created with Sammi AI on ${new Date().toLocaleDateString()}*

## Overview
Brief background and core objectives for ${noteTitle}.

## Key Points & Discussion
- Point 1
- Point 2
- Point 3

## Action Items
- [ ] Next step 1
- [ ] Next step 2
`;

    return {
      content: `I've drafted a structured Markdown note for **"${noteTitle}"**. Click below to save it into your Notes workspace:`,
      actionPayload: {
        type: "create_note",
        note: {
          title: noteTitle,
          content,
          color: "amber",
        },
      },
    };
  }

  // 7. NOTES & PROJECT INQUIRIES
  if (q.includes("notes") || q.includes("note")) {
    if (context.notes.length === 0) {
      return { content: "You don't have any notes created yet. You can create one in the Notes tab (<kbd>Alt+7</kbd>)!" };
    }
    const noteSummaries = context.notes.slice(0, 5).map((n) => `- **${n.title || "Untitled"}**: ${n.content.slice(0, 70).replace(/\n/g, " ") || "No content"}`).join("\n");
    return {
      content: `Here are your recent notes from the workspace:\n\n${noteSummaries}\n\nAsk me to draft a new note anytime!`,
    };
  }

  // 8. DEFAULT HELPFUL FALLBACK
  return {
    content: `I analyzed your workspace (${activeTasks.length} active tasks, ${context.projects.length} projects, ${context.notes.length} notes).

You asked: *"**${prompt}**"*

Here's how I can help with that:
- Ask **"What should I focus on today?"** to get a prioritized plan.
- Ask **"Break down ${prompt}"** to turn this into a checklist of subtasks.
- Say **"Create a task for ${prompt}"** to add it directly to your board.
- Say **"Draft a note for ${prompt}"** to build a structured document.`,
  };
}

// ─── DEDICATED GOAL & TASK DECONSTRUCTION (SAMMI AI ENGINE) ────────────────
export async function deconstructWithSammi(
  goalOrTitle: string,
  description?: string | null,
  config?: AiProviderConfig,
  _context?: { tasks?: Task[]; projects?: Project[]; notes?: Note[] }
): Promise<DeconstructResult> {
  const cfg = config || getAiConfig();
  const cleanTitle = goalOrTitle.trim() || "Task";
  const cleanDesc = description?.trim();

  const hasGeminiKey = cfg.provider === "gemini" && Boolean(cfg.geminiApiKey?.trim());
  const isOllama = cfg.provider === "ollama";

  // 1. Google Gemini Cloud Generative Engine
  if (hasGeminiKey) {
    const model = cfg.geminiModel || "gemini-3.6-flash";
    const key = cfg.geminiApiKey!.trim();
    const systemPrompt = `You are Sammi, an intelligent workspace productivity planner embedded in the Laya desktop app.
Your role is to deconstruct complex tasks or high-level goals into clean, practical, actionable subtasks.
Guidelines:
1. Generate between 3 and 6 sequential, highly actionable steps.
2. Each step must be clear, concise (under 12 words), and begin with an active verb (e.g. "Draft", "Review", "Set up", "Implement", "Verify", "Test").
3. Return ONLY a valid JSON array of strings containing the subtasks, e.g. ["Step 1", "Step 2", "Step 3"]. Do not include markdown codeblocks or extra conversation.`;

    const userPrompt = cleanDesc
      ? `Goal: "${cleanTitle}"\nContext/Details: "${cleanDesc}"\nBreak this down into subtasks.`
      : `Goal: "${cleanTitle}"\nBreak this down into subtasks.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errDetail = errJson.error?.message || `HTTP ${res.status}`;
        console.warn("Gemini deconstruct request returned error, using fallback:", errDetail);
        const blueprint = matchDomainSubtasks(cleanTitle);
        return {
          title: cleanTitle,
          steps: blueprint.steps,
          source: "deterministic",
          model,
          error: errDetail,
        };
      }

      const data = await res.json();
      const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let steps: string[] = [];
      try {
        const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();
        const parsed: unknown = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          steps = parsed.map((s: unknown) => String(s).trim()).filter(Boolean);
        } else if (parsed && typeof parsed === "object" && "steps" in parsed && Array.isArray((parsed as { steps: unknown[] }).steps)) {
          steps = (parsed as { steps: unknown[] }).steps.map((s: unknown) => String(s).trim()).filter(Boolean);
        } else if (parsed && typeof parsed === "object" && "subtasks" in parsed && Array.isArray((parsed as { subtasks: unknown[] }).subtasks)) {
          steps = (parsed as { subtasks: unknown[] }).subtasks.map((s: unknown) => String(s).trim()).filter(Boolean);
        }
      } catch {
        // Fallback line-by-line parsing
        steps = rawText
          .split("\n")
          .map((l: string) => l.replace(/^\s*(?:\d+[\.\)]|[-*•]|\[[ x]\])\s*/i, "").trim())
          .filter((l: string) => l.length > 2 && !l.startsWith("#") && !l.startsWith("```"));
      }

      if (steps.length > 0) {
        return {
          title: cleanTitle,
          steps: steps.slice(0, 8),
          source: "gemini",
          model,
        };
      }
    } catch (err) {
      console.warn("Gemini deconstruct fetch failed, falling back to deterministic:", err);
      const blueprint = matchDomainSubtasks(cleanTitle);
      return {
        title: cleanTitle,
        steps: blueprint.steps,
        source: "deterministic",
        model,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 2. Local Ollama API
  if (isOllama) {
    const endpoint = (cfg.ollamaEndpoint || "http://localhost:11434").replace(/\/$/, "");
    const model = cfg.ollamaModel || "llama3";
    const prompt = `You are Sammi in Laya desktop app. Break down this task into 3-6 actionable, sequential subtasks (under 12 words each, starting with an active verb).
Return ONLY a valid JSON array of strings, e.g. ["Step 1", "Step 2"].
Task: "${cleanTitle}"${cleanDesc ? `\nContext: "${cleanDesc}"` : ""}`;

    try {
      const res = await fetch(`${endpoint}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          format: "json",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.message?.content || "";
        let steps: string[] = [];
        try {
          const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();
          const parsed: unknown = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            steps = parsed.map((s: unknown) => String(s).trim()).filter(Boolean);
          } else if (parsed && typeof parsed === "object" && "steps" in parsed && Array.isArray((parsed as { steps: unknown[] }).steps)) {
            steps = (parsed as { steps: unknown[] }).steps.map((s: unknown) => String(s).trim()).filter(Boolean);
          } else if (parsed && typeof parsed === "object" && "subtasks" in parsed && Array.isArray((parsed as { subtasks: unknown[] }).subtasks)) {
            steps = (parsed as { subtasks: unknown[] }).subtasks.map((s: unknown) => String(s).trim()).filter(Boolean);
          }
        } catch {
          steps = rawText
            .split("\n")
            .map((l: string) => l.replace(/^\s*(?:\d+[\.\)]|[-*•]|\[[ x]\])\s*/i, "").trim())
            .filter((l: string) => l.length > 2 && !l.startsWith("#") && !l.startsWith("```"));
        }

        if (steps.length > 0) {
          return {
            title: cleanTitle,
            steps: steps.slice(0, 8),
            source: "ollama",
            model,
          };
        }
      }
    } catch (err) {
      console.warn("Ollama deconstruct failed:", err);
    }
  }

  // 3. Fallback: High-quality Deterministic Domain Subtask Blueprint
  const blueprint = matchDomainSubtasks(cleanTitle);
  return {
    title: cleanTitle,
    steps: blueprint.steps,
    source: "deterministic",
  };
}

// ─── MAIN QUERY DISPATCHER ──────────────────────────────────────────────────

export async function queryAiAssistant(
  prompt: string,
  history: ChatMessage[],
  context: { tasks: Task[]; projects: Project[]; notes: Note[] },
  config: AiProviderConfig
): Promise<AiResponse> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { content: "Please enter a message or question." };
  }

  const hasApiKey =
    (config.provider === "gemini" && Boolean(config.geminiApiKey?.trim())) ||
    config.provider === "ollama";

  // 1. FIRST: Code-First Deterministic Engine with Typo Tolerance (0ms, 100% offline, zero AI tokens)
  const deterministicMatch = tryDeterministicIntent(trimmed, context, { hasApiKey });
  if (deterministicMatch) {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return { ...deterministicMatch, source: "deterministic" };
  }

  // 2. Built-in Offline Fallback if provider is offline
  if (config.provider === "offline") {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { ...generateOfflineResponse(trimmed, context), source: "deterministic" };
  }

  // 3. Google Gemini API
  if (config.provider === "gemini") {
    const key = config.geminiApiKey?.trim();
    if (!key) {
      return {
        content: `### Google Gemini API Key Required

To use Google Gemini Cloud AI for open-ended queries and creative assistance, you need to connect your own Google Gemini API key.

1. Get a **free API key** at **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** (takes 30 seconds, no credit card required).
2. Click **Input API Key Now** below to paste and test your key.

*(Your key is stored 100% locally on your device. You can also switch back to the built-in Offline Smart Engine at any time).*`,
        source: "deterministic",
      };
    }

    const model = config.geminiModel || "gemini-3.6-flash";
    const workspaceContext = serializeWorkspaceContext(context.tasks, context.projects, context.notes, trimmed);
    const systemPrompt = `You are Sammi, an intelligent, concise, and focused workspace productivity assistant embedded in Laya desktop app.
You have real-time visibility into the user's local workspace.
Always be direct, clear, and action-oriented. Format your output with GitHub Markdown.

CURRENT WORKSPACE SNAPSHOT:
${workspaceContext}

If the user asks you to create a task, break down a goal, or draft a note, include a JSON block at the very end of your response inside \`\`\`json:action ... \`\`\` containing:
For task:
{"type": "create_task", "task": {"title": "...", "priority": "medium"|"urgent"|"high"|"low", "subtasks": ["...", "..."]}}
For note:
{"type": "create_note", "note": {"title": "...", "content": "..."}}`;

    try {
      const contents = [
        ...history.slice(-8).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        {
          role: "user",
          parts: [{ text: trimmed }],
        },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errDetail = errJson.error?.message || `HTTP ${res.status}`;
        const fallback = generateOfflineResponse(trimmed, context);
        return {
          ...fallback,
          source: "deterministic",
          content: `**Gemini API request failed**: ${errDetail}\n\n*Falling back to offline smart analysis:*\n\n${fallback.content}`,
        };
      }

      const data = await res.json();
      const rawText: string =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to generate a response.";

      // Extract optional action payload from json block
      let actionPayload: ActionPayload | undefined;
      const jsonMatch = rawText.match(/```json:action\s*([\s\S]*?)\s*```/);
      let cleanContent = rawText;
      if (jsonMatch) {
        try {
          actionPayload = JSON.parse(jsonMatch[1]);
          cleanContent = rawText.replace(/```json:action\s*[\s\S]*?\s*```/, "").trim();
        } catch (e) {
          console.warn("Could not parse action payload JSON from Gemini:", e);
        }
      }

      return { content: cleanContent, actionPayload, source: "gemini" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const fallback = generateOfflineResponse(trimmed, context);
      return {
        ...fallback,
        source: "deterministic",
        content: `**Connection failed**: ${msg}.\n\n*Falling back to offline smart analysis:*\n\n${fallback.content}`,
      };
    }
  }

  // 4. Local Ollama API
  if (config.provider === "ollama") {
    const endpoint = (config.ollamaEndpoint || "http://localhost:11434").replace(/\/$/, "");
    const model = config.ollamaModel || "llama3";
    const workspaceContext = serializeWorkspaceContext(context.tasks, context.projects, context.notes, trimmed);

    const messages = [
      {
        role: "system",
        content: `You are Sammi, a focused productivity assistant in Laya desktop app. You help the user manage tasks, projects, and notes. Be concise and practical.\nWorkspace context:\n${workspaceContext}`,
      },
      ...history.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: trimmed },
    ];

    try {
      const res = await fetch(`${endpoint}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });

      if (!res.ok) {
        const fallback = generateOfflineResponse(trimmed, context);
        return {
          ...fallback,
          source: "deterministic",
          content: `**Ollama request returned HTTP ${res.status}**. Make sure model "${model}" is installed.\n\n*Falling back to offline engine:*\n\n${fallback.content}`,
        };
      }

      const data = await res.json();
      const content = data.message?.content || "No response received from Ollama.";
      return { content, source: "ollama" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const fallback = generateOfflineResponse(trimmed, context);
      return {
        ...fallback,
        source: "deterministic",
        content: `**Could not connect to Ollama** at ${endpoint} (${msg}).\n\n*Falling back to offline engine:*\n\n${fallback.content}`,
      };
    }
  }

  return { ...generateOfflineResponse(trimmed, context), source: "deterministic" };
}
