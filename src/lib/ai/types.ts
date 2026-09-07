export type AiProviderType = "offline" | "gemini" | "ollama";

export interface AiProviderConfig {
  provider: AiProviderType;
  geminiApiKey?: string;
  geminiModel?: string; // default: "gemini-3.6-flash"
  ollamaEndpoint?: string; // default: "http://localhost:11434"
  ollamaModel?: string; // default: "llama3"
}

export interface TaskActionData {
  title: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDateEpoch?: number | null;
  projectId?: string | null;
  description?: string | null;
  subtasks?: string[];
}

export interface TaskToggleActionData {
  taskId: string;
  taskTitle: string;
  nextStatus: string;
}

export interface TaskRescheduleActionData {
  taskId: string;
  taskTitle: string;
  dueDateEpoch: number;
}

export interface TaskPriorityActionData {
  taskId: string;
  taskTitle: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface ProjectActionData {
  name: string;
  description?: string;
  color?: string;
}

export interface NoteActionData {
  title: string;
  content: string;
  color?: string;
  projectId?: string | null;
}

export interface ActionPayload {
  type:
    | "create_task"
    | "create_subtasks"
    | "create_note"
    | "toggle_task"
    | "reschedule_task"
    | "update_priority"
    | "create_project";
  task?: TaskActionData;
  taskToggle?: TaskToggleActionData;
  taskReschedule?: TaskRescheduleActionData;
  taskPriority?: TaskPriorityActionData;
  project?: ProjectActionData;
  note?: NoteActionData;
  status?: "pending" | "executed" | "failed";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  actionPayload?: ActionPayload;
  source?: "deterministic" | "gemini" | "ollama";
}
