export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarBorder: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  mode: "light" | "dark";
  previewBg: string;
  previewAccent: string;
  tokens: ThemeTokens;
}

export interface CustomTheme {
  id: string;
  name: string;
  description?: string;
  mode: "light" | "dark";
  baseColor: string; // hex
  accentColor: string; // hex
  cardTint?: "clean" | "tinted" | "contrast";
  sidebarTint?: "matching" | "contrast" | "deep";
  tokens: ThemeTokens;
  created_at: number;
  updated_at: number;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "linen",
    name: "Warm Linen",
    description: "Soft oatmeal cream with warm rosewood accents",
    mode: "light",
    previewBg: "#f7f5f0",
    previewAccent: "#a7636e",
    tokens: {
      background: "36 18% 96%",
      foreground: "25 20% 14%",
      card: "36 20% 99%",
      cardForeground: "25 20% 14%",
      primary: "349 28% 52%",
      primaryForeground: "0 0% 100%",
      secondary: "34 16% 91%",
      secondaryForeground: "25 20% 22%",
      muted: "34 14% 93%",
      mutedForeground: "28 10% 50%",
      accent: "349 22% 90%",
      accentForeground: "349 28% 38%",
      border: "30 14% 78%",
      input: "30 14% 78%",
      ring: "349 28% 52%",
      sidebar: "30 16% 94%",
      sidebarBorder: "30 14% 80%",
    },
  },
  {
    id: "matcha",
    name: "Matcha Sage",
    description: "Herbal sage tones with soothing forest green accents",
    mode: "light",
    previewBg: "#f0f5f0",
    previewAccent: "#4a8258",
    tokens: {
      background: "120 12% 95%",
      foreground: "140 20% 14%",
      card: "120 15% 99%",
      cardForeground: "140 20% 14%",
      primary: "138 28% 40%",
      primaryForeground: "0 0% 100%",
      secondary: "120 12% 89%",
      secondaryForeground: "140 20% 22%",
      muted: "120 10% 92%",
      mutedForeground: "130 10% 48%",
      accent: "138 20% 88%",
      accentForeground: "138 30% 30%",
      border: "120 12% 76%",
      input: "120 12% 76%",
      ring: "138 28% 40%",
      sidebar: "120 12% 93%",
      sidebarBorder: "120 12% 78%",
    },
  },
  {
    id: "sakura",
    name: "Sakura Blossom",
    description: "Delicate blush pink with blooming petal accents",
    mode: "light",
    previewBg: "#faf4f5",
    previewAccent: "#cb537a",
    tokens: {
      background: "340 22% 97%",
      foreground: "340 20% 15%",
      card: "340 25% 99%",
      cardForeground: "340 20% 15%",
      primary: "341 50% 56%",
      primaryForeground: "0 0% 100%",
      secondary: "340 18% 91%",
      secondaryForeground: "340 22% 24%",
      muted: "340 14% 93%",
      mutedForeground: "340 10% 50%",
      accent: "341 35% 90%",
      accentForeground: "341 40% 40%",
      border: "340 14% 78%",
      input: "340 14% 78%",
      ring: "341 50% 56%",
      sidebar: "340 18% 95%",
      sidebarBorder: "340 14% 80%",
    },
  },
  {
    id: "latte",
    name: "Warm Latte",
    description: "Creamy cappuccino background with rich caramel amber",
    mode: "light",
    previewBg: "#f7f4ee",
    previewAccent: "#b56835",
    tokens: {
      background: "40 20% 95%",
      foreground: "30 25% 15%",
      card: "40 22% 99%",
      cardForeground: "30 25% 15%",
      primary: "28 55% 46%",
      primaryForeground: "0 0% 100%",
      secondary: "38 18% 89%",
      secondaryForeground: "30 20% 22%",
      muted: "38 15% 92%",
      mutedForeground: "32 12% 48%",
      accent: "28 35% 88%",
      accentForeground: "28 45% 35%",
      border: "35 14% 76%",
      input: "35 14% 76%",
      ring: "28 55% 46%",
      sidebar: "38 18% 93%",
      sidebarBorder: "35 14% 78%",
    },
  },
  {
    id: "nordic",
    name: "Nordic Mist",
    description: "Cool glacial slate with tranquil fjord blue accents",
    mode: "light",
    previewBg: "#f1f4f7",
    previewAccent: "#3c7fa8",
    tokens: {
      background: "210 18% 96%",
      foreground: "215 22% 15%",
      card: "210 20% 99%",
      cardForeground: "215 22% 15%",
      primary: "205 48% 45%",
      primaryForeground: "0 0% 100%",
      secondary: "210 16% 90%",
      secondaryForeground: "215 20% 22%",
      muted: "210 14% 93%",
      mutedForeground: "215 10% 50%",
      accent: "205 30% 89%",
      accentForeground: "205 45% 35%",
      border: "210 14% 77%",
      input: "210 14% 77%",
      ring: "205 48% 45%",
      sidebar: "210 16% 94%",
      sidebarBorder: "210 14% 79%",
    },
  },
  {
    id: "midnight",
    name: "Midnight Slate",
    description: "Deep charcoal darkness with soft violet luminous glow",
    mode: "dark",
    previewBg: "#15181f",
    previewAccent: "#9366f9",
    tokens: {
      background: "220 18% 10%",
      foreground: "220 14% 90%",
      card: "220 18% 13%",
      cardForeground: "220 14% 90%",
      primary: "258 70% 66%",
      primaryForeground: "0 0% 100%",
      secondary: "220 14% 18%",
      secondaryForeground: "220 14% 85%",
      muted: "220 14% 16%",
      mutedForeground: "220 10% 55%",
      accent: "258 35% 22%",
      accentForeground: "258 60% 75%",
      border: "220 14% 20%",
      input: "220 14% 20%",
      ring: "258 70% 66%",
      sidebar: "220 18% 8%",
      sidebarBorder: "220 14% 15%",
    },
  },
  {
    id: "pine",
    name: "Pine Forest",
    description: "Moody evergreen woods with crisp mint highlights",
    mode: "dark",
    previewBg: "#131c17",
    previewAccent: "#31c48d",
    tokens: {
      background: "150 18% 9%",
      foreground: "150 14% 90%",
      card: "150 18% 12%",
      cardForeground: "150 14% 90%",
      primary: "156 60% 48%",
      primaryForeground: "150 20% 10%",
      secondary: "150 14% 17%",
      secondaryForeground: "150 14% 85%",
      muted: "150 14% 15%",
      mutedForeground: "150 10% 55%",
      accent: "156 30% 20%",
      accentForeground: "156 50% 70%",
      border: "150 14% 19%",
      input: "150 14% 19%",
      ring: "156 60% 48%",
      sidebar: "150 18% 7%",
      sidebarBorder: "150 14% 14%",
    },
  },
  {
    id: "amber-night",
    name: "Cozy Hearth",
    description: "Warm fireplace dark palette with golden candle glow",
    mode: "dark",
    previewBg: "#1d1815",
    previewAccent: "#f59e0b",
    tokens: {
      background: "25 15% 10%",
      foreground: "35 15% 90%",
      card: "25 15% 13%",
      cardForeground: "35 15% 90%",
      primary: "38 90% 50%",
      primaryForeground: "25 20% 10%",
      secondary: "25 12% 18%",
      secondaryForeground: "35 14% 85%",
      muted: "25 12% 16%",
      mutedForeground: "30 10% 55%",
      accent: "38 40% 22%",
      accentForeground: "38 80% 65%",
      border: "25 12% 20%",
      input: "25 12% 20%",
      ring: "38 90% 50%",
      sidebar: "25 15% 8%",
      sidebarBorder: "25 12% 15%",
    },
  },
];

export const ACCENT_COLORS = [
  { id: "berry", name: "Warm Berry", color: "#a7636e", hsl: "349 28% 52%" },
  { id: "emerald", name: "Forest Emerald", color: "#4a8258", hsl: "138 28% 40%" },
  { id: "ocean", name: "Nordic Blue", color: "#3c7fa8", hsl: "205 48% 45%" },
  { id: "amber", name: "Golden Honey", color: "#b56835", hsl: "28 55% 46%" },
  { id: "violet", name: "Lavender Violet", color: "#8b5cf6", hsl: "258 70% 66%" },
  { id: "rose", name: "Sakura Rose", color: "#cb537a", hsl: "341 50% 56%" },
  { id: "mint", name: "Crisp Mint", color: "#31c48d", hsl: "156 60% 48%" },
  { id: "gold", name: "Warm Amber", color: "#f59e0b", hsl: "38 90% 50%" },
  { id: "cyan", name: "Arctic Cyan", color: "#06b6d4", hsl: "188 86% 43%" },
  { id: "coral", name: "Sunset Coral", color: "#f97316", hsl: "24 95% 53%" },
  { id: "ruby", name: "Crimson Ruby", color: "#e11d48", hsl: "347 77% 50%" },
  { id: "lime", name: "Neon Lime", color: "#84cc16", hsl: "84 81% 44%" },
];

// ═════════════════════════════════════════════════════════════════════════════
// COLOR UTILITIES: HEX / RGB / HSL CONVERTERS & GENERATOR
// ═════════════════════════════════════════════════════════════════════════════

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 120, g: 120, b: 120 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToCssString(h: number, s: number, l: number): string {
  const clampedH = Math.max(0, Math.min(360, Math.round(h)));
  const clampedS = Math.max(0, Math.min(100, Math.round(s)));
  const clampedL = Math.max(0, Math.min(100, Math.round(l)));
  return `${clampedH} ${clampedS}% ${clampedL}%`;
}

export function generateCustomThemeTokens(options: {
  mode: "light" | "dark";
  baseHex: string;
  accentHex: string;
  cardTint?: "clean" | "tinted" | "contrast";
  sidebarTint?: "matching" | "contrast" | "deep";
}): ThemeTokens {
  const { mode, baseHex, accentHex, cardTint = "clean", sidebarTint = "matching" } = options;

  const baseHsl = hexToHsl(baseHex);
  const accHsl = hexToHsl(accentHex);

  if (mode === "light") {
    // Light mode calculation
    const baseH = baseHsl.h;
    const baseS = Math.min(baseHsl.s, 28);
    const baseL = Math.max(88, Math.min(baseHsl.l, 97));

    const accH = accHsl.h;
    const accS = Math.max(35, accHsl.s);
    const accL = Math.max(36, Math.min(accHsl.l, 54));

    // Card background: Clean (pure white), Tinted (colored pastel wash), Contrast (light gray)
    let cardL = 100;
    let cardS = 0;
    let cardH = baseH;
    if (cardTint === "tinted") {
      cardH = baseH;
      cardS = Math.min(baseS + 12, 35);
      cardL = Math.max(93, baseL - 2);
    } else if (cardTint === "contrast") {
      cardH = baseH;
      cardS = Math.max(4, baseS - 6);
      cardL = Math.min(99, baseL + 2);
    }

    // Sidebar: Matching (same as canvas), Contrast (slight shift), Deep (noticeably darker)
    let sidebarL = baseL;
    let sidebarS = baseS;
    if (sidebarTint === "contrast") {
      sidebarL = Math.max(84, baseL - 4);
    } else if (sidebarTint === "deep") {
      sidebarL = Math.max(76, baseL - 9);
      sidebarS = Math.min(baseS + 4, 30);
    }

    return {
      background: hslToCssString(baseH, baseS, baseL),
      foreground: hslToCssString(baseH, Math.min(baseS + 6, 32), 12),
      card: hslToCssString(cardH, cardS, cardL),
      cardForeground: hslToCssString(baseH, Math.min(baseS + 6, 32), 12),
      primary: hslToCssString(accH, accS, accL),
      primaryForeground: "0 0% 100%",
      secondary: hslToCssString(baseH, baseS, Math.max(80, baseL - 7)),
      secondaryForeground: hslToCssString(baseH, Math.min(baseS + 6, 32), 20),
      muted: hslToCssString(baseH, Math.max(8, baseS - 4), Math.max(86, baseL - 4)),
      mutedForeground: hslToCssString(baseH, Math.max(6, baseS - 8), 44),
      accent: hslToCssString(accH, Math.min(accS, 32), 90),
      accentForeground: hslToCssString(accH, Math.min(accS + 10, 50), 32),
      border: hslToCssString(baseH, Math.max(10, baseS - 2), Math.max(70, baseL - 18)),
      input: hslToCssString(baseH, Math.max(10, baseS - 2), Math.max(70, baseL - 18)),
      ring: hslToCssString(accH, accS, accL),
      sidebar: hslToCssString(baseH, sidebarS, sidebarL),
      sidebarBorder: hslToCssString(baseH, Math.max(10, sidebarS - 2), Math.max(68, sidebarL - 14)),
    };
  } else {
    // Dark mode calculation
    const baseH = baseHsl.h;
    const baseS = Math.min(baseHsl.s, 28);
    const baseL = Math.max(6, Math.min(baseHsl.l, 16));

    const accH = accHsl.h;
    const accS = Math.max(45, accHsl.s);
    const accL = Math.max(52, Math.min(accHsl.l, 72));

    // Card background in dark mode
    let cardL = Math.min(18, baseL + 3);
    let cardS = Math.min(baseS + 2, 22);
    let cardH = baseH;
    if (cardTint === "tinted") {
      cardH = accH;
      cardS = Math.min(accS, 28);
      cardL = Math.min(20, baseL + 4);
    } else if (cardTint === "contrast") {
      cardH = baseH;
      cardS = baseS;
      cardL = Math.min(26, baseL + 8);
    }

    // Sidebar in dark mode
    let sidebarL = baseL;
    let sidebarS = baseS;
    if (sidebarTint === "contrast") {
      sidebarL = Math.min(22, baseL + 4);
    } else if (sidebarTint === "deep") {
      sidebarL = Math.max(3, baseL - 4);
      sidebarS = Math.max(4, baseS - 4);
    }

    return {
      background: hslToCssString(baseH, baseS, baseL),
      foreground: hslToCssString(baseH, Math.max(8, baseS - 4), 92),
      card: hslToCssString(cardH, cardS, cardL),
      cardForeground: hslToCssString(baseH, Math.max(8, baseS - 4), 92),
      primary: hslToCssString(accH, accS, accL),
      primaryForeground: "0 0% 100%",
      secondary: hslToCssString(baseH, baseS, Math.min(28, baseL + 8)),
      secondaryForeground: hslToCssString(baseH, Math.max(8, baseS - 4), 88),
      muted: hslToCssString(baseH, Math.max(8, baseS - 4), Math.min(26, baseL + 6)),
      mutedForeground: hslToCssString(baseH, Math.max(6, baseS - 8), 58),
      accent: hslToCssString(accH, Math.min(accS, 35), 22),
      accentForeground: hslToCssString(accH, Math.min(accS + 10, 65), 78),
      border: hslToCssString(baseH, Math.max(8, baseS - 4), Math.min(30, baseL + 10)),
      input: hslToCssString(baseH, Math.max(8, baseS - 4), Math.min(30, baseL + 10)),
      ring: hslToCssString(accH, accS, accL),
      sidebar: hslToCssString(baseH, sidebarS, sidebarL),
      sidebarBorder: hslToCssString(baseH, Math.max(8, sidebarS - 4), Math.min(28, sidebarL + 8)),
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// STORAGE HELPERS FOR CUSTOM THEMES
// ═════════════════════════════════════════════════════════════════════════════

const STORAGE_CUSTOM_THEMES_KEY = "laya-custom-themes-library";

export function getCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load custom themes from storage:", e);
    return [];
  }
}

export function saveCustomTheme(theme: CustomTheme): void {
  try {
    const current = getCustomThemes();
    const index = current.findIndex((t) => t.id === theme.id);
    let next: CustomTheme[];
    if (index >= 0) {
      next = current.map((t) => (t.id === theme.id ? theme : t));
    } else {
      next = [theme, ...current];
    }
    localStorage.setItem(STORAGE_CUSTOM_THEMES_KEY, JSON.stringify(next));
  } catch (e) {
    console.error("Failed to save custom theme:", e);
  }
}

export function deleteCustomTheme(id: string): void {
  try {
    const current = getCustomThemes();
    const next = current.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_CUSTOM_THEMES_KEY, JSON.stringify(next));
  } catch (e) {
    console.error("Failed to delete custom theme:", e);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// APPLY THEME ENGINE
// ═════════════════════════════════════════════════════════════════════════════

export function applyTheme(
  themeId: string,
  customAccentId?: string,
  explicitCustomTheme?: CustomTheme
) {
  let mode: "light" | "dark" = "light";
  let tokens: ThemeTokens | undefined;

  // 1. Check if explicit custom theme is provided
  if (explicitCustomTheme) {
    mode = explicitCustomTheme.mode;
    tokens = { ...explicitCustomTheme.tokens };
  } else if (themeId.startsWith("custom-")) {
    // 2. Lookup in saved custom themes
    const customList = getCustomThemes();
    const found = customList.find((t) => t.id === themeId);
    if (found) {
      mode = found.mode;
      tokens = { ...found.tokens };
    }
  }

  // 3. Fallback to standard presets if not custom
  if (!tokens) {
    const preset = THEME_PRESETS.find((p) => p.id === themeId) || THEME_PRESETS[0];
    mode = preset.mode;
    tokens = { ...preset.tokens };
  }

  const root = document.documentElement;

  // Apply dark / light class
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // If custom accent override is specified on built-in preset
  if (customAccentId && !themeId.startsWith("custom-")) {
    const accent = ACCENT_COLORS.find((a) => a.id === customAccentId);
    if (accent) {
      tokens.primary = accent.hsl;
      tokens.ring = accent.hsl;
    }
  }

  root.style.setProperty("--background", tokens.background);
  root.style.setProperty("--foreground", tokens.foreground);
  root.style.setProperty("--card", tokens.card);
  root.style.setProperty("--card-foreground", tokens.cardForeground);
  root.style.setProperty("--popover", tokens.card);
  root.style.setProperty("--popover-foreground", tokens.cardForeground);
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--primary-foreground", tokens.primaryForeground);
  root.style.setProperty("--secondary", tokens.secondary);
  root.style.setProperty("--secondary-foreground", tokens.secondaryForeground);
  root.style.setProperty("--muted", tokens.muted);
  root.style.setProperty("--muted-foreground", tokens.mutedForeground);
  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--accent-foreground", tokens.accentForeground);
  root.style.setProperty("--border", tokens.border);
  root.style.setProperty("--input", tokens.input);
  root.style.setProperty("--ring", tokens.ring);
  root.style.setProperty("--sidebar", tokens.sidebar);
  root.style.setProperty("--sidebar-border", tokens.sidebarBorder);
}
