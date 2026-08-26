import React from "react";
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  BookOpen, 
  CalendarDays, 
  Flame, 
  Bot, 
  Settings 
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
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "notes", label: "Notes", icon: BookOpen },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "focus", label: "Focus Mode", icon: Flame },
  { id: "ai", label: "Sammi (AI)", icon: Bot },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <aside className="w-64 bg-card border-r border-border h-screen flex flex-col justify-between select-none">
      <div className="p-4">
        {/* Workspace Brand / Header */}
        <div className="flex items-center gap-2.5 px-3 py-2 mb-6">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            L
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Laya</h1>
            <p className="text-xs text-muted-foreground">Local-First Workspace</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-foreground" : "text-muted-foreground")} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Settings */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => onSelectTab("settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors",
            activeTab === "settings"
              ? "bg-secondary text-secondary-foreground font-semibold"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  );
};