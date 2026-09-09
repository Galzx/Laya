import React from "react";
import {
  CheckSquare,
  Columns3,
  FolderKanban,
  BookOpen,
  CalendarDays,
  Flame,
  Bot,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { WidgetProps } from "../types";
import type { TabId } from "../../layout/Sidebar";

const quickLinks: {
  id: TabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}[] = [
  {
    id: "tasks",
    label: "Tasks",
    description: "Capture, organize, and plan your work",
    icon: CheckSquare,
    accentColor: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    id: "kanban",
    label: "Kanban",
    description: "Agile 4-column drag and drop board",
    icon: Columns3,
    accentColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white",
  },
  {
    id: "projects",
    label: "Projects",
    description: "Organise larger milestones and goals",
    icon: FolderKanban,
    accentColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
  },
  {
    id: "notes",
    label: "Notes",
    description: "Markdown notes and knowledge scratchpad",
    icon: BookOpen,
    accentColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Schedule milestones across months",
    icon: CalendarDays,
    accentColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white",
  },
  {
    id: "focus",
    label: "Focus",
    description: "Ambient multi-track soundscape studio",
    icon: Flame,
    accentColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
  },
  {
    id: "ai",
    label: "Sammi",
    description: "Autonomous offline intelligence",
    icon: Bot,
    accentColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Daily metrics and velocity history",
    icon: TrendingUp,
    accentColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white",
  },
];

export const WorkspaceHubsWidget: React.FC<WidgetProps> = ({
  onNavigateTab,
}) => {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Workspace Hubs
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {quickLinks.map(({ id, label, description, icon: Icon, accentColor }) => (
          <button
            key={id}
            onClick={() => onNavigateTab(id)}
            className="group flex items-start gap-2.5 sm:gap-3.5 p-3 sm:p-4 bg-card border border-border rounded-xl sm:rounded-2xl text-left shadow-card hover:shadow-card-hover hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer min-w-0"
          >
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-all duration-200 shrink-0 shadow-2xs",
                accentColor
              )}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {label}
                </p>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block shrink-0" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
