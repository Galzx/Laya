import { describe, it, expect } from "vitest";
import { THEME_PRESETS, ACCENT_COLORS } from "./theme";

describe("Theme System & Design Tokens", () => {
  it("defines exactly 8 built-in themes", () => {
    expect(THEME_PRESETS).toHaveLength(8);
  });

  it("contains 5 light themes and 3 dark themes", () => {
    const lightThemes = THEME_PRESETS.filter((t) => t.mode === "light");
    const darkThemes = THEME_PRESETS.filter((t) => t.mode === "dark");
    expect(lightThemes).toHaveLength(5);
    expect(darkThemes).toHaveLength(3);
  });

  it("each theme preset provides all 17 required HSL design tokens", () => {
    const requiredTokens = [
      "background",
      "foreground",
      "card",
      "cardForeground",
      "primary",
      "primaryForeground",
      "secondary",
      "secondaryForeground",
      "muted",
      "mutedForeground",
      "accent",
      "accentForeground",
      "border",
      "input",
      "ring",
      "sidebar",
      "sidebarBorder",
    ] as const;

    THEME_PRESETS.forEach((preset) => {
      requiredTokens.forEach((tokenKey) => {
        expect(preset.tokens[tokenKey], `Theme ${preset.id} missing token ${tokenKey}`).toBeDefined();
        expect(typeof preset.tokens[tokenKey]).toBe("string");
        expect(preset.tokens[tokenKey].length).toBeGreaterThan(0);
      });
    });
  });

  it("defines valid hex previews for all presets", () => {
    THEME_PRESETS.forEach((preset) => {
      expect(preset.previewBg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.previewAccent).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it("defines exactly 12 accent colors with valid hex values", () => {
    expect(ACCENT_COLORS).toHaveLength(12);
    ACCENT_COLORS.forEach((accent) => {
      expect(accent.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(accent.name).toBeTruthy();
      expect(accent.hsl).toBeTruthy();
    });
  });
});

