import React, { useState, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BookOpen,
  Plus,
  Search,
  Pin,
  Archive,
  LayoutGrid,
  List as ListIcon,
  FolderKanban,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Note, NoteEditor, ProjectSummary, getNoteColorDef, STARTER_TEMPLATES } from "./NoteEditor";
import { playTaskPopSound } from "../../lib/sound";

interface NotesViewProps {
  workspaceId: string;
}

type FilterType = "all" | "pinned" | "archived" | string;
type SortType = "updated" | "created" | "title";
type LayoutMode = "grid" | "list";

export const NotesView: React.FC<NotesViewProps> = ({ workspaceId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("updated");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [notesRes, projectsRes] = await Promise.all([
        invoke<Note[]>("get_notes", { workspaceId }),
        invoke<ProjectSummary[]>("get_projects", { workspaceId }),
      ]);
      setNotes(notesRes);
      setProjects(projectsRes);
      if (!selectedNoteId && notesRes.length > 0 && window.innerWidth >= 1024) {
        setSelectedNoteId(notesRes.find((n) => n.is_archived === 0)?.id || null);
      }
    } catch (err) {
      console.error("Failed to load notes data:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadData();

    const handleSync = () => {
      void loadData();
    };

    window.addEventListener("laya:notes-changed", handleSync);
    return () => {
      window.removeEventListener("laya:notes-changed", handleSync);
    };
  }, [loadData]);

  const handleCreateNote = async (targetProjectId?: string | null) => {
    playTaskPopSound();
    try {
      const created = await invoke<Note>("create_note", {
        workspaceId,
        projectId: targetProjectId || (filter.startsWith("proj-") ? filter : null),
        title: "Untitled Note",
        content: "",
        color: "amber",
      });
      setNotes((prev) => [created, ...prev]);
      setSelectedNoteId(created.id);
      window.dispatchEvent(new CustomEvent("laya:notes-changed"));
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const handleCreateNoteWithTemplate = async (template: typeof STARTER_TEMPLATES[0]) => {
    playTaskPopSound();
    try {
      const created = await invoke<Note>("create_note", {
        workspaceId,
        projectId: filter.startsWith("proj-") ? filter : null,
        title: template.defaultTitle,
        content: template.templateContent,
        color: "amber",
      });
      setNotes((prev) => [created, ...prev]);
      setSelectedNoteId(created.id);
      window.dispatchEvent(new CustomEvent("laya:notes-changed"));
    } catch (err) {
      console.error("Failed to create note with template:", err);
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const updated = await invoke<Note>("update_note", {
        noteId,
        title: updates.title,
        content: updates.content,
        projectId: updates.project_id,
        isPinned: updates.is_pinned !== undefined ? updates.is_pinned === 1 : undefined,
        color: updates.color,
      });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      window.dispatchEvent(new CustomEvent("laya:notes-changed"));
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  const handleTogglePin = async (noteId: string) => {
    playTaskPopSound();
    try {
      const updated = await invoke<Note>("toggle_note_pinned", { noteId });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      window.dispatchEvent(new CustomEvent("laya:notes-changed"));
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    try {
      let updated: Note;
      if (target.is_archived === 1) {
        updated = await invoke<Note>("restore_note", { noteId });
      } else {
        updated = await invoke<Note>("archive_note", { noteId });
      }
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      window.dispatchEvent(new CustomEvent("laya:notes-changed"));
    } catch (err) {
      console.error("Failed to archive/restore note:", err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await invoke("delete_note", { noteId });
      const nextNotes = notes.filter((n) => n.id !== noteId);
      setNotes(nextNotes);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(nextNotes[0]?.id || null);
      }
      window.dispatchEvent(new CustomEvent("laya:notes-changed"));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        if (filter === "archived") {
          if (note.is_archived !== 1) return false;
        } else {
          if (note.is_archived === 1) return false;
          if (filter === "pinned" && note.is_pinned !== 1) return false;
          if (filter !== "all" && filter !== "pinned" && note.project_id !== filter) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchContent = note.content.toLowerCase().includes(q);
          if (!matchTitle && !matchContent) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filter !== "archived" && a.is_pinned !== b.is_pinned) {
          return b.is_pinned - a.is_pinned;
        }
        if (sortBy === "updated") return b.updated_at - a.updated_at;
        if (sortBy === "created") return b.created_at - a.created_at;
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return 0;
      });
  }, [notes, filter, searchQuery, sortBy]);

  const activeNote = notes.find((n) => n.id === selectedNoteId);

  const activeCount = notes.filter((n) => n.is_archived === 0).length;
  const pinnedCount = notes.filter((n) => n.is_archived === 0 && n.is_pinned === 1).length;
  const archivedCount = notes.filter((n) => n.is_archived === 1).length;

  return (
    <div className="flex h-full w-full gap-5 overflow-hidden animate-smooth-in">
      {/* ─── LEFT SIDEBAR: FILTERS & NOTEBOOKS ─── */}
      <aside className="w-56 bg-card border border-border rounded-2xl shadow-card flex flex-col shrink-0 overflow-hidden select-none">
        <div className="p-4 pb-3 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground tracking-tight">
              Notebooks
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleCreateNote()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            title="Create note"
          >
            <Plus className="h-3 w-3" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer",
              filter === "all"
                ? "bg-muted text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>All Notes</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.2 rounded border border-border/50">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("pinned")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer",
              filter === "pinned"
                ? "bg-muted text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
              <span>Pinned</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.2 rounded border border-border/50">
              {pinnedCount}
            </span>
          </button>

          <div className="pt-3 pb-1 px-3 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Project Notebooks
            </span>
          </div>

          {projects.map((proj) => {
            const projNotesCount = notes.filter((n) => n.is_archived === 0 && n.project_id === proj.id).length;
            const isSelected = filter === proj.id;

            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => setFilter(proj.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer group",
                  isSelected
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{proj.name}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.2 rounded border border-border/50 shrink-0">
                  {projNotesCount}
                </span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-border/60 my-2" />

          <button
            type="button"
            onClick={() => setFilter("archived")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer",
              filter === "archived"
                ? "bg-muted text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Archive</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.2 rounded border border-border/50">
              {archivedCount}
            </span>
          </button>
        </div>
      </aside>

      {/* ─── MIDDLE PANE: NOTES LIST & SEARCH ─── */}
      <div className={cn(
        "flex flex-col h-full bg-card border border-border rounded-2xl shadow-card overflow-hidden transition-all duration-200",
        selectedNoteId ? "w-80 sm:w-96 shrink-0 hidden md:flex" : "flex-1"
      )}>
        <div className="p-3.5 border-b border-border/60 space-y-2.5 shrink-0 bg-card/80 backdrop-blur-sm select-none">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes & content…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-border/70 rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px] font-medium">
              {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
            </span>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="bg-muted/60 hover:bg-muted text-[11px] text-foreground rounded-lg px-2 py-1 border border-border/60 focus:outline-none cursor-pointer"
              >
                <option value="updated">Recent</option>
                <option value="created">Created</option>
                <option value="title">A-Z</option>
              </select>

              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setLayoutMode("grid")}
                  className={cn(
                    "p-1 rounded-md transition-colors cursor-pointer",
                    layoutMode === "grid" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                  )}
                  title="Grid cards"
                >
                  <LayoutGrid className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("list")}
                  className={cn(
                    "p-1 rounded-md transition-colors cursor-pointer",
                    layoutMode === "list" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                  )}
                  title="Compact list"
                >
                  <ListIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 select-none">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading notes…</div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">No notes found</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {searchQuery ? "Try searching for a different keyword." : "Create your first note to start writing thoughts and documentation."}
              </p>
              <button
                type="button"
                onClick={() => void handleCreateNote()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create note</span>
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const colorDef = getNoteColorDef(note.color);
              const linkedProject = projects.find((p) => p.id === note.project_id);
              const previewText = note.content.replace(/[#*`_~[\]>-]/g, "").slice(0, 110);
              const updatedDateStr = new Date(note.updated_at * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer group relative overflow-hidden",
                    isSelected
                      ? "bg-muted/80 border-primary/40 shadow-card"
                      : "bg-card hover:bg-muted/40 border-border hover:border-border/80 hover:shadow-2xs"
                  )}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                    style={{ backgroundColor: colorDef.hex }}
                  />

                  <div className="space-y-1.5 pl-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn(
                        "text-xs font-semibold truncate flex-1 transition-colors",
                        isSelected ? "text-foreground font-bold" : "text-foreground/90"
                      )}>
                        {note.title.trim() || "Untitled Note"}
                      </h4>

                      {note.is_pinned === 1 && (
                        <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>

                    {layoutMode === "grid" && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                        {previewText || "No content…"}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {linkedProject && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-muted border border-border/50 text-foreground font-medium truncate max-w-[110px]">
                            📓 {linkedProject.name}
                          </span>
                        )}
                      </div>
                      <span className="font-mono shrink-0">{updatedDateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT PANE: NOTE EDITOR CANVAS ─── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            projects={projects}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onArchiveNote={handleArchiveNote}
            onClose={() => setSelectedNoteId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-2xl shadow-card p-8 text-center space-y-6 overflow-y-auto">
            <div className="space-y-2 max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Welcome to Notes</h3>
              <p className="text-xs text-muted-foreground">
                Write ideas, meeting summaries, and checklists with instant formatting. Choose a starter template or create a blank note:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full text-left">
              {STARTER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => void handleCreateNoteWithTemplate(tmpl)}
                  className="p-3.5 rounded-2xl border border-border bg-card/60 hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer shadow-2xs hover:shadow-card space-y-1 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{tmpl.icon}</span>
                    <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {tmpl.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {tmpl.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => void handleCreateNote()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Create Blank Note</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

