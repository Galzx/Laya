import React from "react";
import { AlertCircle, LayoutDashboard, CheckSquare, Search } from "lucide-react";
import type { TabId } from "../layout/Sidebar";

interface NotFoundViewProps {
  onNavigate: (tab: TabId) => void;
  onOpenSearch?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate, onOpenSearch }) => {
  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4 text-center space-y-6 animate-smooth-in">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-muted text-muted-foreground mx-auto shadow-inner">
        <AlertCircle className="h-8 w-8 text-primary" />
      </div>

      <div className="space-y-2">
        <div className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] font-semibold">
          Error 404 · View Not Found
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Workspace View Does Not Exist
        </h1>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          The requested section or route could not be located in your local workspace. It may have been renamed or archived.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Return to Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("tasks")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-medium transition-all cursor-pointer shadow-2xs"
        >
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span>View All Tasks</span>
        </button>

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-medium transition-all cursor-pointer shadow-2xs"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Search Workspace (Ctrl+K)</span>
          </button>
        )}
      </div>

      <div className="pt-6 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
        Laya Desktop Core · Local SQLite Storage Active
      </div>
    </div>
  );
};
