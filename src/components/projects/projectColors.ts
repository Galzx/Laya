export interface ProjectColorItem {
  id: string;
  name: string;
  hex: string;
  badgeClass: string;
  barClass: string;
}

export const PROJECT_COLORS: ProjectColorItem[] = [
  { id: "amber", name: "Warm Amber", hex: "#f59e0b", badgeClass: "bg-amber-500/20 text-amber-200 border-amber-500/30", barClass: "bg-amber-500" },
  { id: "emerald", name: "Forest Emerald", hex: "#10b981", badgeClass: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30", barClass: "bg-emerald-500" },
  { id: "indigo", name: "Twilight Indigo", hex: "#6366f1", badgeClass: "bg-indigo-500/20 text-indigo-200 border-indigo-500/30", barClass: "bg-indigo-500" },
  { id: "rose", name: "Sakura Rose", hex: "#f43f5e", badgeClass: "bg-rose-500/20 text-rose-200 border-rose-500/30", barClass: "bg-rose-500" },
  { id: "violet", name: "Lavender Violet", hex: "#8b5cf6", badgeClass: "bg-violet-500/20 text-violet-200 border-violet-500/30", barClass: "bg-violet-500" },
  { id: "cyan", name: "Arctic Cyan", hex: "#06b6d4", badgeClass: "bg-cyan-500/20 text-cyan-200 border-cyan-500/30", barClass: "bg-cyan-500" },
  { id: "coral", name: "Sunset Coral", hex: "#ea580c", badgeClass: "bg-orange-500/20 text-orange-200 border-orange-500/30", barClass: "bg-orange-500" },
  { id: "leaf", name: "Herbal Leaf", hex: "#84cc16", badgeClass: "bg-lime-500/20 text-lime-200 border-lime-500/30", barClass: "bg-lime-500" },
  { id: "ruby", name: "Ruby Crimson", hex: "#e11d48", badgeClass: "bg-red-500/20 text-red-200 border-red-500/30", barClass: "bg-red-500" },
  { id: "sky", name: "Pacific Blue", hex: "#0284c7", badgeClass: "bg-sky-500/20 text-sky-200 border-sky-500/30", barClass: "bg-sky-500" },
  { id: "purple", name: "Neon Purple", hex: "#a855f7", badgeClass: "bg-purple-500/20 text-purple-200 border-purple-500/30", barClass: "bg-purple-500" },
  { id: "slate", name: "Minimal Slate", hex: "#64748b", badgeClass: "bg-slate-500/20 text-slate-200 border-slate-500/30", barClass: "bg-slate-500" },
];

export function getProjectColorDef(colorId: string): ProjectColorItem {
  if (colorId && colorId.startsWith("#")) {
    return {
      id: colorId,
      name: "Custom Tint",
      hex: colorId,
      badgeClass: "bg-primary/20 text-white border-white/20",
      barClass: "bg-primary",
    };
  }
  return PROJECT_COLORS.find((c) => c.id === colorId) || PROJECT_COLORS[0];
}

