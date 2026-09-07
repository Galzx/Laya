import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wand2,
  Sparkles,
  Sun,
  Moon,
  Check,
  X,
  Palette,
  Eye,
  Hash,
  Info,
  CheckSquare,
  FolderKanban,
  CalendarDays,
  Settings,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  type CustomTheme,
  generateCustomThemeTokens,
  saveCustomTheme,
  applyTheme,
  ACCENT_COLORS,
} from "../../lib/theme";

export interface ThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme?: CustomTheme | null;
  onSaved: (theme: CustomTheme) => void;
}

// ── Curated Inspirations for the "Surprise Me" Engine ──
interface ThemeInspiration {
  name: string;
  mode: "light" | "dark";
  baseHex: string;
  accentHex: string;
  cardTint: "clean" | "tinted" | "contrast";
}

const THEME_INSPIRATIONS: ThemeInspiration[] = [
  { name: "Tokyo Cyberpunk", mode: "dark", baseHex: "#0c0d18", accentHex: "#a855f7", cardTint: "contrast" },
  { name: "Nordic Glacier", mode: "light", baseHex: "#cfe7f8", accentHex: "#0284c7", cardTint: "clean" },
  { name: "Matcha Latte", mode: "light", baseHex: "#d8ebd8", accentHex: "#16a34a", cardTint: "tinted" },
  { name: "Sunset Horizon", mode: "dark", baseHex: "#1f140e", accentHex: "#f97316", cardTint: "contrast" },
  { name: "Sakura Blossom", mode: "light", baseHex: "#fcdbe4", accentHex: "#e11d48", cardTint: "tinted" },
  { name: "Obsidian Velvet", mode: "dark", baseHex: "#09090b", accentHex: "#8b5cf6", cardTint: "clean" },
  { name: "Golden Buttercream", mode: "light", baseHex: "#faeec8", accentHex: "#d97706", cardTint: "clean" },
  { name: "Emerald Forest", mode: "dark", baseHex: "#0a1a12", accentHex: "#10b981", cardTint: "contrast" },
  { name: "Electric Dusk", mode: "dark", baseHex: "#081b26", accentHex: "#06b6d4", cardTint: "contrast" },
  { name: "Warm Linen & Sand", mode: "light", baseHex: "#eee4cf", accentHex: "#b45309", cardTint: "tinted" },
  { name: "Midnight Nebula", mode: "dark", baseHex: "#1a0f2e", accentHex: "#d946ef", cardTint: "contrast" },
  { name: "Lavender Twilight", mode: "light", baseHex: "#e4d5fa", accentHex: "#7c3aed", cardTint: "clean" },
];

export const LIGHT_BASE_PRESETS = [
  { name: "Matcha Garden", hex: "#d8ebd8", previewGrad: "linear-gradient(135deg, #d8ebd8 0%, #c3e2c3 100%)" },
  { name: "Sakura Rose", hex: "#fcdbe4", previewGrad: "linear-gradient(135deg, #fcdbe4 0%, #f8c8d5 100%)" },
  { name: "Warm Oatmeal", hex: "#eee4cf", previewGrad: "linear-gradient(135deg, #eee4cf 0%, #e6d5b8 100%)" },
  { name: "Golden Honey", hex: "#faeec8", previewGrad: "linear-gradient(135deg, #faeec8 0%, #f5e2a6 100%)" },
  { name: "Glacial Sky", hex: "#cfe7f8", previewGrad: "linear-gradient(135deg, #cfe7f8 0%, #b8daf2 100%)" },
  { name: "Lavender Mist", hex: "#e4d5fa", previewGrad: "linear-gradient(135deg, #e4d5fa 0%, #d3bdf5 100%)" },
  { name: "Peach Sunset", hex: "#fcd4be", previewGrad: "linear-gradient(135deg, #fcd4be 0%, #f9be9e 100%)" },
  { name: "Crisp Mint", hex: "#d2f2e5", previewGrad: "linear-gradient(135deg, #d2f2e5 0%, #b8ead4 100%)" },
];

export const DARK_BASE_PRESETS = [
  { name: "Midnight Slate", hex: "#111827", previewGrad: "linear-gradient(135deg, #111827 0%, #1e293b 100%)" },
  { name: "Obsidian Pitch", hex: "#09090b", previewGrad: "linear-gradient(135deg, #09090b 0%, #18181b 100%)" },
  { name: "Deep Spruce", hex: "#0a1a12", previewGrad: "linear-gradient(135deg, #0a1a12 0%, #142e20 100%)" },
  { name: "Cozy Hearth", hex: "#1f140e", previewGrad: "linear-gradient(135deg, #1f140e 0%, #301d12 100%)" },
  { name: "Cosmic Nebula", hex: "#1a0f2e", previewGrad: "linear-gradient(135deg, #1a0f2e 0%, #29154a 100%)" },
  { name: "Ocean Abyss", hex: "#081b26", previewGrad: "linear-gradient(135deg, #081b26 0%, #112a3d 100%)" },
  { name: "Black Cherry", hex: "#260d18", previewGrad: "linear-gradient(135deg, #260d18 0%, #3d1425 100%)" },
  { name: "Cyber Charcoal", hex: "#13171f", previewGrad: "linear-gradient(135deg, #13171f 0%, #202633 100%)" },
];

export const ThemeStudioModal: React.FC<ThemeStudioModalProps> = ({
  isOpen,
  onClose,
  initialTheme,
  onSaved,
}) => {
  const [themeName, setThemeName] = useState(initialTheme?.name || "My Cozy Theme");
  const [mode, setMode] = useState<"light" | "dark">(initialTheme?.mode || "light");
  const [baseHex, setBaseHex] = useState(initialTheme?.baseColor || (initialTheme?.mode === "dark" ? "#111827" : "#d8ebd8"));
  const [accentHex, setAccentHex] = useState(initialTheme?.accentColor || "#16a34a");
  const [cardTint, setCardTint] = useState<"clean" | "tinted" | "contrast">(initialTheme?.cardTint || "clean");
  const [sidebarTint, setSidebarTint] = useState<"matching" | "contrast" | "deep">(initialTheme?.sidebarTint || "matching");

  // Change feedback inspector
  const [changeInfo, setChangeInfo] = useState<{
    title: string;
    description: string;
    impact: string;
    target: "mode" | "base" | "accent" | "card" | "sidebar";
  }>({
    title: "Base Canvas Atmosphere",
    description: "Matcha Garden palette selected.",
    impact: "Controls main background, workspace canvas, and modal backing.",
    target: "base",
  });

  // Mini preview interactive task state
  const [previewChecked, setPreviewChecked] = useState(false);
  const [isPreviewingLive, setIsPreviewingLive] = useState(false);

  // Initialize when opening
  useEffect(() => {
    if (isOpen) {
      if (initialTheme) {
        setThemeName(initialTheme.name);
        setMode(initialTheme.mode);
        setBaseHex(initialTheme.baseColor);
        setAccentHex(initialTheme.accentColor);
        setCardTint(initialTheme.cardTint || "clean");
        setSidebarTint(initialTheme.sidebarTint || "matching");
      } else {
        setThemeName("My Custom Theme");
        setMode("light");
        setBaseHex("#d8ebd8");
        setAccentHex("#16a34a");
        setCardTint("clean");
        setSidebarTint("matching");
      }
      setIsPreviewingLive(false);
    }
  }, [isOpen, initialTheme]);

  if (!isOpen) return null;

  // Generate tokens for current options
  const previewTokens = generateCustomThemeTokens({
    mode,
    baseHex,
    accentHex,
    cardTint,
    sidebarTint,
  });

  const handleModeChange = (newMode: "light" | "dark") => {
    setMode(newMode);
    if (newMode === "light" && (baseHex.startsWith("#0") || baseHex.startsWith("#1") || baseHex.startsWith("#2") || baseHex.startsWith("#3"))) {
      setBaseHex("#d8ebd8");
      setAccentHex("#16a34a");
    } else if (newMode === "dark" && (baseHex.startsWith("#f") || baseHex.startsWith("#e") || baseHex.startsWith("#d") || baseHex.startsWith("#c"))) {
      setBaseHex("#111827");
      setAccentHex("#8b5cf6");
    }
    setChangeInfo({
      title: `Switched to ${newMode === "light" ? "Light" : "Dark"} Mode`,
      description: `Optimized color contrast and ambient lighting for ${newMode} environments.`,
      impact: "All surface tokens, text readability, and background brightness recalculate automatically.",
      target: "mode",
    });
  };

  const handleSelectBase = (name: string, hex: string) => {
    setBaseHex(hex);
    setChangeInfo({
      title: `Base Canvas: ${name} (${hex})`,
      description: "Set the ambient room tone and foundational background palette.",
      impact: "Changes the main workspace window, background canvas, and dialog backdrops.",
      target: "base",
    });
  };

  const handleSelectAccent = (name: string, hex: string) => {
    setAccentHex(hex);
    setChangeInfo({
      title: `Accent Glow: ${name} (${hex})`,
      description: "Set the radiant focal color and interactive button glow.",
      impact: "Changes primary action buttons, active notebook tags, progress bars, and focus rings.",
      target: "accent",
    });
  };

  const handleSelectCardTint = (tint: "clean" | "tinted" | "contrast") => {
    setCardTint(tint);
    const descriptions = {
      clean: {
        title: "Card Style: Clean Minimal",
        desc: "Pure solid background with delicate outlines.",
        impact: "Gives task items, notebook cards, and detail panels a clean, crisp surface.",
      },
      tinted: {
        title: "Card Style: Soft Pastel Tint",
        desc: "Cards absorb a cozy pastel tint wash from your base tone.",
        impact: "Warm tactile paper feel across all task cards, milestones, and note blocks.",
      },
      contrast: {
        title: "Card Style: High Contrast",
        desc: "Bright elevated cards with bold border separation.",
        impact: "Maximum visual separation between cards and the workspace canvas.",
      },
    };
    setChangeInfo({
      title: descriptions[tint].title,
      description: descriptions[tint].desc,
      impact: descriptions[tint].impact,
      target: "card",
    });
  };

  const handleSelectSidebarTint = (sidebar: "matching" | "contrast" | "deep") => {
    setSidebarTint(sidebar);
    const descriptions = {
      matching: {
        title: "Sidebar: Seamless Blend",
        desc: "Sidebar merges smoothly with the main canvas color.",
        impact: "Unified single-canvas aesthetic across the entire window.",
      },
      contrast: {
        title: "Sidebar: Subtle Separation",
        desc: "Sidebar adds a soft shade shift and dividing border.",
        impact: "Gentle visual guide separating navigation from workspace content.",
      },
      deep: {
        title: "Sidebar: Deep Focused Tone",
        desc: "Sidebar shifts into a distinct darker navigation rail.",
        impact: "Strong architectural depth directing visual focus to active tasks.",
      },
    };
    setChangeInfo({
      title: descriptions[sidebar].title,
      description: descriptions[sidebar].desc,
      impact: descriptions[sidebar].impact,
      target: "sidebar",
    });
  };

  const handleSurpriseMe = () => {
    const random = THEME_INSPIRATIONS[Math.floor(Math.random() * THEME_INSPIRATIONS.length)];
    setThemeName(random.name);
    setMode(random.mode);
    setBaseHex(random.baseHex);
    setAccentHex(random.accentHex);
    setCardTint(random.cardTint);
    setChangeInfo({
      title: `Applied Inspiration: ${random.name}`,
      description: "Blended a curated harmonic palette with balanced lighting and accents.",
      impact: "Updated canvas atmosphere, accent glow, and card contrast.",
      target: "accent",
    });
  };

  const handleApplyInspiration = (insp: ThemeInspiration) => {
    setThemeName(insp.name);
    setMode(insp.mode);
    setBaseHex(insp.baseHex);
    setAccentHex(insp.accentHex);
    setCardTint(insp.cardTint);
    setChangeInfo({
      title: `Applied Inspiration: ${insp.name}`,
      description: "Blended a curated harmonic palette with balanced lighting and accents.",
      impact: "Updated canvas atmosphere, accent glow, and card contrast.",
      target: "accent",
    });
  };

  const handlePreviewInApp = () => {
    const tempTheme: CustomTheme = {
      id: initialTheme?.id || `custom-${Date.now()}`,
      name: themeName.trim() || "Untitled Theme",
      mode,
      baseColor: baseHex,
      accentColor: accentHex,
      cardTint,
      sidebarTint,
      tokens: previewTokens,
      created_at: initialTheme?.created_at || Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };
    applyTheme(tempTheme.id, undefined, tempTheme);
    setIsPreviewingLive(true);
  };

  const handleSaveTheme = () => {
    const id = initialTheme?.id || `custom-${Date.now()}`;
    const customTheme: CustomTheme = {
      id,
      name: themeName.trim() || "My Custom Theme",
      mode,
      baseColor: baseHex,
      accentColor: accentHex,
      cardTint,
      sidebarTint,
      tokens: previewTokens,
      created_at: initialTheme?.created_at || Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };

    saveCustomTheme(customTheme);
    applyTheme(id, undefined, customTheme);
    onSaved(customTheme);
    onClose();
  };

  const activeBasePresets = mode === "light" ? LIGHT_BASE_PRESETS : DARK_BASE_PRESETS;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-backdrop-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-3xl shadow-dialog max-w-5xl w-full overflow-hidden animate-dialog-in flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── STUDIO HEADER ──────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Theme Studio
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Custom Palette Creator
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Craft your personalized aesthetic with real-time UI simulation & live inspector
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border transition-all cursor-pointer shadow-2xs group active:scale-95"
              title="Generate a random cohesive palette"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
              <span>Surprise Me</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── STUDIO BODY: TWO COLUMNS (CONTROLS & LIVE SIMULATOR) ─────────── */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLUMNS: CUSTOMIZATION CONTROLS */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Theme Name & Mode Selector */}
            <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-semibold text-foreground">Theme Name</label>
                  <input
                    type="text"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="e.g. Cyberpunk Velvet, Matcha Glow…"
                    className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>

                {/* Light / Dark Mode Toggle with Flying Highlight Glider */}
                <div className="space-y-1 shrink-0">
                  <label className="text-xs font-semibold text-foreground">Appearance Mode</label>
                  <div className="relative flex items-center bg-background border border-border p-0.5 rounded-xl overflow-hidden shadow-inner">
                    {/* Animated Flying Highlight Glider Box */}
                    <div
                      className={cn(
                        "absolute inset-y-0.5 rounded-lg border shadow-xs transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none",
                        mode === "light"
                          ? "left-0.5 w-[calc(50%-2px)] bg-amber-500/10 border-amber-500/30"
                          : "left-[calc(50%+1px)] w-[calc(50%-2px)] bg-purple-500/10 border-purple-500/30"
                      )}
                    />

                    <button
                      type="button"
                      onClick={() => handleModeChange("light")}
                      className={cn(
                        "relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer select-none",
                        mode === "light"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange("dark")}
                      className={cn(
                        "relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer select-none",
                        mode === "dark"
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Moon className="h-3.5 w-3.5 text-purple-400" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Base Canvas Atmosphere Tone */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <label className="text-xs font-semibold text-foreground">
                      1. Base Canvas Atmosphere Tone
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Sets the main workspace backdrop and room lighting
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted border border-border text-[11px] font-mono">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={baseHex}
                      onChange={(e) => {
                        setBaseHex(e.target.value);
                        setChangeInfo({
                          title: `Custom Base Hex: ${e.target.value}`,
                          description: "Custom background color applied.",
                          impact: "Changes the main workspace window and background canvas.",
                          target: "base",
                        });
                      }}
                      className="w-16 bg-transparent text-foreground uppercase focus:outline-none"
                    />
                  </div>
                  <input
                    type="color"
                    value={baseHex.startsWith("#") && baseHex.length === 7 ? baseHex : "#d8ebd8"}
                    onChange={(e) => {
                      setBaseHex(e.target.value);
                      setChangeInfo({
                        title: `Custom Base Color: ${e.target.value}`,
                        description: "Custom background color selected from wheel.",
                        impact: "Changes the main workspace window and background canvas.",
                        target: "base",
                      });
                    }}
                    className="w-7 h-7 rounded-lg border border-border cursor-pointer p-0 bg-transparent overflow-hidden active:scale-95 transition-transform"
                    title="Choose custom background color"
                  />
                </div>
              </div>

              {/* Rich Visual Swatch Presets with Spring Pop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {activeBasePresets.map((swatch) => {
                  const isSelected = baseHex.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.name}
                      type="button"
                      onClick={() => handleSelectBase(swatch.name, swatch.hex)}
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-xl border text-left cursor-pointer group select-none relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95",
                        isSelected
                          ? "ring-2 ring-primary border-primary bg-primary/10 shadow-xs font-semibold scale-[1.02]"
                          : "border-border hover:border-primary/40 bg-card hover:bg-muted/40"
                      )}
                    >
                      {/* Colored swatch preview box */}
                      <div
                        className="w-8 h-8 rounded-lg border border-black/15 shadow-inner flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                        style={{ background: swatch.previewGrad || swatch.hex }}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-foreground/80 drop-shadow-xs" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">
                          {swatch.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {swatch.hex}
                        </p>
                      </div>

                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-auto animate-dialog-in" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Primary Brand Glow & Accent Color */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <label className="text-xs font-semibold text-foreground">
                      2. Primary Accent & Interactive Glow
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Colors buttons, active tabs, progress bars, and badges
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted border border-border text-[11px] font-mono">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={accentHex}
                      onChange={(e) => {
                        setAccentHex(e.target.value);
                        setChangeInfo({
                          title: `Custom Accent Hex: ${e.target.value}`,
                          description: "Custom accent color applied.",
                          impact: "Changes primary buttons, active tags, and milestone meters.",
                          target: "accent",
                        });
                      }}
                      className="w-16 bg-transparent text-foreground uppercase focus:outline-none"
                    />
                  </div>
                  <input
                    type="color"
                    value={accentHex.startsWith("#") && accentHex.length === 7 ? accentHex : "#16a34a"}
                    onChange={(e) => {
                      setAccentHex(e.target.value);
                      setChangeInfo({
                        title: `Custom Accent Color: ${e.target.value}`,
                        description: "Custom accent color selected from wheel.",
                        impact: "Changes primary buttons, active tags, and milestone meters.",
                        target: "accent",
                      });
                    }}
                    className="w-7 h-7 rounded-lg border border-border cursor-pointer p-0 bg-transparent overflow-hidden active:scale-95 transition-transform"
                    title="Choose custom accent color"
                  />
                </div>
              </div>

              {/* Accent Palette Swatches with Animated Pill Rings */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {ACCENT_COLORS.map((acc) => {
                  const isSelected = accentHex.toLowerCase() === acc.color.toLowerCase();
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectAccent(acc.name, acc.color)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-left transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95",
                        isSelected
                          ? "ring-2 ring-primary border-primary bg-primary/10 shadow-2xs font-semibold text-foreground scale-[1.02]"
                          : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-white/20 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: acc.color }}
                      />
                      <span className="text-xs truncate">{acc.name}</span>
                      {isSelected && <Check className="h-3 w-3 text-primary ml-auto shrink-0 animate-dialog-in" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Surface Card & Contrast Tuning with Flying Highlight Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Card & Container Tint with Flying Highlight Glider */}
              <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border border-border/60">
                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Card & Container Style</span>
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Alters card background wash & border outline
                  </p>
                </div>

                <div className="relative flex items-center bg-muted/50 p-1 rounded-xl border border-border text-xs overflow-hidden shadow-inner">
                  {/* Animated Flying Highlight Box */}
                  <div
                    className="absolute inset-y-1 rounded-lg bg-background text-foreground shadow-sm border border-border/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
                    style={{
                      left: cardTint === "clean" ? "4px" : cardTint === "tinted" ? "calc(33.333% + 2px)" : "calc(66.666% - 1px)",
                      width: "calc(33.333% - 4px)",
                    }}
                  />

                  {(
                    [
                      { id: "clean", label: "Clean" },
                      { id: "tinted", label: "Soft Tint" },
                      { id: "contrast", label: "High Contrast" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectCardTint(t.id)}
                      className={cn(
                        "relative z-10 flex-1 py-1.5 rounded-lg transition-colors text-center cursor-pointer text-[11px] select-none",
                        cardTint === t.id
                          ? "font-semibold text-primary"
                          : "text-muted-foreground hover:text-foreground font-medium"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground/80 italic line-clamp-1">
                  {cardTint === "clean" && "• Pure solid surface with clean outlines"}
                  {cardTint === "tinted" && "• Warm cozy pastel wash matching room tone"}
                  {cardTint === "contrast" && "• Elevated card brightness with distinct border"}
                </p>
              </div>

              {/* Sidebar Depth with Flying Highlight Glider */}
              <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border border-border/60">
                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Navigation Sidebar Depth</span>
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Alters left navigation rail tone & divider
                  </p>
                </div>

                <div className="relative flex items-center bg-muted/50 p-1 rounded-xl border border-border text-xs overflow-hidden shadow-inner">
                  {/* Animated Flying Highlight Box */}
                  <div
                    className="absolute inset-y-1 rounded-lg bg-background text-foreground shadow-sm border border-border/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
                    style={{
                      left: sidebarTint === "matching" ? "4px" : sidebarTint === "contrast" ? "calc(33.333% + 2px)" : "calc(66.666% - 1px)",
                      width: "calc(33.333% - 4px)",
                    }}
                  />

                  {(
                    [
                      { id: "matching", label: "Seamless" },
                      { id: "contrast", label: "Subtle" },
                      { id: "deep", label: "Deep Tone" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSidebarTint(s.id)}
                      className={cn(
                        "relative z-10 flex-1 py-1.5 rounded-lg transition-colors text-center cursor-pointer text-[11px] select-none",
                        sidebarTint === s.id
                          ? "font-semibold text-primary"
                          : "text-muted-foreground hover:text-foreground font-medium"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground/80 italic line-clamp-1">
                  {sidebarTint === "matching" && "• Seamlessly blends with workspace canvas"}
                  {sidebarTint === "contrast" && "• Gentle shade difference with subtle border"}
                  {sidebarTint === "deep" && "• Darker focused rail directing eye to tasks"}
                </p>
              </div>
            </div>

            {/* Quick Inspirations Carousel Pills */}
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Instant Presets & Inspirations
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {THEME_INSPIRATIONS.map((insp) => (
                  <button
                    key={insp.name}
                    type="button"
                    onClick={() => handleApplyInspiration(insp)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:border-primary/50 bg-background text-[11px] font-medium text-muted-foreground hover:text-foreground shrink-0 transition-all duration-200 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: insp.accentHex }}
                    />
                    <span>{insp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: LIVE REAL-TIME UI SIMULATOR & CHANGE INSPECTOR */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Live UI Simulation & Feedback
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Real-Time CSS Render
              </span>
            </div>

            {/* Simulated Laya Window Sandbox with Animated Element Focus Ring */}
            <div
              className="rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300 flex flex-col text-xs relative"
              style={{
                backgroundColor: `hsl(${previewTokens.background})`,
                color: `hsl(${previewTokens.foreground})`,
                borderColor: `hsl(${previewTokens.border})`,
              }}
            >
              {/* Simulated App Topbar */}
              <div
                className="px-3.5 py-2 border-b flex items-center justify-between select-none transition-colors"
                style={{
                  backgroundColor: `hsl(${previewTokens.card})`,
                  borderColor: `hsl(${previewTokens.border})`,
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                    <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="font-bold text-[11px] ml-1 tracking-tight">Laya Workspace</span>
                </div>

                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all duration-300"
                  style={{
                    backgroundColor: `hsl(${previewTokens.accent})`,
                    color: `hsl(${previewTokens.accentForeground})`,
                    borderColor: `hsl(${previewTokens.border})`,
                  }}
                >
                  {themeName || "Custom Theme"}
                </span>
              </div>

              {/* Simulated Main Body (Sidebar + Content Workspace) */}
              <div className="flex items-stretch min-h-[220px]">
                {/* Simulated Mini Sidebar with Animated Focus Pulse */}
                <div
                  className={cn(
                    "w-24 p-2 border-r flex flex-col gap-1.5 shrink-0 transition-all duration-300 select-none relative",
                    changeInfo.target === "sidebar" && "ring-2 ring-primary ring-inset shadow-inner"
                  )}
                  style={{
                    backgroundColor: `hsl(${previewTokens.sidebar})`,
                    borderColor: `hsl(${previewTokens.sidebarBorder})`,
                  }}
                >
                  <div className="text-[9px] font-bold opacity-60 uppercase tracking-wider px-1 pb-1">
                    Menu
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all duration-300"
                    style={{
                      backgroundColor: `hsl(${previewTokens.primary})`,
                      color: `hsl(${previewTokens.primaryForeground})`,
                    }}
                  >
                    <CheckSquare className="h-3 w-3 shrink-0" />
                    <span className="truncate">Tasks</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] opacity-70 hover:opacity-100">
                    <FolderKanban className="h-3 w-3 shrink-0" />
                    <span className="truncate">Projects</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] opacity-70 hover:opacity-100">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    <span className="truncate">Calendar</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] opacity-70 hover:opacity-100 mt-auto">
                    <Settings className="h-3 w-3 shrink-0" />
                    <span className="truncate">Settings</span>
                  </div>
                </div>

                {/* Simulated Content Workspace */}
                <div className="flex-1 p-3.5 space-y-3 overflow-hidden">
                  {/* Simulated Interactive Task Item */}
                  <div
                    onClick={() => setPreviewChecked(!previewChecked)}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all duration-300 shadow-2xs hover:scale-[1.01] active:scale-98",
                      changeInfo.target === "card" && "ring-2 ring-primary ring-offset-1"
                    )}
                    style={{
                      backgroundColor: `hsl(${previewTokens.card})`,
                      borderColor: `hsl(${previewTokens.border})`,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0",
                          previewChecked ? "scale-105" : ""
                        )}
                        style={{
                          backgroundColor: previewChecked ? `hsl(${previewTokens.primary})` : "transparent",
                          borderColor: `hsl(${previewTokens.primary})`,
                        }}
                      >
                        {previewChecked && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span
                        className={cn(
                          "truncate text-[11px] font-medium transition-all",
                          previewChecked && "line-through opacity-50"
                        )}
                      >
                        Quarterly design goals
                      </span>
                    </div>

                    <span
                      className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 transition-colors"
                      style={{
                        backgroundColor: `hsl(${previewTokens.primary})`,
                        color: `hsl(${previewTokens.primaryForeground})`,
                      }}
                    >
                      Active
                    </span>
                  </div>

                  {/* Simulated Mini Gemini Notebook Cover Card */}
                  <div
                    className={cn(
                      "rounded-xl border overflow-hidden shadow-xs transition-all duration-300",
                      changeInfo.target === "card" && "ring-2 ring-primary ring-offset-1"
                    )}
                    style={{
                      backgroundColor: `hsl(${previewTokens.card})`,
                      borderColor: `hsl(${previewTokens.border})`,
                    }}
                  >
                    <div
                      className="h-10 w-full relative p-2 flex items-end transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, hsl(${previewTokens.primary}) 0%, hsl(${previewTokens.accent}) 100%)`,
                      }}
                    >
                      <div className="text-white drop-shadow flex items-center gap-1 text-[9px] font-bold">
                        <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                        <span>Research Notebook</span>
                      </div>
                    </div>

                    <div className="p-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] opacity-75">
                        <span>Progress</span>
                        <span className="font-mono font-bold">80%</span>
                      </div>
                      <div
                        className="w-full h-1 rounded-full overflow-hidden transition-colors"
                        style={{ backgroundColor: `hsl(${previewTokens.muted})` }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: "80%",
                            backgroundColor: `hsl(${previewTokens.primary})`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action & Fullscreen Test */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: `hsl(${previewTokens.primary})` }}
                      />
                      <span className="text-[9px] opacity-80 font-medium">Interactive Canvas</span>
                    </div>

                    <button
                      type="button"
                      onClick={handlePreviewInApp}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[9px] shadow-xs cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                      style={{
                        backgroundColor: `hsl(${previewTokens.primary})`,
                        color: `hsl(${previewTokens.primaryForeground})`,
                      }}
                    >
                      <Eye className="h-2.5 w-2.5" />
                      <span>Test Live</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── LIVE IMPACT INSPECTOR CALLOUT ───────────────────────────── */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5 animate-smooth-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{changeInfo.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {changeInfo.description}
              </p>
              <div className="pt-1 text-[10px] text-primary/90 font-medium flex items-center gap-1">
                <span className="font-semibold uppercase tracking-wider text-[9px]">Impact:</span>
                <span>{changeInfo.impact}</span>
              </div>
            </div>

            {isPreviewingLive && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Live preview active across your workspace!</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── MODAL FOOTER ────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            Custom themes are saved locally to your device.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveTheme}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <Check className="h-4 w-4" />
              <span>Save & Activate Theme</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
