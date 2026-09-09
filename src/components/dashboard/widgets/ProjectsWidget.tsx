import React from "react";
import { FolderKanban, Plus, ArrowRight } from "lucide-react";
import { getProjectColorDef } from "../../projects/projectColors";
import type { WidgetProps } from "../types";

export const ProjectsWidget: React.FC<WidgetProps> = ({
  tasks,
  projects,
  onNavigateTab,
}) => {
  return (
    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-card space-y-4 min-w-0 h-full flex flex-col justify-between hover:border-border/80 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Active Projects
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("projects")}
            className="text-[10px] text-primary hover:underline cursor-pointer font-medium"
          >
            View all ({projects.length})
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="py-6 text-center space-y-2 text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl p-4">
            <FolderKanban className="h-6 w-6 text-muted-foreground/60 mx-auto" />
            <p className="font-semibold text-foreground">No projects yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Organize your tasks, goals, and notes into structured milestones.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab("projects")}
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold cursor-pointer pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create first project</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {projects.slice(0, 4).map((p) => {
              const colorDef = getProjectColorDef(p.color);
              const projectTasks = tasks.filter((t) => t.project_id === p.id);
              const completedCount = projectTasks.filter((t) => t.status === "completed").length;
              const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => onNavigateTab("projects")}
                  className="p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 text-xs text-foreground cursor-pointer transition-all space-y-1.5 min-w-0 group border border-border/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: colorDef.hex }}
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground capitalize shrink-0">
                      {projectTasks.length} task{projectTasks.length === 1 ? "" : "s"} ({progress}%)
                    </span>
                  </div>
                  {projectTasks.length > 0 && (
                    <div className="w-full bg-border/40 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, backgroundColor: colorDef.hex }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onNavigateTab("projects")}
        className="inline-flex items-center justify-between text-xs font-semibold text-primary hover:underline cursor-pointer pt-2 border-t border-border/40 w-full"
      >
        <span>Manage all projects and goals</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
};
