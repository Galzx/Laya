import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Bot,
  Sparkles,
  Zap,
  ShieldCheck,
  Plus,
  Clock,
  Check,
  AlertTriangle,
  Send,
  Trash2,
  Settings2,
  Cpu,
  X,
  FileText,
  CheckSquare,
  Copy,
  FilePlus,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Flame,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  MessageSquare,
  Activity,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { playTaskPopSound, playSweepSound } from "../../lib/sound";
import { renderMarkdown } from "../notes/markdownParser";
import type { Task } from "../tasks/TasksView";
import type { Project } from "../projects/ProjectsView";
import type { Note } from "../notes/NoteEditor";
import type { ChatMessage, AiProviderConfig, ActionPayload } from "../../lib/ai/types";
import {
  getAiConfig,
  saveAiConfig,
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
} from "../../lib/ai/storage";
import { queryAiAssistant, testAiConnection, deconstructWithSammi } from "../../lib/ai/engine";

async function openExternalUrl(url: string) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

interface AiViewProps {
  workspaceId: string;
}

type AiTab = "chat" | "deconstruct" | "planner" | "health";

const STARTER_PROMPTS = [
  {
    icon: Calendar,
    label: "Focus Plan",
    prompt: "What should I focus on today based on my workspace priorities?",
  },
  {
    icon: AlertTriangle,
    label: "Audit Overdue",
    prompt: "Show my overdue tasks and high priority items that need attention.",
  },
  {
    icon: Zap,
    label: "Break Down Goal",
    prompt: "Break down 'Build a comprehensive quarterly sprint plan' into actionable steps.",
  },
  {
    icon: FileText,
    label: "Draft Note",
    prompt: "Draft a project meeting note for 'Weekly Team Sync'.",
  },
];

export const AiView: React.FC<AiViewProps> = ({ workspaceId }) => {
  const [activeTab, setActiveTab] = useState<AiTab>("chat");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChatHistory());
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedNoteMsgId, setSavedNoteMsgId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // AI Configuration State
  const [config, setConfig] = useState<AiProviderConfig>(() => getAiConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Subtask Deconstructor State
  const [taskPrompt, setTaskPrompt] = useState("");
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [deconstructSource, setDeconstructSource] = useState<"gemini" | "ollama" | "deterministic">("deterministic");
  const [deconstructModel, setDeconstructModel] = useState<string | undefined>();
  const [createdSuccess, setCreatedSuccess] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load workspace data
  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const [fetchedTasks, fetchedProjects, fetchedNotes] = await Promise.all([
          invoke<Task[]>("get_tasks", { workspaceId }).catch(() => [] as Task[]),
          invoke<Project[]>("get_projects", { workspaceId }).catch(() => [] as Project[]),
          invoke<Note[]>("get_notes", { workspaceId }).catch(() => [] as Note[]),
        ]);
        setTasks(fetchedTasks);
        setProjects(fetchedProjects);
        setNotes(fetchedNotes);
      } catch (err) {
        console.error("Failed to load workspace data for Sammi:", err);
      }
    }
    if (workspaceId) void loadWorkspaceData();

    const handleSync = () => {
      if (workspaceId) void loadWorkspaceData();
    };
    window.addEventListener("laya:tasks-changed", handleSync);
    window.addEventListener("laya:notes-changed", handleSync);
    window.addEventListener("laya:projects-changed", handleSync);
    return () => {
      window.removeEventListener("laya:tasks-changed", handleSync);
      window.removeEventListener("laya:notes-changed", handleSync);
      window.removeEventListener("laya:projects-changed", handleSync);
    };
  }, [workspaceId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, activeTab]);

  // Persist chat messages
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Handle Send in Chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isGenerating) return;

    playTaskPopSound();
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsGenerating(true);

    try {
      const response = await queryAiAssistant(
        text,
        [...messages, userMsg],
        { tasks, projects, notes },
        config
      );

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: response.content,
        timestamp: Date.now(),
        actionPayload: response.actionPayload,
        source: response.source || "deterministic",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      playTaskPopSound();
    } catch (err) {
      console.error("Error querying Sammi AI:", err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "An unexpected error occurred while processing your request. Please check your provider settings.",
        timestamp: Date.now(),
        source: "deterministic",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
      window.setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Copy Message Response
  const handleCopyMessage = (msgId: string, content: string) => {
    void navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Save Response as Note
  const handleSaveAsNote = async (msgId: string, content: string) => {
    playSweepSound();
    try {
      const firstLine = content.split("\n")[0].replace(/^[#*\s-]+/, "").trim() || "Sammi Blueprint";
      const title = firstLine.length > 50 ? `${firstLine.slice(0, 47)}...` : firstLine;
      await invoke("create_note", {
        workspaceId,
        projectId: null,
        title,
        content,
        color: "amber",
      });
      setSavedNoteMsgId(msgId);
      window.dispatchEvent(new CustomEvent("laya:notes-changed"));
      setTimeout(() => setSavedNoteMsgId(null), 2500);
    } catch (e) {
      console.error("Failed to save response as note:", e);
    }
  };

  // Copy Code block in Markdown
  const handleCopyCode = (code: string, id: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Handle Action Card Execution
  const handleExecuteAction = async (msgId: string, payload: ActionPayload) => {
    playSweepSound();
    try {
      // 1. Create Task
      if (payload.type === "create_task" && payload.task) {
        const todayNoonEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
        const createdTask = await invoke<Task>("create_task", {
          workspaceId,
          title: payload.task.title,
          description: payload.task.description || null,
          priority: payload.task.priority || "medium",
          dueDate: payload.task.dueDateEpoch || todayNoonEpoch,
          projectId: payload.task.projectId || null,
        });

        if (payload.task.subtasks && payload.task.subtasks.length > 0) {
          for (const sub of payload.task.subtasks) {
            await invoke("create_subtask", {
              taskId: createdTask.id,
              title: sub,
            });
          }
        }

        setExecutedActions((prev) => ({ ...prev, [msgId]: true }));
        window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      }
      // 2. Complete Task
      else if (payload.type === "toggle_task" && payload.taskToggle) {
        await invoke("set_task_status", {
          taskId: payload.taskToggle.taskId,
          status: payload.taskToggle.nextStatus,
        });
        setExecutedActions((prev) => ({ ...prev, [msgId]: true }));
        window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      }
      // 3. Reschedule Task
      else if (payload.type === "reschedule_task" && payload.taskReschedule) {
        await invoke("update_task_due_date", {
          taskId: payload.taskReschedule.taskId,
          dueDate: payload.taskReschedule.dueDateEpoch,
        });
        setExecutedActions((prev) => ({ ...prev, [msgId]: true }));
        window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      }
      // 4. Update Priority
      else if (payload.type === "update_priority" && payload.taskPriority) {
        await invoke("update_task_priority", {
          taskId: payload.taskPriority.taskId,
          priority: payload.taskPriority.priority,
        });
        setExecutedActions((prev) => ({ ...prev, [msgId]: true }));
        window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      }
      // 5. Create Project
      else if (payload.type === "create_project" && payload.project) {
        await invoke("create_project", {
          workspaceId,
          name: payload.project.name,
          description: payload.project.description || null,
          color: payload.project.color || "emerald",
          coverImage: null,
          dueDate: null,
        });
        setExecutedActions((prev) => ({ ...prev, [msgId]: true }));
        window.dispatchEvent(new CustomEvent("laya:projects-changed"));
      }
      // 6. Create Note
      else if (payload.type === "create_note" && payload.note) {
        await invoke("create_note", {
          workspaceId,
          projectId: payload.note.projectId || null,
          title: payload.note.title,
          content: payload.note.content,
          color: payload.note.color || "amber",
        });

        setExecutedActions((prev) => ({ ...prev, [msgId]: true }));
        window.dispatchEvent(new CustomEvent("laya:notes-changed"));
      }
    } catch (err) {
      console.error("Failed to execute action card:", err);
    }
  };

  // Clear Chat History
  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear your conversation history with Sammi?")) {
      clearChatHistory();
      setMessages([]);
      playTaskPopSound();
    }
  };

  // Test Connection in Settings
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testAiConnection(config);
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, message: msg });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save Settings
  const handleSaveSettings = (newConfig: AiProviderConfig) => {
    if (newConfig.provider === "gemini" && !newConfig.geminiApiKey?.trim()) {
      setTestResult({
        ok: false,
        message: "Please enter your Gemini API key to enable Gemini Cloud AI, or select Offline mode.",
      });
      return;
    }
    setConfig(newConfig);
    saveAiConfig(newConfig);
    setIsSettingsOpen(false);
    setTestResult(null);
    playTaskPopSound();
  };

  // Subtask Deconstructor Tab Logic
  const handleDeconstructTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim() || isGenerating) return;

    if (config.provider === "gemini" && !config.geminiApiKey?.trim()) {
      setIsSettingsOpen(true);
      return;
    }

    setIsGenerating(true);
    playTaskPopSound();

    try {
      const res = await deconstructWithSammi(
        taskPrompt.trim(),
        null,
        config,
        { tasks, projects, notes }
      );

      setSuggestedSubtasks(res.steps);
      setDeconstructSource(res.source);
      setDeconstructModel(res.model);
    } catch (err) {
      console.error("Deconstruct error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitTaskWithSubtasks = async () => {
    if (!taskPrompt.trim() || suggestedSubtasks.length === 0) return;
    try {
      playSweepSound();
      const todayNoonEpoch = Math.floor(new Date().setHours(12, 0, 0, 0) / 1000);
      const createdTask = await invoke<Task>("create_task", {
        workspaceId,
        title: taskPrompt.trim(),
        priority: "medium",
        dueDate: todayNoonEpoch,
      });

      for (const sub of suggestedSubtasks) {
        await invoke("create_subtask", {
          taskId: createdTask.id,
          title: sub,
        });
      }

      setCreatedSuccess(true);
      window.dispatchEvent(new CustomEvent("laya:tasks-changed"));
      window.setTimeout(() => {
        setCreatedSuccess(false);
        setTaskPrompt("");
        setSuggestedSubtasks([]);
      }, 2000);
    } catch (err) {
      console.error("Failed to commit task with subtasks:", err);
    }
  };

  // Workspace stats
  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "archived");
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "completed" || t.status === "archived" || !t.due_date) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(t.due_date * 1000) < startOfToday;
  });

  const getProviderBadge = () => {
    if (config.provider === "gemini") {
      const hasKey = Boolean(config.geminiApiKey?.trim());
      return {
        label: hasKey ? `Gemini (${config.geminiModel || "3.6-flash"})` : "Gemini: Key Required",
        icon: hasKey ? Sparkles : KeyRound,
        color: hasKey
          ? "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
          : "text-amber-600 bg-amber-500/15 border-amber-500/30 font-bold animate-pulse",
      };
    }
    if (config.provider === "ollama") {
      return {
        label: `Ollama (${config.ollamaModel || "llama3"})`,
        icon: Cpu,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      };
    }
    return {
      label: "Offline Smart Engine",
      icon: ShieldCheck,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    };
  };

  const badge = getProviderBadge();
  const BadgeIcon = badge.icon;

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-5xl mx-auto space-y-4 animate-smooth-in select-none">
      {/* ─── HEADER BAR ─── */}
      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl shadow-card shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">Sammi</h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:opacity-85 transition-opacity",
                  badge.color
                )}
                title="Click to configure AI provider & API key"
              >
                <BadgeIcon className="h-3 w-3" />
                <span>{badge.label}</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your focused workspace co-pilot with deterministic execution & smart planning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "chat"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span><MessageSquare className="h-3.5 w-3.5" /></span>
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deconstruct")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "deconstruct"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span><Zap className="h-3.5 w-3.5" /></span>
              <span>Deconstruct</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("planner")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "planner"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span><Calendar className="h-3.5 w-3.5" /></span>
              <span>Day Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("health")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "health"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span><Activity className="h-3.5 w-3.5" /></span>
              <span>Health</span>
            </button>
          </div>

          {/* AI Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Configure AI Provider & Keys"
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CONVERSATIONAL CHAT ─── */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {/* Gemini First-Time Key Banner */}
          {config.provider === "gemini" && !config.geminiApiKey?.trim() && (
            <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/25 text-xs flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <KeyRound className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  <strong>Gemini Setup:</strong> Connect your personal Gemini API key to unlock Cloud AI reasoning.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openExternalUrl("https://aistudio.google.com/apikey")}
                  className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-card text-foreground font-semibold hover:bg-muted text-[11px] cursor-pointer"
                >
                  Get Key ↗
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700 transition-colors cursor-pointer shadow-2xs"
                >
                  Input Key
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto py-8">
                <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-md">
                  <Bot className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground">
                    How can I assist your focus today?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    I have full context on your {activeTasks.length} pending tasks, {projects.length} projects, and {notes.length} notes. Ask me anything or try a starter prompt below:
                  </p>
                </div>

                {/* Quick Starter Prompt Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                  {STARTER_PROMPTS.map((sp, idx) => {
                    const SpIcon = sp.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => void handleSendMessage(sp.prompt)}
                        className="p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 hover:border-primary/40 text-xs text-foreground transition-all cursor-pointer group flex items-start gap-2.5"
                      >
                        <SpIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {sp.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{sp.prompt}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Free Offline vs Cloud Gemini Callout */}
                <div className="w-full p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 text-left">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {config.geminiApiKey?.trim() ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>Gemini Cloud AI is Active</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Running 100% Free Offline Smart Engine</span>
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {config.geminiApiKey?.trim()
                        ? "Connected with personal API key. Ready for cloud reasoning."
                        : "Want open-ended creative & coding AI? Connect your free Gemini API key."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!config.geminiApiKey?.trim()) {
                        setConfig({ ...config, provider: "gemini" });
                      }
                      setIsSettingsOpen(true);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all cursor-pointer shrink-0 shadow-2xs",
                      config.geminiApiKey?.trim()
                        ? "bg-card border-border text-foreground hover:bg-muted"
                        : "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700"
                    )}
                  >
                    {config.geminiApiKey?.trim() ? "AI Settings" : "Input API Key"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  const hasAction = m.actionPayload !== undefined;
                  const isExecuted = executedActions[m.id];
                  const isCopied = copiedMsgId === m.id;
                  const isSavedAsNote = savedNoteMsgId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex gap-3 max-w-3xl",
                        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-2xl space-y-2.5 shadow-2xs group/msg relative",
                          isUser
                            ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                            : "bg-muted/40 border border-border text-foreground rounded-tl-xs"
                        )}
                      >
                        {/* Assistant Source Transparency Badge */}
                        {!isUser && (
                          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono">
                              {m.source === "gemini" ? (
                                <span className="inline-flex items-center gap-1 text-indigo-500 bg-indigo-500/10 px-1.5 py-px rounded-full border border-indigo-500/20">
                                  <Sparkles className="h-2.5 w-2.5" /> Gemini 3.6 Flash
                                </span>
                              ) : m.source === "ollama" ? (
                                <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-px rounded-full border border-amber-500/20">
                                  <Cpu className="h-2.5 w-2.5" /> Local Ollama
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-px rounded-full border border-emerald-500/20">
                                  <Zap className="h-2.5 w-2.5" /> 0ms Instant Code
                                </span>
                              )}
                            </span>

                            {/* Action Buttons: Copy & Save as Note */}
                            <div className="flex items-center gap-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(m.id, m.content)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Copy response text"
                              >
                                {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveAsNote(m.id, m.content)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
                                title="Save as Scratchpad Note"
                              >
                                {isSavedAsNote ? <Check className="h-3 w-3 text-emerald-500" /> : <FilePlus className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {isUser ? (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <div className="prose prose-xs dark:prose-invert max-w-none">
                            {renderMarkdown(m.content, {
                              onCopyCode: handleCopyCode,
                              copiedCodeId,
                            })}
                          </div>
                        )}

                        {/* ─── API KEY SETUP CALLOUT ─── */}
                        {!isUser && m.content.includes("API Key Required") && (
                          <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                              <KeyRound className="h-4 w-4 text-amber-500 shrink-0" />
                              <span>Set Up Your Free Gemini API Key</span>
                            </div>
                            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                              Get your own personal API key from Google AI Studio to enable cloud-powered generative reasoning.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setIsSettingsOpen(true)}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                <span>Input API Key</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openExternalUrl("https://aistudio.google.com/apikey")}
                                className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-muted transition-colors cursor-pointer"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                                <span>Get Free Key (Google AI Studio) ↗</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newCfg: AiProviderConfig = { ...config, provider: "offline" };
                                  setConfig(newCfg);
                                  saveAiConfig(newCfg);
                                  playTaskPopSound();
                                }}
                                className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground font-medium text-xs hover:bg-muted transition-colors cursor-pointer ml-auto"
                              >
                                <span>Stay on Offline Engine</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ─── INTERACTIVE ACTION CARDS ─── */}
                        {hasAction && m.actionPayload && (
                          <div className="mt-3 p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-2.5">
                            {/* Card: Create Task */}
                            {m.actionPayload.type === "create_task" && m.actionPayload.task && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                    <span>Task Proposal: {m.actionPayload.task.title}</span>
                                  </div>
                                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground">
                                    {m.actionPayload.task.priority || "medium"}
                                  </span>
                                </div>

                                {m.actionPayload.task.subtasks && m.actionPayload.task.subtasks.length > 0 && (
                                  <div className="space-y-1 pl-1">
                                    {m.actionPayload.task.subtasks.map((sub, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="text-[11px] text-muted-foreground flex items-center gap-2"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                        <span>{sub}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  disabled={isExecuted}
                                  onClick={() => handleExecuteAction(m.id, m.actionPayload!)}
                                  className={cn(
                                    "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs",
                                    isExecuted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                      : "bg-primary text-primary-foreground hover:opacity-90"
                                  )}
                                >
                                  {isExecuted ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Created in Tasks!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3.5 w-3.5" />
                                      <span>Add Task to Workspace</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Card: Mark Task Completed */}
                            {m.actionPayload.type === "toggle_task" && m.actionPayload.taskToggle && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  <span>Mark Task as Completed: "{m.actionPayload.taskToggle.taskTitle}"</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isExecuted}
                                  onClick={() => handleExecuteAction(m.id, m.actionPayload!)}
                                  className={cn(
                                    "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs",
                                    isExecuted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                      : "bg-emerald-600 text-white hover:opacity-90"
                                  )}
                                >
                                  {isExecuted ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Marked as Done!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Check Off Task</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Card: Reschedule Task */}
                            {m.actionPayload.type === "reschedule_task" && m.actionPayload.taskReschedule && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span>Reschedule: "{m.actionPayload.taskReschedule.taskTitle}"</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Target Due Date: {new Date(m.actionPayload.taskReschedule.dueDateEpoch * 1000).toLocaleDateString()}
                                </p>
                                <button
                                  type="button"
                                  disabled={isExecuted}
                                  onClick={() => handleExecuteAction(m.id, m.actionPayload!)}
                                  className={cn(
                                    "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs",
                                    isExecuted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                      : "bg-primary text-primary-foreground hover:opacity-90"
                                  )}
                                >
                                  {isExecuted ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Rescheduled!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>Confirm Reschedule</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Card: Update Priority */}
                            {m.actionPayload.type === "update_priority" && m.actionPayload.taskPriority && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <Flame className="h-4 w-4 text-rose-500" />
                                  <span>Change Priority: "{m.actionPayload.taskPriority.taskTitle}"</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  New Priority: <span className="font-semibold uppercase">{m.actionPayload.taskPriority.priority}</span>
                                </p>
                                <button
                                  type="button"
                                  disabled={isExecuted}
                                  onClick={() => handleExecuteAction(m.id, m.actionPayload!)}
                                  className={cn(
                                    "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs",
                                    isExecuted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                      : "bg-amber-600 text-white hover:opacity-90"
                                  )}
                                >
                                  {isExecuted ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Priority Updated!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Flame className="h-3.5 w-3.5" />
                                      <span>Set Priority</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Card: Create Project */}
                            {m.actionPayload.type === "create_project" && m.actionPayload.project && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <FolderKanban className="h-4 w-4 text-emerald-500" />
                                  <span>New Project: "{m.actionPayload.project.name}"</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isExecuted}
                                  onClick={() => handleExecuteAction(m.id, m.actionPayload!)}
                                  className={cn(
                                    "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs",
                                    isExecuted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                      : "bg-emerald-600 text-white hover:opacity-90"
                                  )}
                                >
                                  {isExecuted ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Project Created!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3.5 w-3.5" />
                                      <span>Create Project</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Card: Draft Note */}
                            {m.actionPayload.type === "create_note" && m.actionPayload.note && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                                  <span>Draft Note: {m.actionPayload.note.title}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                  {m.actionPayload.note.content}
                                </p>
                                <button
                                  type="button"
                                  disabled={isExecuted}
                                  onClick={() => handleExecuteAction(m.id, m.actionPayload!)}
                                  className={cn(
                                    "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs",
                                    isExecuted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                      : "bg-amber-600 text-white hover:opacity-90"
                                  )}
                                >
                                  {isExecuted ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Saved to Notes!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3.5 w-3.5" />
                                      <span>Save Note to Scratchpad</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <span
                          className={cn(
                            "block text-[9px] font-mono text-right opacity-60 pt-0.5",
                            isUser ? "text-primary-foreground" : "text-muted-foreground"
                          )}
                        >
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isGenerating && (
                  <div className="flex gap-3 mr-auto items-center animate-fade-in">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                      <Bot className="h-4 w-4 animate-pulse" />
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>Sammi is analyzing your workspace…</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-muted/30 border-t border-border/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>Press <kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border">Enter</kbd> to send, <kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border">Shift+Enter</kbd> for newline</span>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="flex items-center gap-1 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear Chat</span>
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Ask Sammi anything or command: 'mark task X as done', 'reschedule X to tomorrow'…"
                rows={1}
                className="flex-1 max-h-36 min-h-[42px] bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
              />
              <button
                type="submit"
                disabled={isGenerating || !inputText.trim()}
                className="h-[42px] px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TASK DECONSTRUCTOR ─── */}
      {activeTab === "deconstruct" && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5 animate-smooth-in">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                <span>Deconstruct Complex Goals into Actionable Checklists</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Powered by Sammi AI. Generates realistic, structured steps that you can commit directly to your workspace.
              </p>
            </div>

            {/* Sammi Intelligence Status Badge */}
            {(config.provider === "gemini" && config.geminiApiKey?.trim()) || config.provider === "ollama" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span>Managed by Sammi AI ({config.provider === "gemini" ? (config.geminiModel || "Gemini Cloud") : "Ollama Local"})</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-500/25 hover:bg-amber-500/20 transition-colors cursor-pointer shadow-2xs"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                <span>Connect Gemini API Key for Sammi</span>
              </button>
            )}
          </div>

          <form onSubmit={handleDeconstructTask} className="flex gap-2">
            <input
              type="text"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="e.g., Launch marketing newsletter, Build auth flow, Prepare tax filing…"
              className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={isGenerating || !taskPrompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isGenerating ? "Deconstructing…" : "Deconstruct"}</span>
            </button>
          </form>

          {suggestedSubtasks.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-border/60 animate-smooth-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Suggested Action Checklist ({suggestedSubtasks.length} steps):
                  </span>
                  {deconstructSource === "gemini" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium border border-indigo-500/20">
                      <Sparkles className="h-3 w-3 text-indigo-500" />
                      <span>Deconstructed by Sammi ({deconstructModel || "Gemini"})</span>
                    </span>
                  )}
                  {deconstructSource === "ollama" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-medium border border-purple-500/20">
                      <Bot className="h-3 w-3 text-purple-500" />
                      <span>Deconstructed by Sammi ({deconstructModel || "Ollama"})</span>
                    </span>
                  )}
                  {deconstructSource === "deterministic" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium border border-border">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      <span>Offline Heuristic Engine</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCommitTaskWithSubtasks}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {createdSuccess ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>{createdSuccess ? "Created in Tasks!" : "Create Task + Subtasks"}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {suggestedSubtasks.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground font-medium"
                  >
                    <span className="h-4 w-4 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                      {idx + 1}
                    </span>
                    <span>{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: DAY PLANNER ─── */}
      {activeTab === "planner" && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5 animate-smooth-in">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span>Synthesized Daily Focus Flow</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Prioritized execution order calculated from deadlines and importance tags in your workspace:
            </p>
          </div>

          {activeTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              No pending tasks right now. Your workspace is completely clear!
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks
                .sort((a, b) => {
                  const order = { urgent: 0, high: 1, medium: 2, low: 3 };
                  return order[a.priority] - order[b.priority];
                })
                .slice(0, 6)
                .map((t, idx) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border",
                          t.priority === "urgent"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                            : t.priority === "high"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {t.priority}
                      </span>
                      {t.due_date && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(t.due_date * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: WORKSPACE HEALTH AUDIT ─── */}
      {activeTab === "health" && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6 animate-smooth-in">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Workspace Health & Hygiene</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Automated diagnostic check of your SQLite database items.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
              <span className="text-xs text-muted-foreground">Pending Tasks</span>
              <p className="text-xl font-bold font-mono text-foreground">{activeTasks.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
              <span className="text-xs text-muted-foreground">Overdue Items</span>
              <p
                className={cn(
                  "text-xl font-bold font-mono",
                  overdueTasks.length > 0 ? "text-rose-500" : "text-emerald-500"
                )}
              >
                {overdueTasks.length}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
              <span className="text-xs text-muted-foreground">Notes Saved</span>
              <p className="text-xl font-bold font-mono text-foreground">{notes.length}</p>
            </div>
          </div>

          {overdueTasks.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>Great job! You have zero overdue tasks in your workspace.</span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                You have {overdueTasks.length} overdue task(s). Visit the Calendar or Tasks view to reschedule or complete them.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── PROVIDER CONFIGURATION MODAL / DRAWER ─── */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-dialog space-y-5 animate-dialog-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Sammi AI Configuration</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="font-semibold text-foreground block">AI Intelligence Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: "offline" })}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                      config.provider === "offline"
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Offline</span>
                    <span className="text-[10px] font-normal opacity-70">Built-in</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: "gemini" })}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                      config.provider === "gemini"
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Gemini</span>
                    <span className="text-[10px] font-normal opacity-70">Cloud API</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: "ollama" })}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                      config.provider === "ollama"
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Cpu className="h-4 w-4" />
                    <span>Ollama</span>
                    <span className="text-[10px] font-normal opacity-70">Local LLM</span>
                  </button>
                </div>
              </div>

              {/* Offline Provider Description */}
              {config.provider === "offline" && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    <span>Zero Configuration & 100% Privacy</span>
                  </p>
                  <p className="opacity-90">
                    Runs offline on your device with 0ms latency. Answers questions about tasks, projects, generates checklists, and drafts notes without any network calls.
                  </p>
                </div>
              )}

              {/* Gemini Provider Config */}
              {config.provider === "gemini" && (
                <div className="space-y-3.5 p-3.5 rounded-xl bg-muted/40 border border-border">
                  {/* First-Time Info Box */}
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-800 dark:text-indigo-300 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="font-bold flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Google Gemini Cloud AI Setup</span>
                        </p>
                        <p className="text-[10px] opacity-90">
                          Google provides free, fast API access for personal use. No credit card required.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openExternalUrl("https://aistudio.google.com/apikey")}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[10px] flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-2xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Get Free Key ↗</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground flex items-center gap-1">
                        <KeyRound className="h-3.5 w-3.5 text-primary" />
                        <span>Google Gemini API Key</span>
                      </label>
                      {config.geminiApiKey && (
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, geminiApiKey: "" })}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Clear Key
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={config.geminiApiKey || ""}
                        onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value.trim() })}
                        placeholder="Paste AIzaSy... here"
                        className="w-full bg-background border border-border rounded-xl pl-3 pr-9 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Stored only in your local application preferences. Never shared or uploaded.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Gemini Model</label>
                    <select
                      value={config.geminiModel || "gemini-3.6-flash"}
                      onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="gemini-3.6-flash">Gemini 3.6 Flash (Fastest, Recommended)</option>
                      <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Ultra Low Latency)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Deep Reasoning)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Ollama Provider Config */}
              {config.provider === "ollama" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Ollama Server Endpoint</label>
                    <input
                      type="text"
                      value={config.ollamaEndpoint || "http://localhost:11434"}
                      onChange={(e) => setConfig({ ...config, ollamaEndpoint: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Model Name</label>
                    <input
                      type="text"
                      value={config.ollamaModel || "llama3"}
                      onChange={(e) => setConfig({ ...config, ollamaModel: e.target.value })}
                      placeholder="llama3, mistral, gemma2, etc."
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Ensure the model is pulled locally via <code className="font-mono">ollama pull {config.ollamaModel || "llama3"}</code>.
                    </span>
                  </div>
                </div>
              )}

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={cn(
                    "p-3 rounded-xl border text-[11px] flex items-center gap-2",
                    testResult.ok
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                  )}
                >
                  {testResult.ok ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={isTestingConnection}
                onClick={handleTestConnection}
                className="px-3.5 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTestingConnection ? "Testing…" : "Test Connection"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSettings(config)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
