import type { AiProviderConfig, ChatMessage } from "./types";

const CONFIG_KEY = "laya-ai-provider-config";
const CHAT_HISTORY_KEY = "laya-ai-chat-history";

export const DEFAULT_AI_CONFIG: AiProviderConfig = {
  provider: "offline",
  geminiApiKey: "",
  geminiModel: "gemini-3.6-flash",
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3",
};

export function getAiConfig(): AiProviderConfig {
  if (typeof window === "undefined") return DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AI_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAiConfig(config: AiProviderConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("laya:ai-config-changed", { detail: config }));
}

export function getChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  // Keep up to 60 most recent messages to prevent storage bloat
  const trimmed = messages.slice(-60);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_HISTORY_KEY);
}

