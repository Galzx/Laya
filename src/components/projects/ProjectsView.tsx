import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  CalendarDays,
  Trash2,
  Edit3,
  X,
  Search,
  Sparkles,
  AlertCircle,
  LayoutGrid,
  Columns2,
  Columns3,
  List,
  Camera,
  BookOpen,
  Circle,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Palette,
  Eye,
  FolderOpen,
  Check,
  Tag,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { DatePicker } from "../ui/DatePicker";
import { playTaskPopSound, playSweepSound } from "../../lib/sound";
import type { Task, Subtask } from "../tasks/TasksView";
import { TaskItem } from "../tasks/TaskItem";
import { KanbanBoard } from "../kanban/KanbanBoard";
import { CatHelper } from "../common/CatHelper";

// ═════════════════════════════════════════════════════════════════════════════
// 1. TYPES & DATA INTERFACES
// ═════════════════════════════════════════════════════════════════════════════

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  cover_image?: string | null;
  status: "active" | "completed" | "archived";
  due_date: number | null;
  created_at: number;
  updated_at: number;
}

export interface CoverPreset {
  id: string;
  name: string;
  category: "gemini" | "botanical" | "minimal" | "sunset";
  background: string;
  description: string;
}

export interface ProjectsViewProps {
  workspaceId: string;
  initialProjectId?: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. GEMINI NOTEBOOK PRESETS & COVER PHOTO UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

export const NOTEBOOK_COVER_PRESETS: CoverPreset[] = [
  // Gemini & Cosmic
  {
    id: "preset-gemini-aurora",
    name: "Gemini Aurora",
    category: "gemini",
    background: "linear-gradient(135deg, #1e1b4b 0%, #3b0764 35%, #064e3b 70%, #0284c7 100%)",
    description: "Deep cosmic violet with radiant emerald & cyan aurora ribbons",
  },
  {
    id: "preset-cosmic-nebula",
    name: "Cosmic Nebula",
    category: "gemini",
    background: "linear-gradient(135deg, #0f172a 0%, #311042 40%, #701a75 75%, #0369a1 100%)",
    description: "Starlit deep midnight slate with magenta nebula dust",
  },
  {
    id: "preset-cyber-prism",
    name: "Cyber Prism",
    category: "gemini",
    background: "linear-gradient(120deg, #1e1e38 0%, #4338ca 45%, #06b6d4 85%, #10b981 100%)",
    description: "Electric indigo and arctic cyan geometric shimmer",
  },
  {
    id: "preset-quantum-glow",
    name: "Quantum Glow",
    category: "gemini",
    background: "linear-gradient(135deg, #18181b 0%, #27272a 30%, #4f46e5 70%, #9333ea 100%)",
    description: "Modern obsidian with focused ultraviolet ray",
  },

  // Botanical & Nature
  {
    id: "preset-sage-botanical",
    name: "Sage Botanical",
    category: "botanical",
    background: "linear-gradient(135deg, #14532d 0%, #166534 35%, #047857 70%, #0d9488 100%)",
    description: "Calming matcha green and deep herbal forest mist",
  },
  {
    id: "preset-ocean-flow",
    name: "Ocean Flow",
    category: "botanical",
    background: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 40%, #0d9488 75%, #2dd4bf 100%)",
    description: "Pacific sapphire tides with gentle turquoise ripples",
  },
  {
    id: "preset-sakura-mist",
    name: "Sakura Blossom",
    category: "botanical",
    background: "linear-gradient(135deg, #4c0519 0%, #831843 40%, #be185d 75%, #fb7185 100%)",
    description: "Soft cherry blossom petals with plum sunset blush",
  },
  {
    id: "preset-mountain-fog",
    name: "Mountain Mist",
    category: "botanical",
    background: "linear-gradient(135deg, #1e293b 0%, #334155 45%, #475569 80%, #64748b 100%)",
    description: "Alpine slate cliffs shrouded in cool morning fog",
  },

  // Sunset & Warm Studio
  {
    id: "preset-warm-sunset",
    name: "Sunset Glow",
    category: "sunset",
    background: "linear-gradient(135deg, #7c2d12 0%, #c2410c 35%, #ea580c 70%, #f59e0b 100%)",
    description: "Golden hour horizon with warm amber and terracotta warmth",
  },
  {
    id: "preset-clay-studio",
    name: "Clay Studio",
    category: "sunset",
    background: "linear-gradient(135deg, #451a03 0%, #78350f 40%, #b45309 75%, #d97706 100%)",
    description: "Tactile roasted caramel and warm earthen pottery",
  },
  {
    id: "preset-golden-sand",
    name: "Golden Dune",
    category: "sunset",
    background: "linear-gradient(135deg, #713f12 0%, #a16207 40%, #ca8a04 75%, #eab308 100%)",
    description: "Sun-drenched desert ridges and warm radiant gold",
  },

  // Minimalist & Architectural
  {
    id: "preset-linen-paper",
    name: "Warm Linen",
    category: "minimal",
    background: "linear-gradient(135deg, #292524 0%, #44403c 45%, #57534e 80%, #78716c 100%)",
    description: "Earthy tactile linen texture with warm espresso shadows",
  },
  {
    id: "preset-midnight-slate",
    name: "Midnight Slate",
    category: "minimal",
    background: "linear-gradient(135deg, #09090b 0%, #18181b 40%, #27272a 75%, #3f3f46 100%)",
    description: "Architectural carbon slate with frosted glass tone",
  },
  {
    id: "preset-nordic-frost",
    name: "Nordic Frost",
    category: "minimal",
    background: "linear-gradient(135deg, #082f49 0%, #0369a1 40%, #38bdf8 85%, #bae6fd 100%)",
    description: "Crisp Scandinavian winter glacier and twilight sky",
  },
];

export function findCoverPreset(id: string): CoverPreset | undefined {
  return NOTEBOOK_COVER_PRESETS.find((p) => p.id === id);
}

export function getCoverBackground(
  coverImage?: string | null,
  fallbackColorHex = "#f59e0b"
): {
  type: "image" | "preset" | "fallback";
  background: string;
  src?: string;
} {
  if (!coverImage) {
    return {
      type: "fallback",
      background: `linear-gradient(135deg, ${fallbackColorHex}33 0%, ${fallbackColorHex}11 100%)`,
    };
  }

  const preset = findCoverPreset(coverImage);
  if (preset) {
    return {
      type: "preset",
      background: preset.background,
    };
  }

  if (
    coverImage.startsWith("data:image/") ||
    coverImage.startsWith("http://") ||
    coverImage.startsWith("https://") ||
    coverImage.startsWith("blob:") ||
    coverImage.startsWith("asset://")
  ) {
    return {
      type: "image",
      src: coverImage,
      background: `url("${coverImage}") center/cover no-repeat`,
    };
  }

  if (coverImage.startsWith("linear-gradient") || coverImage.startsWith("#")) {
    return {
      type: "preset",
      background: coverImage,
    };
  }

  return {
    type: "fallback",
    background: `linear-gradient(135deg, ${fallbackColorHex}33 0%, ${fallbackColorHex}11 100%)`,
  };
}

export async function optimizeCoverImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file is not an image. Please choose a PNG, JPG, WebP, or SVG file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") {
        reject(new Error("Invalid image data."));
        return;
      }

      if (file.type === "image/svg+xml") {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image."));
      img.onload = () => {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 640;

        let { width, height } = img;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl);
      };
      img.src = result;
    };

    reader.readAsDataURL(file);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. COLOR PALETTES & DATE UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

import {
  type ProjectColorItem,
  PROJECT_COLORS,
  getProjectColorDef,
} from "./projectColors";

export {
  type ProjectColorItem,
  PROJECT_COLORS,
  getProjectColorDef,
};

function dateInputToEpoch(value: string): number | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(new Date(year, month - 1, day, 12).getTime() / 1000);
}

function toLocalDateInput(epochSeconds: number | null): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDate(epochSeconds: number | null): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "proj-sample-1",
    workspace_id: "ws-default-primary",
    name: "AI & Machine Learning Research",
    description: "Multi-modal model evaluations, benchmark datasets, and prompt optimization strategies.",
    color: "indigo",
    cover_image: "preset-gemini-aurora",
    status: "active",
    due_date: Math.floor(Date.now() / 1000) + 86400 * 5,
    created_at: Math.floor(Date.now() / 1000) - 86400 * 3,
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: "proj-sample-2",
    workspace_id: "ws-default-primary",
    name: "Design System & UI Components",
    description: "Tactile color palettes, responsive cards, and Gemini Notebook cover aesthetics.",
    color: "rose",
    cover_image: "preset-sakura-mist",
    status: "active",
    due_date: Math.floor(Date.now() / 1000) + 86400 * 12,
    created_at: Math.floor(Date.now() / 1000) - 86400 * 2,
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: "proj-sample-3",
    workspace_id: "ws-default-primary",
    name: "Product Launch & Strategy",
    description: "Milestone checklist for desktop release, documentation, and user onboarding.",
    color: "emerald",
    cover_image: "preset-ocean-flow",
    status: "active",
    due_date: Math.floor(Date.now() / 1000) + 86400 * 20,
    created_at: Math.floor(Date.now() / 1000) - 86400,
    updated_at: Math.floor(Date.now() / 1000),
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// 4. QUICK COLOR & TAG PICKER POPOVER
// ═════════════════════════════════════════════════════════════════════════════

interface QuickColorPickerProps {
  currentColor: string;
  onSelectColor: (colorId: string) => void;
  onClose: () => void;
}

const QuickColorPicker: React.FC<QuickColorPickerProps> = ({
  currentColor,
  onSelectColor,
  onClose,
}) => {
  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-backdrop-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-4 shadow-2xl max-w-xs w-full space-y-3 animate-dialog-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span>Select Notebook Tag Color</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PROJECT_COLORS.map((col) => {
            const isSelected = currentColor === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  onSelectColor(col.id);
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer text-left",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40 text-foreground font-semibold"
                    : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: col.hex }}
                />
                <span className="truncate">{col.name}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. COVER PICKER MODAL COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export interface CoverPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCover?: string | null;
  projectName?: string;
  projectColorHex?: string;
  onSelectCover: (coverValue: string | null) => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  isOpen,
  onClose,
  currentCover,
  projectName = "Untitled Project",
  projectColorHex = "#f59e0b",
  onSelectCover,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "presets" | "colors">(
    currentCover?.startsWith("preset-") ? "presets" : "upload"
  );
  const [selectedCover, setSelectedCover] = useState<string | null>(
    currentCover ?? null
  );
  const [presetCategory, setPresetCategory] = useState<
    "all" | CoverPreset["category"]
  >("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const optimizedDataUrl = await optimizeCoverImage(file);
      setSelectedCover(optimizedDataUrl);
      setActiveTab("upload");
    } catch (err) {
      console.error("Failed to process cover image:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load image."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleApply = () => {
    onSelectCover(selectedCover);
    onClose();
  };

  const handleRemoveCover = () => {
    setSelectedCover(null);
    onSelectCover(null);
    onClose();
  };

  const filteredPresets = NOTEBOOK_COVER_PRESETS.filter((p) => {
    if (presetCategory === "all") return true;
    return p.category === presetCategory;
  });

  const previewBg = getCoverBackground(selectedCover, projectColorHex);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-backdrop-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-dialog-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-border/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Notebook Cover
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Import custom photos or select Gemini notebook presets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Preview Banner */}
        <div className="p-6 pb-2 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Cover Preview
              </span>
              <span className="text-[10px] font-mono">
                {selectedCover
                  ? selectedCover.startsWith("preset-")
                    ? findCoverPreset(selectedCover)?.name || "Preset Cover"
                    : selectedCover.startsWith("data:image/")
                    ? "Custom Imported Photo"
                    : "Active Cover"
                  : "No Cover (Theme Color)"}
              </span>
            </div>

            <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-border/80 shadow-inner group">
              <div
                className="absolute inset-0 transition-all duration-300"
                style={{
                  background: previewBg.background,
                  backgroundSize: previewBg.type === "image" ? "cover" : undefined,
                  backgroundPosition: previewBg.type === "image" ? "center" : undefined,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: projectColorHex }}
                    />
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-white/80">
                      Notebook
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight drop-shadow-sm truncate max-w-md">
                    {projectName}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="px-6 pt-3 shrink-0">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === "upload"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Custom Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === "presets"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Gemini Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("colors")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === "colors"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Minimal Tint</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
          {activeTab === "upload" && (
            <div className="space-y-4 animate-smooth-in">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    void handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 group",
                  dragActive
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-2xs">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    {isProcessing ? "Optimizing image…" : "Click or drag & drop a photo here"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PNG, JPG, WebP, SVG or GIF • High-DPI optimized & stored 100% locally
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors border border-border cursor-pointer shadow-2xs"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Browse File</span>
                </button>
              </div>

              {selectedCover && selectedCover.startsWith("data:image/") && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
                  <span className="text-muted-foreground flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    Custom photo imported and ready to save
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary hover:underline font-medium cursor-pointer shrink-0 ml-2"
                  >
                    Change photo
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "presets" && (
            <div className="space-y-3.5 animate-smooth-in">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: "all", label: "All Styles" },
                    { id: "gemini", label: "Gemini Cosmic" },
                    { id: "botanical", label: "Botanical" },
                    { id: "sunset", label: "Warm Sunset" },
                    { id: "minimal", label: "Minimalist" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPresetCategory(cat.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer",
                      presetCategory === cat.id
                        ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedCover === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedCover(preset.id)}
                      className={cn(
                        "group relative text-left rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer flex flex-col p-2.5 bg-card",
                        isSelected
                          ? "ring-2 ring-primary border-primary shadow-sm"
                          : "border-border hover:border-primary/40 hover:shadow-2xs"
                      )}
                    >
                      <div
                        className="w-full h-16 rounded-xl overflow-hidden relative shadow-inner mb-2 group-hover:scale-[1.02] transition-transform duration-200"
                        style={{ background: preset.background }}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                            <Check className="h-5 w-5 drop-shadow" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "colors" && (
            <div className="space-y-4 animate-smooth-in text-center py-4">
              <div className="max-w-sm mx-auto space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                  <Palette className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-semibold text-foreground">
                  Clean Minimal Aesthetic
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Use a pure, subtle background tint based on the project's accent color without photographic or gradient overlays.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCover(null)}
                  className={cn(
                    "mt-2 px-4 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-2",
                    selectedCover === null
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5", selectedCover === null ? "opacity-100" : "opacity-0")} />
                  <span>Use Minimal Accent Tint</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div>
            {currentCover && (
              <button
                type="button"
                onClick={handleRemoveCover}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Cover</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              Apply Cover
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. PROJECT CARD COMPONENT (GEMINI NOTEBOOK CARD)
// ═════════════════════════════════════════════════════════════════════════════

export interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onChangeCover: (project: Project) => void;
  onChangeColor: (project: Project) => void;
  onToggleStatus: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  onSelect,
  onEdit,
  onChangeCover,
  onChangeColor,
  onToggleStatus,
  onDelete,
}) => {
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const completedTasks = projectTasks.filter((t) => t.status === "completed").length;
  const progressPercent =
    projectTasks.length > 0
      ? Math.round((completedTasks / projectTasks.length) * 100)
      : 0;

  const isDone = project.status === "completed";
  const nowEpoch = Math.floor(Date.now() / 1000);
  const isOverdue =
    project.due_date && project.due_date < nowEpoch && !isDone;

  const colorDef = getProjectColorDef(project.color);
  const coverBg = getCoverBackground(project.cover_image, colorDef.hex);

  return (
    <div
      onClick={() => onSelect(project)}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:border-primary/40 hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer select-none"
    >
      {/* Visual Notebook Cover Banner */}
      <div className="relative h-32 w-full overflow-hidden shrink-0">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{
            background: coverBg.background,
            backgroundSize: coverBg.type === "image" ? "cover" : undefined,
            backgroundPosition: coverBg.type === "image" ? "center" : undefined,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/15" />

        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Clickable Tag Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeColor(project);
              }}
              className={cn(
                "group/tag inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-md transition-all duration-150 cursor-pointer shadow-2xs hover:scale-105",
                colorDef.badgeClass
              )}
              title="Click to change tag color"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: colorDef.hex }}
              />
              <span>{colorDef.name}</span>
              <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover/tag:opacity-100 transition-opacity ml-0.5" />
            </button>

            {isDone && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white shadow-2xs backdrop-blur-xs">
                Completed
              </span>
            )}

            {isOverdue && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/90 text-white shadow-2xs backdrop-blur-xs">
                Overdue
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeCover(project);
            }}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer shadow-2xs"
            title="Change cover photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between z-10 text-white">
          <div className="flex items-center gap-1 text-[11px] font-medium text-white/80 drop-shadow">
            <Sparkles className="h-3 w-3 text-amber-300" />
            <span>Notebook</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(project);
            }}
            className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
            title={isDone ? "Reopen project" : "Mark project completed"}
          >
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Circle className="h-4 w-4 text-white/80 hover:text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Notebook Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <h3
            className={cn(
              "text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {project.name}
          </h3>

          {project.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic line-clamp-1">
              No project description
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono font-medium text-foreground">
              {completedTasks}/{projectTasks.length} ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                colorDef.barClass
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              {project.due_date ? (
                <>
                  <CalendarDays
                    className={cn(
                      "h-3 w-3",
                      isOverdue ? "text-rose-500" : "text-primary"
                    )}
                  />
                  <span
                    className={cn(
                      isOverdue && "text-rose-600 dark:text-rose-400 font-semibold"
                    )}
                  >
                    {toLocalDate(project.due_date)}
                  </span>
                </>
              ) : (
                <span>No deadline</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Edit project"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <span className="ml-1 inline-flex items-center text-primary group-hover:translate-x-0.5 transition-transform duration-150">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 7. MAIN PROJECTS VIEW
// ═════════════════════════════════════════════════════════════════════════════

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  workspaceId,
  initialProjectId,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId || null
  );
  const [viewMode, setViewMode] = useState<"grid" | "split">(
    initialProjectId ? "split" : "grid"
  );
  const [projectListFilter, setProjectListFilter] = useState<"active" | "completed" | "all">("active");
  const [taskFilter, setTaskFilter] = useState<"all" | "open" | "completed">("all");
  const [projectTaskView, setProjectTaskView] = useState<"list" | "kanban">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [departingTaskIds, setDepartingTaskIds] = useState<Set<string>>(new Set());

  // Modals & Popovers
  const [coverPickerProject, setCoverPickerProject] = useState<Project | null>(null);
  const [colorPickerProject, setColorPickerProject] = useState<Project | null>(null);
  const [isNewProjectCoverOpen, setIsNewProjectCoverOpen] = useState(false);
  const [isEditProjectCoverOpen, setIsEditProjectCoverOpen] = useState(false);

  // New Project Form
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("amber");
  const [newCover, setNewCover] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState("");

  // Edit Project Form
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [showClearProjectDialog, setShowClearProjectDialog] = useState(false);
  const [clearingCompleted, setClearingCompleted] = useState(false);

  // In-Project Task Capture
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium");
  const [newTaskDueDate, setNewDueDateTask] = useState("");

  const isTauriEnv =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      if (isTauriEnv) {
        const [projRes, taskRes] = await Promise.all([
          invoke<Project[]>("get_projects", { workspaceId }).catch(() => [] as Project[]),
          invoke<Task[]>("get_tasks", { workspaceId }).catch(() => [] as Task[]),
        ]);

        if (projRes.length === 0) {
          const saved = localStorage.getItem(`laya-projects-${workspaceId}`);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setProjects(parsed);
              if (!selectedProjectId && parsed.length > 0) setSelectedProjectId(parsed[0].id);
            } catch {
              setProjects(SAMPLE_PROJECTS);
              if (!selectedProjectId) setSelectedProjectId(SAMPLE_PROJECTS[0].id);
            }
          } else {
            setProjects(SAMPLE_PROJECTS);
            if (!selectedProjectId) setSelectedProjectId(SAMPLE_PROJECTS[0].id);
          }
        } else {
          setProjects(projRes);
          if (!selectedProjectId && projRes.length > 0) {
            const firstActive = projRes.find((p) => p.status === "active") || projRes[0];
            setSelectedProjectId(firstActive.id);
          }
        }
        setTasks(taskRes);
      } else {
        const saved = localStorage.getItem(`laya-projects-${workspaceId}`);
        const currentProjects = saved ? JSON.parse(saved) : SAMPLE_PROJECTS;
        setProjects(currentProjects);
        if (!selectedProjectId && currentProjects.length > 0) {
          setSelectedProjectId(currentProjects[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load projects data:", err);
      setProjects(SAMPLE_PROJECTS);
      if (!selectedProjectId) setSelectedProjectId(SAMPLE_PROJECTS[0].id);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadSubtasks = async (taskId: string) => {
    if (!isTauriEnv) return;
    try {
      const subtasks = await invoke<Subtask[]>("get_subtasks", { taskId });
      setSubtasksMap((prev) => ({ ...prev, [taskId]: subtasks }));
    } catch (err) {
      console.error("Failed to load subtasks:", err);
    }
  };

  useEffect(() => {
    if (workspaceId) void loadData(true);
  }, [workspaceId]);

  const saveProjectsToStorage = (updatedProjects: Project[]) => {
    try {
      localStorage.setItem(`laya-projects-${workspaceId}`, JSON.stringify(updatedProjects));
    } catch (e) {
      console.warn("Storage sync:", e);
    }
  };

  const handleClearProjectCompleted = async () => {
    if (!selectedProjectId) return;
    try {
      setClearingCompleted(true);
      setErrorMessage(null);
      playSweepSound();
      if (isTauriEnv) {
        await invoke("clear_project_completed_tasks", { projectId: selectedProjectId });
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
      await loadData(false);
      setShowClearProjectDialog(false);
    } catch (err) {
      console.error("Failed to clear project completed tasks:", err);
      setErrorMessage(`Couldn't clear completed tasks: ${String(err)}`);
    } finally {
      setClearingCompleted(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      let created: Project;
      if (isTauriEnv) {
        created = await invoke<Project>("create_project", {
          workspaceId,
          name: newName.trim(),
          description: newDesc.trim() || null,
          color: newColor,
          coverImage: newCover,
          dueDate: dateInputToEpoch(newDueDate),
        });
      } else {
        created = {
          id: `proj-${Date.now()}`,
          workspace_id: workspaceId,
          name: newName.trim(),
          description: newDesc.trim() || null,
          color: newColor,
          cover_image: newCover,
          status: "active",
          due_date: dateInputToEpoch(newDueDate),
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
        };
      }

      const nextProjects = [created, ...projects];
      setProjects(nextProjects);
      saveProjectsToStorage(nextProjects);
      setSelectedProjectId(created.id);
      setNewName("");
      setNewDesc("");
      setNewColor("amber");
      setNewCover(null);
      setNewDueDate("");
      setShowNewModal(false);
    } catch (err) {
      setErrorMessage(`Failed to create project: ${String(err)}`);
    }
  };

  const handleUpdateProject = async (proj: Project, updates: Partial<Project>) => {
    try {
      let updated: Project;
      if (isTauriEnv) {
        updated = await invoke<Project>("update_project", {
          projectId: proj.id,
          name: updates.name ?? proj.name,
          description: updates.description ?? proj.description,
          color: updates.color ?? proj.color,
          coverImage: updates.cover_image !== undefined ? updates.cover_image : proj.cover_image,
          status: updates.status ?? proj.status,
          dueDate: updates.due_date ?? proj.due_date,
        });
      } else {
        updated = {
          ...proj,
          ...updates,
          updated_at: Math.floor(Date.now() / 1000),
        };
      }

      const nextProjects = projects.map((p) => (p.id === proj.id ? updated : p));
      setProjects(nextProjects);
      saveProjectsToStorage(nextProjects);
      if (editingProject && editingProject.id === proj.id) {
        setEditingProject(updated);
      }
    } catch (err) {
      setErrorMessage(`Failed to update project: ${String(err)}`);
    }
  };

  const handleUpdateCoverDirect = async (proj: Project, coverValue: string | null) => {
    try {
      await handleUpdateProject(proj, { cover_image: coverValue ?? "" });
    } catch (err) {
      console.error("Failed to update project cover:", err);
    }
  };

  const handleUpdateColorDirect = async (proj: Project, colorId: string) => {
    try {
      await handleUpdateProject(proj, { color: colorId });
    } catch (err) {
      console.error("Failed to update project color:", err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      if (isTauriEnv) {
        await invoke("delete_project", { projectId });
      }
      const nextProjects = projects.filter((p) => p.id !== projectId);
      setProjects(nextProjects);
      saveProjectsToStorage(nextProjects);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(nextProjects[0]?.id || null);
      }
      if (editingProject?.id === projectId) setEditingProject(null);
    } catch (err) {
      setErrorMessage(`Failed to delete project: ${String(err)}`);
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (task.status === "completed") {
      try {
        if (isTauriEnv) {
          const updated = await invoke<Task>("toggle_task_status", { taskId: task.id });
          setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        } else {
          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "inbox" } : t)));
        }
      } catch (err) {
        console.error("Failed to toggle task:", err);
      }
      return;
    }

    playTaskPopSound();
    setCompletingTaskIds((prev) => new Set(prev).add(task.id));
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "completed" as const } : t))
    );

    try {
      if (isTauriEnv) {
        await invoke("toggle_task_status", { taskId: task.id });
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      await loadData(false);
      return;
    }

    if (taskFilter === "open") {
      await new Promise((resolve) => window.setTimeout(resolve, 480));
      setDepartingTaskIds((prev) => new Set(prev).add(task.id));
      await new Promise((resolve) => window.setTimeout(resolve, 360));
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 480));
    }

    await loadData(false);
    setCompletingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    setDepartingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
  };

  const handleSaveTaskEdits = async (
    task: Task,
    edits: {
      title: string;
      description: string | null;
      priority: Task["priority"];
      dueDate: number | null;
      nextAction: string | null;
    }
  ) => {
    try {
      if (isTauriEnv) {
        const updated = await invoke<Task>("update_task", {
          taskId: task.id,
          title: edits.title,
          description: edits.description,
          priority: edits.priority,
          dueDate: edits.dueDate,
          nextAction: edits.nextAction,
          projectId: task.project_id ?? null,
        });
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  title: edits.title,
                  description: edits.description,
                  priority: edits.priority,
                  due_date: edits.dueDate,
                  next_action: edits.nextAction,
                }
              : t
          )
        );
      }
    } catch (err) {
      setErrorMessage(`Failed to save task edits: ${String(err)}`);
    }
  };

  const handleUpdateTaskPriority = async (taskId: string, priority: Task["priority"]) => {
    try {
      if (isTauriEnv) {
        const updated = await invoke<Task>("update_task_priority", { taskId, priority });
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } else {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
      }
    } catch (err) {
      console.error("Failed to update task priority:", err);
    }
  };

  const handleUpdateTaskDueDate = async (taskId: string, dueDateStr: string) => {
    try {
      const dueDate = dateInputToEpoch(dueDateStr);
      if (isTauriEnv) {
        const updated = await invoke<Task>("update_task_due_date", { taskId, dueDate });
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } else {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, due_date: dueDate } : t)));
      }
    } catch (err) {
      console.error("Failed to update due date:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      if (isTauriEnv) {
        await invoke("delete_task", { taskId });
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleCreateSubtask = async (taskId: string, title: string) => {
    if (isTauriEnv) {
      try {
        await invoke("create_subtask", { taskId, title });
        await loadSubtasks(taskId);
      } catch (err) {
        console.error("Failed to create subtask:", err);
      }
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    if (isTauriEnv) {
      try {
        await invoke("toggle_subtask", { subtaskId });
        await loadSubtasks(taskId);
      } catch (err) {
        console.error("Failed to toggle subtask:", err);
      }
    }
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    if (isTauriEnv) {
      try {
        await invoke("delete_subtask", { subtaskId });
        await loadSubtasks(taskId);
      } catch (err) {
        console.error("Failed to delete subtask:", err);
      }
    }
  };

  const toggleExpandTask = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleCreateTaskInProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newTaskTitle.trim()) return;

    try {
      let created: Task;
      if (isTauriEnv) {
        created = await invoke<Task>("create_task", {
          workspaceId,
          title: newTaskTitle.trim(),
          description: null,
          priority: newTaskPriority,
          startDate: null,
          dueDate: dateInputToEpoch(newTaskDueDate),
          nextAction: null,
          projectId: selectedProjectId,
        });
      } else {
        created = {
          id: `task-${Date.now()}`,
          workspace_id: workspaceId,
          project_id: selectedProjectId,
          title: newTaskTitle.trim(),
          description: null,
          status: "inbox",
          priority: newTaskPriority,
          start_date: null,
          due_date: dateInputToEpoch(newTaskDueDate),
          next_action: null,
          completed_at: null,
          archived_at: null,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
        };
      }

      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle("");
      setNewDueDateTask("");
      setNewTaskPriority("medium");
    } catch (err) {
      setErrorMessage(`Failed to add task: ${String(err)}`);
    }
  };

  const filteredProjects = projects.filter((proj) => {
    if (projectListFilter === "active" && proj.status !== "active") return false;
    if (projectListFilter === "completed" && proj.status !== "completed") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        proj.name.toLowerCase().includes(q) ||
        (proj.description && proj.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const projectTasks = selectedProject
    ? tasks.filter((t) => t.project_id === selectedProject.id)
    : [];

  const completedCount = projectTasks.filter((t) => t.status === "completed").length;
  const openCount = projectTasks.filter((t) => t.status !== "completed" && t.status !== "archived").length;
  const progressPercent = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

  const filteredProjectTasks = projectTasks.filter((task) => {
    if (completingTaskIds.has(task.id) || departingTaskIds.has(task.id)) return true;
    if (taskFilter === "open") return task.status !== "completed" && task.status !== "archived";
    if (taskFilter === "completed") return task.status === "completed";
    return task.status !== "archived";
  });

  const nowEpoch = Math.floor(Date.now() / 1000);
  const isSelectedOverdue =
    selectedProject?.due_date &&
    selectedProject.due_date < nowEpoch &&
    selectedProject.status !== "completed";

  const selectedColorDef = selectedProject ? getProjectColorDef(selectedProject.color) : PROJECT_COLORS[0];
  const selectedCoverBg = selectedProject ? getCoverBackground(selectedProject.cover_image, selectedColorDef.hex) : null;

  return (
    <div className="w-full h-full flex flex-col gap-3.5 animate-smooth-in overflow-hidden">
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs shrink-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-0.5 hover:bg-rose-200/40 dark:hover:bg-rose-900/40 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── TOP TOOLBAR & HORIZONTAL NOTEBOOK TABS ─────────────────────────── */}
      <div className="flex flex-col gap-2.5 shrink-0 select-none pb-1">
        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Projects & Notebooks
              </h1>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
                {projects.length}
              </span>
            </div>
          </div>

          {/* Action Controls & View Mode Toggle */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notebooks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 sm:w-56 bg-card border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-xs transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50 text-xs">
              {(["active", "completed", "all"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setProjectListFilter(tab)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg capitalize font-medium transition-all text-center cursor-pointer text-xs",
                    projectListFilter === tab
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Notebook Cards Gallery Grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  viewMode === "split"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Split Workspace Canvas"
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Canvas</span>
              </button>
            </div>

            {/* New Project Button */}
            <button
              type="button"
              onClick={() => {
                setNewCover(null);
                setShowNewModal(true);
              }}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              title="Create new notebook"
            >
              <Plus className="h-4 w-4" />
              <span>New Notebook</span>
            </button>
          </div>
        </div>

        {/* ── Horizontal Interactive Project Tabs Bar ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar border-b border-border/50">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer shrink-0",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                : "bg-card hover:bg-muted/60 text-muted-foreground border-border"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>All Notebooks ({projects.length})</span>
          </button>

          {projects.map((proj) => {
            const isActive = viewMode === "split" && selectedProjectId === proj.id;
            const colorDef = getProjectColorDef(proj.color);
            const cover = getCoverBackground(proj.cover_image, colorDef.hex);

            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  setViewMode("split");
                }}
                className={cn(
                  "group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer shrink-0 max-w-[200px]",
                  isActive
                    ? "bg-background text-foreground border-primary/40 ring-1 ring-primary/30 shadow-xs font-semibold"
                    : "bg-card hover:bg-muted/60 text-muted-foreground border-border"
                )}
              >
                <span
                  className="w-4 h-4 rounded-md shrink-0 overflow-hidden shadow-2xs border border-black/20 inline-block"
                  style={{
                    background: cover.background,
                    backgroundSize: cover.type === "image" ? "cover" : undefined,
                    backgroundPosition: cover.type === "image" ? "center" : undefined,
                  }}
                />
                <span className="truncate">{proj.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setNewCover(null);
              setShowNewModal(true);
            }}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-dashed border-border transition-colors cursor-pointer shrink-0"
            title="Create new project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── MAIN VIEWPORT ─────────────────────────────────────────────────── */}
      {viewMode === "grid" ? (
        <div className="flex-1 overflow-y-auto p-1">
          {loading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              Loading notebooks…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {/* "Create New Notebook" Starter Card */}
              <div
                onClick={() => {
                  setNewCover(null);
                  setShowNewModal(true);
                }}
                className="min-h-[280px] border-2 border-dashed border-border hover:border-primary/50 bg-card/40 hover:bg-card/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all duration-200 cursor-pointer group select-none shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-2xs">
                  <Plus className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    New Notebook Project
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Import custom photos & cover styles
                  </p>
                </div>
              </div>

              {/* Project Notebook Cards with Custom Cover Photos */}
              {filteredProjects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  tasks={tasks}
                  onSelect={(p: Project) => {
                    setSelectedProjectId(p.id);
                    setViewMode("split");
                  }}
                  onEdit={(p: Project) => setEditingProject(p)}
                  onChangeCover={(p: Project) => setCoverPickerProject(p)}
                  onChangeColor={(p: Project) => setColorPickerProject(p)}
                  onToggleStatus={(p: Project) =>
                    void handleUpdateProject(p, {
                      status: p.status === "completed" ? "active" : "completed",
                    })
                  }
                  onDelete={(id: string) => void handleDeleteProject(id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-5 items-stretch overflow-hidden">
          {/* LEFT PANE: PROJECT EXPLORER & NAVIGATION */}
          <aside className="w-full md:w-80 shrink-0 flex flex-col h-full bg-card border border-border rounded-2xl shadow-card overflow-hidden select-none">
            <div className="p-3.5 border-b border-border/60 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-semibold text-foreground tracking-tight">Notebooks List</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewCover(null);
                    setShowNewModal(true);
                  }}
                  className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                  title="Create new project"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New</span>
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter notebooks…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/50 border border-border/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Loading notebooks…
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                  <FolderKanban className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-medium text-foreground">No projects found</p>
                </div>
              ) : (
                filteredProjects.map((proj) => {
                  const isSelected = proj.id === selectedProjectId;
                  const isDone = proj.status === "completed";
                  const pTasks = tasks.filter((t) => t.project_id === proj.id);
                  const pCompleted = pTasks.filter((t) => t.status === "completed").length;
                  const pPercent = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;
                  const colorDef = getProjectColorDef(proj.color);
                  const cover = getCoverBackground(proj.cover_image, colorDef.hex);

                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl transition-all duration-150 cursor-pointer group relative border overflow-hidden",
                        isSelected
                          ? "bg-muted/70 border-primary/30 shadow-2xs"
                          : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border/40"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 overflow-hidden relative shadow-2xs border border-black/10"
                          style={{
                            background: cover.background,
                            backgroundSize: cover.type === "image" ? "cover" : undefined,
                            backgroundPosition: cover.type === "image" ? "center" : undefined,
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p
                              className={cn(
                                "text-xs font-semibold truncate transition-colors",
                                isSelected ? "text-foreground" : "text-foreground/90",
                                isDone && "line-through text-muted-foreground"
                              )}
                            >
                              {proj.name}
                            </p>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1 py-px rounded border border-border/50 shrink-0">
                              {pCompleted}/{pTasks.length}
                            </span>
                          </div>

                          <div className="mt-1.5 w-full bg-muted/60 h-1 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", colorDef.barClass)}
                              style={{ width: `${pPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT PANE: MASTER PROJECT WORKSPACE CANVAS */}
          <main className="flex-1 flex flex-col h-full bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            {selectedProject && selectedCoverBg ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Panoramic Hero Cover Banner */}
                <div className="relative h-44 sm:h-52 w-full overflow-hidden shrink-0 group border-b border-border select-none">
                  <div
                    className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{
                      background: selectedCoverBg.background,
                      backgroundSize: selectedCoverBg.type === "image" ? "cover" : undefined,
                      backgroundPosition: selectedCoverBg.type === "image" ? "center" : undefined,
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

                  <div className="absolute top-3.5 right-4 z-20 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCoverPickerProject(selectedProject)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/70 text-white backdrop-blur-md text-xs font-semibold transition-all cursor-pointer shadow-sm border border-white/10"
                      title="Change cover photo"
                    >
                      <Camera className="h-3.5 w-3.5 text-amber-300" />
                      <span>Change Cover</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingProject(selectedProject)}
                      className="p-1.5 rounded-xl bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                      title="Edit project details"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteProject(selectedProject.id)}
                      className="p-1.5 rounded-xl bg-black/40 hover:bg-rose-600/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-6 right-6 z-10 flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Clickable Tag Badge on Hero Banner */}
                        <button
                          type="button"
                          onClick={() => setColorPickerProject(selectedProject)}
                          className={cn(
                            "group/herotag inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md text-white border-white/20 bg-black/40 hover:bg-black/70 transition-all cursor-pointer shadow-2xs"
                          )}
                          title="Click to change tag color"
                        >
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: selectedColorDef.hex }}
                          />
                          <span>{selectedColorDef.name}</span>
                          <Edit3 className="h-2.5 w-2.5 opacity-60 group-hover/herotag:opacity-100 transition-opacity ml-0.5" />
                        </button>

                        {selectedProject.status === "completed" && (
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white shadow-2xs backdrop-blur-xs">
                            Completed
                          </span>
                        )}

                        {isSelectedOverdue && (
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/90 text-white shadow-2xs backdrop-blur-xs">
                            Overdue
                          </span>
                        )}

                        {selectedProject.due_date && (
                          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-black/40 text-white/90 border border-white/15 backdrop-blur-md inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 text-amber-300" />
                            Target: {toLocalDateInput(selectedProject.due_date)}
                          </span>
                        )}
                      </div>

                      <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                        {selectedProject.name}
                      </h1>

                      {selectedProject.description && (
                        <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow">
                          {selectedProject.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdateProject(selectedProject, {
                          status: selectedProject.status === "completed" ? "active" : "completed",
                        })
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer shadow-md",
                        selectedProject.status === "completed"
                          ? "bg-emerald-500 text-white border-emerald-400"
                          : "bg-white/20 text-white hover:bg-white/30 border-white/30"
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{selectedProject.status === "completed" ? "Completed" : "Mark Done"}</span>
                    </button>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div className="px-6 py-3 border-b border-border/50 bg-muted/10 shrink-0">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-foreground">Milestone Progress</span>
                    <span className="font-mono text-muted-foreground">
                      {completedCount}/{projectTasks.length} tasks ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300 ease-smooth",
                        selectedColorDef.barClass
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Fast In-Project Task Capture Bar */}
                <div className="p-4 border-b border-border/60 bg-muted/20 shrink-0">
                  <form
                    onSubmit={handleCreateTaskInProject}
                    className="flex flex-wrap items-center gap-2.5 bg-background border border-border p-2 rounded-2xl shadow-xs focus-within:ring-2 focus-within:ring-primary/30 transition-all"
                  >
                    <input
                      type="text"
                      placeholder={`Add a new task to ${selectedProject.name}…`}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/60 min-w-[200px]"
                    />

                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as Task["priority"])}
                      className="bg-secondary text-secondary-foreground border border-border text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                      title="Select task priority"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent Priority</option>
                    </select>

                    <DatePicker
                      value={newTaskDueDate}
                      onChange={setNewDueDateTask}
                      placeholder="Set due date"
                      align="right"
                    />

                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Task</span>
                    </button>
                  </form>
                </div>

                {/* Task Filter & List */}
                <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs bg-muted/60 p-1 rounded-xl border border-border">
                    {(["all", "open", "completed"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setTaskFilter(tab)}
                        className={cn(
                          "px-3 py-1 rounded-lg font-medium transition-all capitalize cursor-pointer",
                          taskFilter === tab
                            ? "bg-background text-foreground font-semibold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab === "all"
                          ? `All (${projectTasks.length})`
                          : tab === "open"
                          ? `Open (${openCount})`
                          : `Completed (${completedCount})`}
                      </button>
                    ))}
                  </div>

                    {completedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearProjectDialog(true)}
                      className="inline-flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer shadow-2xs"
                      title="Clear completed tasks in this project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear completed ({completedCount})</span>
                    </button>
                  )}

                  {/* Project Task View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        playTaskPopSound();
                        setProjectTaskView("list");
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                        projectTaskView === "list"
                          ? "bg-background shadow-xs text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Project List View"
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTaskPopSound();
                        setProjectTaskView("kanban");
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                        projectTaskView === "kanban"
                          ? "bg-background shadow-xs text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Project Kanban Board"
                    >
                      <Columns3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Kanban</span>
                    </button>
                  </div>
                </div>

                {projectTaskView === "kanban" ? (
                  <div className="flex-1 overflow-y-auto p-6">
                    <KanbanBoard
                      tasks={tasks}
                      projects={projects}
                      workspaceId={workspaceId}
                      projectIdFilter={selectedProject.id}
                      onTasksChanged={() => void loadData()}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
                  {filteredProjectTasks.length === 0 ? (
                    <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-muted text-muted-foreground">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {taskFilter === "completed"
                          ? "No completed tasks yet"
                          : "No tasks in this view"}
                      </p>
                      <p className="text-xs max-w-sm mx-auto">
                        Use the capture bar above to add milestones, checklist items, and deliverables.
                      </p>
                    </div>
                  ) : (
                    filteredProjectTasks.map((task) => {
                      const isExpanded = expandedTaskIds.has(task.id);
                      const subtasks = subtasksMap[task.id] || [];
                      const isCompleting = completingTaskIds.has(task.id);
                      const isDeparting = departingTaskIds.has(task.id);

                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleExpandTask(task.id)}
                          onToggleComplete={() => void handleToggleTask(task)}
                          isCompleting={isCompleting}
                          isDeparting={isDeparting}
                          subtasks={subtasks}
                          onLoadSubtasks={() => void loadSubtasks(task.id)}
                          onCreateSubtask={(title) => handleCreateSubtask(task.id, title)}
                          onToggleSubtask={(subtaskId) => handleToggleSubtask(task.id, subtaskId)}
                          onDeleteSubtask={(subtaskId) => handleDeleteSubtask(task.id, subtaskId)}
                          onSaveEdits={(edits) => handleSaveTaskEdits(task, edits)}
                          onUpdatePriority={(priority) => handleUpdateTaskPriority(task.id, priority)}
                          onUpdateDueDate={(dueDateStr) => handleUpdateTaskDueDate(task.id, dueDateStr)}
                          onDeleteTask={() => void handleDeleteTask(task.id)}
                        />
                      );
                    })
                  )}
                </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <FolderKanban className="h-7 w-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-semibold text-foreground">Select or create a notebook</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a project from the left list to view its tasks, or switch back to the Notebook Gallery view.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Open Notebook Gallery</span>
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* QUICK COLOR PICKER POPOVER */}
      {colorPickerProject && (
        <QuickColorPicker
          currentColor={colorPickerProject.color}
          onClose={() => setColorPickerProject(null)}
          onSelectColor={(colorId: string) => void handleUpdateColorDirect(colorPickerProject, colorId)}
        />
      )}

      {/* COVER PICKER MODAL */}
      {coverPickerProject && (
        <CoverPickerModal
          isOpen={!!coverPickerProject}
          onClose={() => setCoverPickerProject(null)}
          currentCover={coverPickerProject.cover_image}
          projectName={coverPickerProject.name}
          projectColorHex={getProjectColorDef(coverPickerProject.color).hex}
          onSelectCover={(cover: string | null) => void handleUpdateCoverDirect(coverPickerProject, cover)}
        />
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {showNewModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-backdrop-in select-none"
            onClick={() => setShowNewModal(false)}
          >
            <div
              className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-5 animate-dialog-in max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  Create New Notebook Project
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notebook Cover</label>
                <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-border group shadow-xs">
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      background: getCoverBackground(newCover, getProjectColorDef(newColor).hex).background,
                      backgroundSize: newCover?.startsWith("data:image/") ? "cover" : undefined,
                      backgroundPosition: newCover?.startsWith("data:image/") ? "center" : undefined,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between z-10 text-white">
                    <span className="text-[11px] font-medium drop-shadow">
                      {newCover
                        ? newCover.startsWith("preset-")
                          ? findCoverPreset(newCover)?.name || "Preset Cover"
                          : newCover.startsWith("data:image/")
                          ? "Custom Photo"
                          : "Cover Selected"
                        : "Minimal Color Theme"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNewProjectCoverOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md text-xs font-medium border border-white/20 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Camera className="h-3.5 w-3.5 text-amber-300" />
                      <span>{newCover ? "Change Cover" : "Add Cover Photo"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Project Name</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Website Redesign, Machine Learning Research…"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Description (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="What is the goal of this project?"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60 resize-none"
                  />
                </div>

                {/* 12 Color Badges */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Notebook Tag Color</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {PROJECT_COLORS.map((color) => {
                      const isSelected = newColor === color.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setNewColor(color.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer text-left",
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 font-semibold"
                              : "border-border bg-background hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="truncate">{color.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Deadline (optional)</label>
                  <DatePicker
                    value={newDueDate}
                    onChange={setNewDueDate}
                    placeholder="Set project target date"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* COVER PICKER FOR NEW PROJECT MODAL */}
      {isNewProjectCoverOpen && (
        <CoverPickerModal
          isOpen={isNewProjectCoverOpen}
          onClose={() => setIsNewProjectCoverOpen(false)}
          currentCover={newCover}
          projectName={newName || "New Project"}
          projectColorHex={getProjectColorDef(newColor).hex}
          onSelectCover={(cover: string | null) => setNewCover(cover)}
        />
      )}

      {/* EDIT PROJECT METADATA MODAL */}
      {editingProject &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-backdrop-in select-none"
            onClick={() => setEditingProject(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-5 animate-dialog-in max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary" />
                  Edit Notebook Project
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notebook Cover</label>
                <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-border group shadow-xs">
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      background: getCoverBackground(
                        editingProject.cover_image,
                        getProjectColorDef(editingProject.color).hex
                      ).background,
                      backgroundSize: editingProject.cover_image?.startsWith("data:image/") ? "cover" : undefined,
                      backgroundPosition: editingProject.cover_image?.startsWith("data:image/") ? "center" : undefined,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between z-10 text-white">
                    <span className="text-[11px] font-medium drop-shadow">
                      {editingProject.cover_image
                        ? editingProject.cover_image.startsWith("preset-")
                          ? findCoverPreset(editingProject.cover_image)?.name || "Preset Cover"
                          : editingProject.cover_image.startsWith("data:image/")
                          ? "Custom Photo"
                          : "Active Cover"
                        : "Minimal Color Theme"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditProjectCoverOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md text-xs font-medium border border-white/20 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Camera className="h-3.5 w-3.5 text-amber-300" />
                      <span>Change Cover</span>
                    </button>
                  </div>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleUpdateProject(editingProject, {
                    name: editingProject.name,
                    description: editingProject.description,
                    color: editingProject.color,
                    cover_image: editingProject.cover_image,
                    due_date: editingProject.due_date,
                  });
                  setEditingProject(null);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Project Name</label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, name: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Description (optional)</label>
                  <textarea
                    rows={2}
                    value={editingProject.description ?? ""}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        description: e.target.value || null,
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />
                </div>

                {/* 12 Color Badges */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Notebook Tag Color</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {PROJECT_COLORS.map((color) => {
                      const isSelected = editingProject.color === color.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() =>
                            setEditingProject({ ...editingProject, color: color.id })
                          }
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer text-left",
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 font-semibold"
                              : "border-border bg-background hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="truncate">{color.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Deadline (optional)</label>
                  <DatePicker
                    value={toLocalDateInput(editingProject.due_date)}
                    onChange={(dateStr) =>
                      setEditingProject({
                        ...editingProject,
                        due_date: dateInputToEpoch(dateStr),
                      })
                    }
                    placeholder="Set project target date"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editingProject.name.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* EDIT COVER MODAL */}
      {isEditProjectCoverOpen && editingProject && (
        <CoverPickerModal
          isOpen={isEditProjectCoverOpen}
          onClose={() => setIsEditProjectCoverOpen(false)}
          currentCover={editingProject.cover_image}
          projectName={editingProject.name}
          projectColorHex={getProjectColorDef(editingProject.color).hex}
          onSelectCover={(cover: string | null) =>
            setEditingProject({
              ...editingProject,
              cover_image: cover,
            })
          }
        />
      )}

      {/* CLEAR PROJECT COMPLETED DIALOG */}
      {showClearProjectDialog &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-in p-4 select-none"
            onClick={() => {
              if (!clearingCompleted) setShowClearProjectDialog(false);
            }}
          >
            <div
              className="bg-card border border-border rounded-2xl p-7 shadow-dialog max-w-sm w-full space-y-5 animate-dialog-in text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated Cat Helper with broom, progress arc & particles */}
              <CatHelper sweeping={clearingCompleted} />

              <div className="space-y-1.5">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {clearingCompleted ? "Tidying up project tasks…" : "Clear completed project tasks?"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed px-2">
                  {clearingCompleted
                    ? "A cozy helper is archiving finished project tasks into your workspace history."
                    : `This will archive ${completedCount} completed ${
                        completedCount === 1 ? "task" : "tasks"
                      } from this project. You can review them anytime in the Archive & History tab.`}
                </p>
              </div>

              {!clearingCompleted ? (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearProjectDialog(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Keep them
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearProjectCompleted()}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Clear them
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-primary font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span>Sweeping clean…</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
