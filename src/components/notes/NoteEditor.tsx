import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Pin,
  Trash2,
  Archive,
  Columns,
  Eye,
  Edit3,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  CheckSquare,
  Quote,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  FolderKanban,
  Check,
  X,
  Sparkles,
  HelpCircle,
  Copy,
  Highlighter,
  ListOrdered,
  ChevronDown,
  Link2,
  FileText,
  Calendar,
  Rocket,
  Lightbulb,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { renderMarkdown, extractWikilinks } from "./markdownParser";
import { playTaskPopSound } from "../../lib/sound";

export interface Note {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  content: string;
  is_pinned: number;
  is_archived: number;
  color: string;
  created_at: number;
  updated_at: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  color: string;
}

interface NoteEditorProps {
  note: Note;
  projects: ProjectSummary[];
  allNotes?: Note[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onTogglePin: (noteId: string) => Promise<void>;
  onArchiveNote: (noteId: string) => Promise<void>;
  onNavigateToNote?: (noteId: string) => void;
  onClose?: () => void;
}

type ViewMode = "split" | "edit" | "preview";

export const NOTE_COLORS: { id: string; name: string; bg: string; border: string; badge: string; hex: string }[] = [
  { id: "amber",    name: "Amber",    bg: "bg-amber-500/10",    border: "border-amber-500/30",    badge: "bg-amber-500 text-white",    hex: "#F59E0B" },
  { id: "emerald",  name: "Emerald",  bg: "bg-emerald-500/10",  border: "border-emerald-500/30",  badge: "bg-emerald-500 text-white",  hex: "#10B981" },
  { id: "sapphire", name: "Sapphire", bg: "bg-sky-500/10",      border: "border-sky-500/30",      badge: "bg-sky-500 text-white",      hex: "#0EA5E9" },
  { id: "indigo",   name: "Indigo",   bg: "bg-indigo-500/10",   border: "border-indigo-500/30",   badge: "bg-indigo-500 text-white",   hex: "#6366F1" },
  { id: "rose",     name: "Rose",     bg: "bg-rose-500/10",     border: "border-rose-500/30",     badge: "bg-rose-500 text-white",     hex: "#F43F5E" },
  { id: "violet",   name: "Violet",   bg: "bg-purple-500/10",   border: "border-purple-500/30",   badge: "bg-purple-500 text-white",   hex: "#A855F7" },
  { id: "slate",    name: "Slate",    bg: "bg-slate-500/10",    border: "border-slate-500/30",    badge: "bg-slate-500 text-white",    hex: "#64748B" },
];

export function getNoteColorDef(colorId?: string | null) {
  return NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0];
}

// ─── STARTER TEMPLATES ───
export const STARTER_TEMPLATES: {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  defaultTitle: string;
  templateContent: string;
}[] = [
  {
    id: "meeting",
    title: "Meeting Notes",
    icon: FileText,
    description: "Objective, attendees, discussion points, and action items.",
    defaultTitle: "Meeting Notes",
    templateContent: `## Objective
Discuss priorities, project updates, and upcoming deliverables.

### Attendees
- 

### Discussion Points
- 
- 

### Action Items
- [ ] Task 1 (Assignee / Due Date)
- [ ] Follow up on next steps
`,
  },
  {
    id: "daily_focus",
    title: "Daily Focus",
    icon: Calendar,
    description: "Top 3 priorities for today, quick notes, and wins.",
    defaultTitle: "Daily Focus & Reflection",
    templateContent: `## Top 3 Priorities for Today
- [ ] Priority 1 (Most important)
- [ ] Priority 2
- [ ] Priority 3

### Quick Notes & Brainstorm
- 

### Wins & Gratitude
- What went well today?
`,
  },
  {
    id: "project_plan",
    title: "Project Roadmap",
    icon: Rocket,
    description: "Milestones, scope, and key deliverables.",
    defaultTitle: "Project Roadmap",
    templateContent: `## Overview
What problem does this project solve?

### Key Milestones
1. Phase 1: Research & Requirements
2. Phase 2: Implementation & Polish
3. Phase 3: Launch

### Deliverables
- [ ] Define project scope
- [ ] Build key components
- [ ] Test and review
`,
  },
  {
    id: "brainstorm",
    title: "Brainstorming",
    icon: Lightbulb,
    description: "Challenge definition, idea dump, and questions.",
    defaultTitle: "Brainstorming & Ideas",
    templateContent: `## Core Challenge
What is the problem or opportunity?

### Ideas & Solutions
- **Idea 1**: 
- **Idea 2**: 

### Open Questions
> What is the easiest first experiment we can run?
`,
  },
  {
    id: "checklist",
    title: "Checklist",
    icon: CheckSquare,
    description: "Clickable checkbox list for quick tasks.",
    defaultTitle: "Task Checklist",
    templateContent: `## Checklist
- [ ] First task item
- [ ] Second task item
- [ ] Third task item
`,
  },
];

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  projects,
  allNotes = [],
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onArchiveNote,
  onNavigateToNote,
  onClose,
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [projectId, setProjectId] = useState<string | null>(note.project_id);
  const [color, setColor] = useState(note.color || "amber");
  const [viewMode, setViewMode] = useState<ViewMode>(note.content.trim() ? "preview" : "edit");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    window.setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleWikilinkClick = (noteTitle: string) => {
    const target = allNotes.find((n) => n.title.trim().toLowerCase() === noteTitle.trim().toLowerCase());
    if (target && onNavigateToNote) {
      onNavigateToNote(target.id);
    }
  };

  const backlinks = useMemo(() => {
    if (!allNotes.length || !note.title.trim()) return [];
    const currentTitle = note.title.trim().toLowerCase();
    return allNotes.filter((n) => {
      if (n.id === note.id || n.is_archived === 1) return false;
      const links = extractWikilinks(n.content);
      return links.some((l) => l.toLowerCase() === currentTitle);
    });
  }, [allNotes, note.id, note.title]);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setProjectId(note.project_id);
    setColor(note.color || "amber");
    setSaveStatus("saved");
    setViewMode(note.content.trim() ? "preview" : "edit");
  }, [note.id]);

  const triggerAutoSave = useCallback(
    (newTitle: string, newContent: string, newProjectId: string | null, newColor: string) => {
      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          await onUpdateNote(note.id, {
            title: newTitle.trim() || "Untitled Note",
            content: newContent,
            project_id: newProjectId,
            color: newColor,
          });
          setSaveStatus("saved");
        } catch (err) {
          console.error("Failed to auto-save note:", err);
          setSaveStatus("unsaved");
        }
      }, 650);
    },
    [note.id, onUpdateNote]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content, projectId, color);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val, projectId, color);
  };

  const handleProjectChange = (newProjId: string | null) => {
    setProjectId(newProjId);
    triggerAutoSave(title, content, newProjId, color);
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setShowColorPicker(false);
    triggerAutoSave(title, content, projectId, newColor);
  };

  const applyTemplate = (template: typeof STARTER_TEMPLATES[0]) => {
    playTaskPopSound();
    let newTitle = title;
    if (!title.trim() || title === "Untitled Note") {
      newTitle = template.defaultTitle;
      setTitle(newTitle);
    }
    setContent(template.templateContent);
    setShowTemplatesModal(false);
    triggerAutoSave(newTitle, template.templateContent, projectId, color);
  };

  const insertFormatting = (prefix: string, suffix = "", defaultText = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selection}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    triggerAutoSave(title, newContent, projectId, color);

    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selection.length
      );
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = content.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const lineEnd = content.indexOf("\n", start) === -1 ? content.length : content.indexOf("\n", start);

    const currentLine = content.substring(lineStart, lineEnd);
    const newLine = `${prefix}${currentLine}`;
    const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);

    setContent(newContent);
    triggerAutoSave(title, newContent, projectId, color);

    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      insertFormatting("**", "**", "bold text");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      insertFormatting("*", "*", "italic text");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void onUpdateNote(note.id, {
        title: title.trim() || "Untitled Note",
        content,
        project_id: projectId,
        color,
      });
      setSaveStatus("saved");
    } else if (e.key === "Tab") {
      e.preventDefault();
      insertFormatting("  ", "");
    }
  };

  const handleToggleTaskLine = (lineIndex: number, currentChecked: boolean) => {
    playTaskPopSound();
    const lines = content.split("\n");
    if (lines[lineIndex] !== undefined) {
      const targetChar = currentChecked ? " " : "x";
      lines[lineIndex] = lines[lineIndex].replace(/^(\s*[-*]\s+\[)[ xX](\]\s+)/, `$1${targetChar}$2`);
      const newContent = lines.join("\n");
      setContent(newContent);
      triggerAutoSave(title, newContent, projectId, color);
    }
  };

  const handleCopyNoteContent = async () => {
    try {
      await navigator.clipboard.writeText(`# ${title}\n\n${content}`);
      setCopiedNotification(true);
      window.setTimeout(() => setCopiedNotification(false), 2000);
    } catch (err) {
      console.error("Failed to copy content:", err);
    }
  };

  const trimmed = content.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = content.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const colorDef = getNoteColorDef(color);
  const selectedProject = projects.find((p) => p.id === projectId);
  const isContentEmpty = !trimmed;

  return (
    <div className="flex-1 flex flex-col h-full bg-card border border-border rounded-2xl shadow-card overflow-hidden animate-smooth-in select-none relative">
      {/* ─── COMPACT NON-SCROLLABLE HEADER BAR ─── */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between gap-2 bg-card/60 backdrop-blur-md shrink-0">
        {/* Left: Project selector & Color Accent */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Project Notebook Select */}
          <div className="relative flex items-center">
            <select
              value={projectId || ""}
              onChange={(e) => handleProjectChange(e.target.value || null)}
              className="bg-muted/70 hover:bg-muted border border-border text-xs font-medium text-foreground rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer appearance-none max-w-[130px] truncate"
              title="Assign to Project Notebook"
            >
              <option value="">No Notebook</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-muted-foreground pointer-events-none absolute right-2" />
          </div>

          {/* Color Accent Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs cursor-pointer transition-colors"
              title="Change note color"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: colorDef.hex }}
              />
              <span className="capitalize text-[11px] font-medium text-foreground hidden sm:inline">
                {colorDef.name}
              </span>
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1.5 z-30 p-2 bg-popover border border-border rounded-xl shadow-xl flex items-center gap-1.5 animate-scale-in">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleColorChange(c.id)}
                    className={cn(
                      "w-5 h-5 rounded-full transition-transform hover:scale-110 cursor-pointer relative",
                      color === c.id ? "ring-2 ring-primary ring-offset-1" : ""
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {color === c.id && <Check className="h-3 w-3 text-white absolute inset-1 m-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-Save indicator */}
          <span className="text-[10px] font-mono text-muted-foreground/70 flex items-center gap-1 pl-1">
            {saveStatus === "saving" ? (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            ) : saveStatus === "saved" ? (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ) : (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
            )}
            <span className="capitalize hidden md:inline">{saveStatus}</span>
          </span>
        </div>

        {/* Right: Actions & View Switcher */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary transition-colors cursor-pointer"
            title="Pick a template"
          >
            <Sparkles className="h-3 w-3" />
            <span className="text-[11px] hidden sm:inline">Templates</span>
          </button>

          {/* Guide Button */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Shortcuts & Formatting Guide"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={() => void handleCopyNoteContent()}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Copy content"
          >
            {copiedNotification ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Pin Button */}
          <button
            type="button"
            onClick={() => void onTogglePin(note.id)}
            className={cn(
              "p-1.5 rounded-lg border transition-colors cursor-pointer",
              note.is_pinned === 1
                ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={note.is_pinned === 1 ? "Unpin note" : "Pin to top"}
          >
            <Pin className={cn("h-3.5 w-3.5", note.is_pinned === 1 && "fill-current")} />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                viewMode === "edit"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Write Mode"
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer hidden sm:inline-flex",
                viewMode === "split"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Split View"
            >
              <Columns className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                viewMode === "preview"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Read Mode"
            >
              <Eye className="h-3 w-3" />
            </button>
          </div>

          {/* Archive Button */}
          <button
            type="button"
            onClick={() => void onArchiveNote(note.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={note.is_archived === 1 ? "Restore note" : "Archive note"}
          >
            <Archive className="h-3.5 w-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => void onDeleteNote(note.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-0.5"
              title="Close editor"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── DOCKED FORMATTING TOOLBAR (Non-scrollable, Minimalist) ─── */}
      {viewMode !== "preview" && (
        <div className="px-4 py-1.5 bg-muted/20 border-b border-border/50 flex items-center justify-between gap-1 select-none shrink-0">
          <div className="flex items-center gap-1">
            {/* Headings */}
            <button
              type="button"
              onClick={() => insertLinePrefix("# ")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Heading 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix("## ")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Heading 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix("### ")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Heading 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>

            <div className="h-3.5 w-px bg-border/80 mx-1 shrink-0" />

            {/* Text Styling */}
            <button
              type="button"
              onClick={() => insertFormatting("**", "**", "bold text")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*", "italic text")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("~~", "~~", "strikethrough text")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("==", "==", "highlighted text")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Highlight Text (==text==)"
            >
              <Highlighter className="h-3.5 w-3.5 text-amber-500" />
            </button>

            <div className="h-3.5 w-px bg-border/80 mx-1 shrink-0" />

            {/* Lists & Checklists */}
            <button
              type="button"
              onClick={() => insertLinePrefix("- [ ] ")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Task Checklist (- [ ])"
            >
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix("- ")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Bullet List (- item)"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix("1. ")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Numbered List (1. item)"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix("> ")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Quote Box (> quote)"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>

            <div className="h-3.5 w-px bg-border/80 mx-1 shrink-0" />

            {/* Code & Divider */}
            <button
              type="button"
              onClick={() => insertFormatting("`", "`", "code")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Inline Code (`code`)"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n", "\n```", "code block")}
              className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Code Block"
            >
              {"{ }"}
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix("---\n")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Divider Line (---)"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── EDITOR BODY & LIVE PREVIEW ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Column: Markdown Input */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto border-r border-border/40 bg-background/30">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title…"
              className="text-xl sm:text-2xl font-bold bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none mb-3 shrink-0 tracking-tight"
            />

            {/* Compact Starter Template Bar for Empty Notes */}
            {isContentEmpty && (
              <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2 animate-smooth-in">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Starter Templates</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTemplatesModal(true)}
                    className="text-[11px] hover:underline font-normal text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    View All →
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_TEMPLATES.slice(0, 3).map((tmpl) => {
                    const TmplIcon = tmpl.icon;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => applyTemplate(tmpl)}
                        className="px-2.5 py-1 rounded-lg border border-border/80 bg-card hover:bg-muted/80 hover:border-primary/40 text-xs font-medium text-foreground transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <TmplIcon className="h-3.5 w-3.5 text-primary" />
                        <span>{tmpl.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Start typing your thoughts here… Click buttons in the toolbar to format."
              className="flex-1 w-full bg-transparent resize-none border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none font-mono text-xs sm:text-sm leading-relaxed"
            />
          </div>
        )}

        {/* Right Column: Rendered Markdown Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto bg-card relative group/preview">
            {viewMode === "preview" && (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4 pb-2 border-b border-border/60">
                {title.trim() || "Untitled Note"}
              </h1>
            )}

            {/* Click-to-edit overlay hint (only in pure preview mode) */}
            {viewMode === "preview" && (
              <button
                type="button"
                onClick={() => {
                  setViewMode("edit");
                  window.setTimeout(() => textareaRef.current?.focus(), 30);
                }}
                className="absolute top-3 right-3 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/80 border border-border text-[11px] text-muted-foreground hover:text-foreground cursor-pointer z-10"
                title="Click to edit"
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </button>
            )}

            <div
              className={viewMode === "preview" ? "prose prose-sm dark:prose-invert max-w-none cursor-text" : "prose prose-sm dark:prose-invert max-w-none"}
              onClick={(e) => {
                // Only switch to edit on click in pure preview mode
                // Don't intercept clicks on interactive elements
                if (viewMode !== "preview") return;
                const target = e.target as HTMLElement;
                const isInteractive = target.closest("button, a, input, [role='button']");
                if (!isInteractive) {
                  setViewMode("edit");
                  window.setTimeout(() => textareaRef.current?.focus(), 30);
                }
              }}
            >
              {renderMarkdown(content, {
                onToggleTaskLine: handleToggleTaskLine,
                onWikilinkClick: handleWikilinkClick,
                onCopyCode: handleCopyCode,
                copiedCodeId,
              })}
            </div>

            {/* Backlinks panel */}
            {backlinks.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border/60">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  <span>Linked from {backlinks.length} {backlinks.length === 1 ? "note" : "notes"}</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {backlinks.map((bn) => (
                    <button
                      key={bn.id}
                      type="button"
                      onClick={() => onNavigateToNote?.(bn.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary border border-border text-xs font-medium transition-colors cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[200px]">{bn.title || "Untitled Note"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FOOTER BAR ─── */}
      <div className="px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
          <span>•</span>
          <span>~{readingTimeMinutes} min read</span>
        </div>

        <div className="flex items-center gap-3">
          {selectedProject && (
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <FolderKanban className="h-3 w-3 text-primary" />
              <span className="truncate max-w-[150px]">{selectedProject.name}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="h-3 w-3" />
            <span>Shortcuts & Guide</span>
          </button>
        </div>
      </div>

      {/* ─── TEMPLATES MODAL ─── */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Starter Templates</h3>
                  <p className="text-xs text-muted-foreground">Pick a template to kickstart your note instantly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {STARTER_TEMPLATES.map((tmpl) => {
                const TmplIcon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/50 text-left transition-all cursor-pointer shadow-xs space-y-1.5 group"
                  >
                    <div className="flex items-center gap-2">
                      <TmplIcon className="h-5 w-5 text-primary shrink-0" />
                      <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {tmpl.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {tmpl.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FORMATTING & SHORTCUTS GUIDE MODAL ─── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Beginner's Formatting Guide</h3>
                  <p className="text-xs text-muted-foreground">Easy formatting tricks and keyboard shortcuts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Keyboard Shortcuts */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Essential Shortcuts</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-muted/50 border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Bold Text</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">Ctrl + B</kbd>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/50 border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Italic Text</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">Ctrl + I</kbd>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/50 border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Instant Save</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">Ctrl + S</kbd>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/50 border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Indent Line</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">Tab</kbd>
                  </div>
                </div>
              </div>

              {/* Formatting Cheat Sheet Table */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Formatting Cheat Sheet</span>
                </h4>
                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                  <div className="p-2 bg-muted/40 font-medium text-[11px] grid grid-cols-2 text-muted-foreground">
                    <span>What you type</span>
                    <span>What it looks like</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]"># Big Heading</code>
                    <span className="font-bold text-sm text-foreground">Big Heading</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]">## Section Heading</code>
                    <span className="font-semibold text-xs text-foreground">Section Heading</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]">- [ ] Todo item</code>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded border border-border inline-block" />
                      <span>Todo item</span>
                    </span>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]">**Bold text**</code>
                    <span className="font-bold text-foreground">Bold text</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]">*Italic text*</code>
                    <span className="italic text-foreground">Italic text</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]">==Highlighted==</code>
                    <mark className="bg-amber-400/30 text-foreground px-1 rounded text-[11px]">Highlighted</mark>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]">&gt; Quote text</code>
                    <span className="border-l-2 border-primary/60 pl-2 italic text-muted-foreground">Quote text</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 items-center text-[11px]">
                    <code className="font-mono text-primary text-[10px]">`inline code`</code>
                    <code className="bg-muted px-1 rounded font-mono text-[10px] text-primary">inline code</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
