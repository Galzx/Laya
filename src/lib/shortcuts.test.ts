import { describe, it, expect } from "vitest";
import {
  SHORTCUT_DEFINITIONS,
  matchesShortcut,
  formatShortcut,
  isSameCombo,
  getSavedShortcuts,
  type ShortcutCombo,
} from "./shortcuts";

describe("Keyboard Shortcuts Engine", () => {
  it("defines default shortcuts with valid categories and combos", () => {
    expect(SHORTCUT_DEFINITIONS.length).toBeGreaterThan(5);
    SHORTCUT_DEFINITIONS.forEach((def) => {
      expect(["navigation", "actions"]).toContain(def.category);
      expect(def.defaultCombo.key).toBeTruthy();
      expect(def.label).toBeTruthy();
    });
  });

  it("accurately matches keyboard events with modifier keys", () => {
    const combo: ShortcutCombo = { ctrl: true, key: "k" };
    const matchingEvent = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: "k",
    } as unknown as KeyboardEvent;

    expect(matchesShortcut(matchingEvent, combo)).toBe(true);

    const nonMatchingEvent = {
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: "k",
    } as unknown as KeyboardEvent;

    expect(matchesShortcut(nonMatchingEvent, combo)).toBe(false);
  });

  it("handles case-insensitive and whitespace-normalized keys", () => {
    const combo: ShortcutCombo = { ctrl: true, shift: true, key: "l" };
    const upperEvent = {
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      metaKey: false,
      key: "L",
    } as unknown as KeyboardEvent;

    expect(matchesShortcut(upperEvent, combo)).toBe(true);
  });

  it("correctly identifies identical shortcut combos", () => {
    const comboA: ShortcutCombo = { ctrl: true, alt: false, key: "t" };
    const comboB: ShortcutCombo = { ctrl: true, key: "T" };
    const comboC: ShortcutCombo = { ctrl: true, shift: true, key: "t" };

    expect(isSameCombo(comboA, comboB)).toBe(true);
    expect(isSameCombo(comboA, comboC)).toBe(false);
  });

  it("formats shortcuts into readable button tokens", () => {
    const parts = formatShortcut({ ctrl: true, shift: true, key: "k" });
    expect(parts).toContain("Ctrl");
    expect(parts).toContain("Shift");
    expect(parts).toContain("K");
  });

  it("loads default shortcuts without throwing errors", () => {
    const shortcuts = getSavedShortcuts();
    expect(shortcuts.open_command_palette).toBeDefined();
    expect(shortcuts.open_command_palette.key).toBe("k");
    expect(shortcuts.open_command_palette.ctrl).toBe(true);
  });
});

