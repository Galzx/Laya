import React from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Columns3,
  FolderKanban,
  BookOpen,
  CalendarDays,
  Flame,
  Bot,
  TrendingUp,
  Settings,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "../../lib/utils";

export type TabId =
  | "dashboard"
  | "tasks"
  | "kanban"
  | "projects"
  | "notes"
  | "calendar"
  | "focus"
  | "ai"
  | "analytics"
  | "settings";

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  todayTaskCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks",     label: "Tasks",     icon: CheckSquare },
  { id: "kanban",    label: "Kanban Board", icon: Columns3 },
  { id: "projects",  label: "Projects",  icon: FolderKanban },
  { id: "notes",     label: "Notes",     icon: BookOpen },
  { id: "calendar",  label: "Calendar",  icon: CalendarDays },
  { id: "focus",     label: "Focus",     icon: Flame },
  { id: "ai",        label: "Sammi",     icon: Bot },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  todayTaskCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-sidebar-border h-screen flex flex-col select-none shrink-0 transition-all duration-200 ease-in-out z-20",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Wordmark & Collapse Toggle */}
      <div
        className={cn(
          "pt-5 pb-4 flex items-center transition-all",
          isCollapsed ? "px-2.5 justify-center" : "px-4 justify-between"
        )}
      >
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => onSelectTab("dashboard")}
            className="flex items-baseline gap-1.5 group cursor-pointer text-left min-w-0 transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
            title="Go to Dashboard"
          >
            <span className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
              Laya
            </span>
            <span className="text-[10px] font-medium text-primary/70 tracking-widest uppercase">
              workspace
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab("dashboard")}
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs shadow-2xs cursor-pointer transition-colors"
            title="Go to Dashboard"
          >
            L
          </button>
        )}

        {onToggleCollapse && !isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={cn("border-t border-sidebar-border mb-3", isCollapsed ? "mx-2" : "mx-4")} />

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.id === "tasks" && todayTaskCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center rounded-xl transition-all duration-150 relative cursor-pointer group",
                isCollapsed
                  ? "justify-center px-0 py-2.5"
                  : "justify-between px-3 py-2 text-sm",
                isActive
                  ? "bg-background text-foreground font-medium shadow-card ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              )}
            >
              <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
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
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {showBadge && !isCollapsed && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-px rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {todayTaskCount}
                </span>
              )}

              {showBadge && isCollapsed && (
                <span
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar"
                  title={`${todayTaskCount} tasks due`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4">
        <div className={cn("border-t border-sidebar-border mb-3", isCollapsed ? "mx-1" : "mx-2")} />
        <button
          onClick={() => onSelectTab("settings")}
          title={isCollapsed ? "Settings" : undefined}
          className={cn(
            "w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer group relative",
            isCollapsed
              ? "justify-center px-0 py-2.5"
              : "gap-2.5 px-3 py-2 text-sm",
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
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
};