import React from "react";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  BookOpen,
  CalendarDays,
  Flame,
  Bot,
  Settings,
} from "lucide-react";
import { cn } from "../../lib/utils";

export type TabId =
  | "dashboard"
  | "tasks"
  | "projects"
  | "notes"
  | "calendar"
  | "focus"
  | "ai"
  | "settings";

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  todayTaskCount?: number;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks",     label: "Tasks",     icon: CheckSquare },
  { id: "projects",  label: "Projects",  icon: FolderKanban },
  { id: "notes",     label: "Notes",     icon: BookOpen },
  { id: "calendar",  label: "Calendar",  icon: CalendarDays },
  { id: "focus",     label: "Focus",     icon: Flame },
  { id: "ai",        label: "Sammi",     icon: Bot },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, todayTaskCount = 0 }) => {
  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border h-screen flex flex-col select-none shrink-0">
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline gap-1.5 group cursor-default">
          <span className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
            Laya
          </span>
          <span className="text-[10px] font-medium text-primary/70 tracking-widest uppercase">
            workspace
          </span>
        </div>
      </div>

      <div className="mx-4 border-t border-sidebar-border mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.id === "tasks" && todayTaskCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-150 relative cursor-pointer group",
                isActive
                  ? "bg-background text-foreground font-medium shadow-card ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-150",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {showBadge && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {todayTaskCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4">
        <div className="mx-2 border-t border-sidebar-border mb-3" />
        <button
          onClick={() => onSelectTab("settings")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-150 cursor-pointer group relative",
            activeTab === "settings"
              ? "bg-background text-foreground font-medium shadow-card ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
          )}
        >
          {activeTab === "settings" && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
          <Settings
            className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-150",
              activeTab === "settings" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          Settings
        </button>
      </div>
    </aside>
  );
};