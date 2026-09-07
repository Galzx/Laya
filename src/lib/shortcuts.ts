export interface ShortcutCombo {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  key: string; // Lowercase canonical key representation (e.g. "k", "1", "space", "enter", "comma")
}

export type ShortcutCategory = "navigation" | "actions";

export interface ShortcutDefinition {
  id: string;
  label: string;
  description: string;
  category: ShortcutCategory;
  defaultCombo: ShortcutCombo;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  // Navigation
  {
    id: "open_command_palette",
    label: "Open Command Palette",
    description: "Quickly search actions, tabs, and jump anywhere",
    category: "navigation",
    defaultCombo: { ctrl: true, key: "k" },
  },
  {
    id: "nav_dashboard",
    label: "Go to Dashboard",
    description: "Switch to the Home Dashboard hub",
    category: "navigation",
    defaultCombo: { alt: true, key: "1" },
  },
  {
    id: "nav_tasks",
    label: "Go to Tasks View",
    description: "Switch to Tasks workspace",
    category: "navigation",
    defaultCombo: { alt: true, key: "2" },
  },
  {
    id: "nav_kanban",
    label: "Go to Kanban Board",
    description: "Switch to the Interactive Kanban Board",
    category: "navigation",
    defaultCombo: { alt: true, key: "3" },
  },
  {
    id: "nav_projects",
    label: "Go to Projects",
    description: "Switch to Projects workspace",
    category: "navigation",
    defaultCombo: { alt: true, key: "4" },
  },
  {
    id: "nav_focus",
    label: "Go to Focus & Timer",
    description: "Switch to the Deep Work Focus timer",
    category: "navigation",
    defaultCombo: { alt: true, key: "5" },
  },
  {
    id: "nav_analytics",
    label: "Go to Analytics & Velocity",
    description: "Switch to Productivity Analytics & Velocity charts",
    category: "navigation",
    defaultCombo: { alt: true, key: "6" },
  },
  {
    id: "nav_notes",
    label: "Go to Scratchpad Notes",
    description: "Switch to Notes and thoughts workspace",
    category: "navigation",
    defaultCombo: { alt: true, key: "7" },
  },
  {
    id: "nav_calendar",
    label: "Go to Calendar",
    description: "Switch to Calendar view",
    category: "navigation",
    defaultCombo: { alt: true, key: "8" },
  },
  {
    id: "nav_ai",
    label: "Go to Sammi AI Assistant",
    description: "Switch to Sammi AI assistant",
    category: "navigation",
    defaultCombo: { alt: true, key: "9" },
  },
  {
    id: "nav_settings",
    label: "Open Settings",
    description: "Open the App Settings configuration view",
    category: "navigation",
    defaultCombo: { ctrl: true, key: "," },
  },

  // Actions & Productivity
  {
    id: "open_quick_task",
    label: "Quick Task Capture",
    description: "Open a floating quick-add modal to log a task instantly",
    category: "actions",
    defaultCombo: { ctrl: true, shift: true, key: "n" },
  },
  {
    id: "toggle_timer",
    label: "Start / Pause Focus Timer",
    description: "Toggle the active focus or break countdown",
    category: "actions",
    defaultCombo: { ctrl: true, shift: true, key: "p" },
  },
  {
    id: "toggle_theme",
    label: "Toggle Dark / Light Theme",
    description: "Instantly switch between light and dark palette",
    category: "actions",
    defaultCombo: { ctrl: true, shift: true, key: "l" },
  },
];

const STORAGE_KEY = "laya_custom_shortcuts_v1";

/**
 * Normalizes a keyboard key name for uniform storage and matching
 */
export function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower === " ") return "space";
  if (lower === "escape") return "esc";
  return lower;
}

/**
 * Serializes a shortcut combo into a readable string like "Ctrl + Shift + K"
 */
export function formatShortcut(combo: ShortcutCombo): string[] {
  const parts: string[] = [];
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  if (combo.ctrl) parts.push(isMac ? "⌃ Control" : "Ctrl");
  if (combo.alt) parts.push(isMac ? "⌥ Option" : "Alt");
  if (combo.shift) parts.push(isMac ? "⇧ Shift" : "Shift");
  if (combo.meta) parts.push(isMac ? "⌘ Command" : "Win");

  let keyDisplay = combo.key.toUpperCase();
  if (combo.key === "space") keyDisplay = "Space";
  if (combo.key === "esc") keyDisplay = "Esc";
  if (combo.key === ",") keyDisplay = ",";

  parts.push(keyDisplay);
  return parts;
}

/**
 * Checks if two combos are identical
 */
export function isSameCombo(a: ShortcutCombo, b: ShortcutCombo): boolean {
  return (
    Boolean(a.ctrl) === Boolean(b.ctrl) &&
    Boolean(a.alt) === Boolean(b.alt) &&
    Boolean(a.shift) === Boolean(b.shift) &&
    Boolean(a.meta) === Boolean(b.meta) &&
    normalizeKey(a.key) === normalizeKey(b.key)
  );
}

/**
 * Retrieves the user-configured shortcuts or defaults
 */
export function getSavedShortcuts(): Record<string, ShortcutCombo> {
  const result: Record<string, ShortcutCombo> = {};

  // Start with defaults
  for (const def of SHORTCUT_DEFINITIONS) {
    result[def.id] = { ...def.defaultCombo };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, ShortcutCombo>;
      for (const [id, combo] of Object.entries(parsed)) {
        if (combo && combo.key) {
          result[id] = combo;
        }
      }
    }
  } catch (err) {
    console.warn("Could not load custom shortcuts from localStorage:", err);
  }

  return result;
}

/**
 * Saves updated shortcuts to storage and notifies listeners
 */
export function saveSavedShortcuts(shortcuts: Record<string, ShortcutCombo>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
    window.dispatchEvent(new CustomEvent("laya:shortcuts-updated"));
  } catch (err) {
    console.error("Failed to save custom shortcuts:", err);
  }
}

/**
 * Resets all shortcuts back to system defaults
 */
export function resetAllShortcuts(): Record<string, ShortcutCombo> {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("laya:shortcuts-updated"));
  } catch (err) {
    console.error("Failed to reset shortcuts:", err);
  }
  return getSavedShortcuts();
}

/**
 * Matches an incoming KeyboardEvent against a ShortcutCombo
 */
export function matchesShortcut(e: KeyboardEvent, combo: ShortcutCombo): boolean {
  if (Boolean(combo.ctrl) !== Boolean(e.ctrlKey)) return false;
  if (Boolean(combo.alt) !== Boolean(e.altKey)) return false;
  if (Boolean(combo.shift) !== Boolean(e.shiftKey)) return false;
  if (Boolean(combo.meta) !== Boolean(e.metaKey)) return false;

  const eventKey = normalizeKey(e.key);
  const targetKey = normalizeKey(combo.key);

  return eventKey === targetKey;
}

/**
 * Converts a live KeyboardEvent into a recordable ShortcutCombo
 */
export function eventToCombo(e: KeyboardEvent): ShortcutCombo | null {
  const ignoreKeys = ["Control", "Shift", "Alt", "Meta", "CapsLock", "Tab"];
  if (ignoreKeys.includes(e.key)) return null;

  const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey;
  // Require at least one modifier unless it is a function key F1-F12
  const isFunctionKey = /^F[1-9]|F1[0-2]$/i.test(e.key);
  if (!hasModifier && !isFunctionKey) return null;

  return {
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
    key: normalizeKey(e.key),
  };
}
