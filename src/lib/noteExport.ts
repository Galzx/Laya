/**
 * Laya Note Publishing & Export Suite
 * 
 * Provides one-click exporting of scratchpad notes to:
 * - Styled Printable PDF / HTML document
 * - Raw Markdown (.md) downloadable file
 * - Formatted clipboard buffer
 */

export interface ExportableNote {
  id?: string;
  title: string;
  content: string;
  projectName?: string;
  createdAt?: number;
  updatedAt?: number;
}

function sanitizeFileName(title: string): string {
  return (title.trim() || "untitled_note")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

/**
 * Downloads the note as a standard .md Markdown file
 */
export function exportNoteAsMarkdown(note: ExportableNote): void {
  const createdStr = note.createdAt ? new Date(note.createdAt * 1000).toISOString() : new Date().toISOString();
  const updatedStr = note.updatedAt ? new Date(note.updatedAt * 1000).toISOString() : new Date().toISOString();

  const frontmatter = [
    "---",
    `title: "${(note.title || "Untitled Note").replace(/"/g, '\\"')}"`,
    note.projectName ? `project: "${note.projectName.replace(/"/g, '\\"')}"` : null,
    `created_at: "${createdStr}"`,
    `updated_at: "${updatedStr}"`,
    `exported_from: "Laya Workspace"`,
    "---",
    "",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const fullContent = frontmatter + (note.content || "");
  const blob = new Blob([fullContent], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileName(note.title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Renders the note into a clean, styled HTML print layout and triggers the system Print dialog
 * (allowing users to save directly as PDF)
 */
export function exportNoteToPrintableHtml(note: ExportableNote): void {
  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) {
    alert("Please allow popups to generate the printable document.");
    return;
  }

  const title = note.title || "Untitled Note";
  const dateStr = note.createdAt
    ? new Date(note.createdAt * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString();

  // Basic markdown to clean HTML conversion
  const formattedBody = (note.content || "")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/^- \[x\] (.*$)/gim, '<div class="todo-item checked"><span class="box">[x]</span> $1</div>')
    .replace(/^- \[ \] (.*$)/gim, '<div class="todo-item"><span class="box">[ ]</span> $1</div>')
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/\n\n/gim, "<p></p>")
    .replace(/\n/gim, "<br />");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - Laya Workspace</title>
  <style>
    @page {
      margin: 20mm;
      size: A4 portrait;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.6;
      max-width: 720px;
      margin: 0 auto;
      padding: 24px;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 4px;
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
    }
    .meta {
      font-size: 12px;
      color: #64748b;
    }
    .content {
      font-size: 14px;
      color: #1e293b;
    }
    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 8px;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
    }
    h3 {
      font-size: 15px;
      font-weight: 600;
      margin-top: 18px;
      margin-bottom: 6px;
    }
    code {
      font-family: "JetBrains Mono", Menlo, Consolas, monospace;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 12px;
    }
    .todo-item {
      font-family: monospace;
      margin: 4px 0;
    }
    .todo-item.checked {
      color: #64748b;
      text-decoration: line-through;
    }
    .footer {
      margin-top: 48px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">Laya Workspace · Document Export</div>
    <h1>${title}</h1>
    <div class="meta">
      ${note.projectName ? `Project: <strong>${note.projectName}</strong> · ` : ""}
      Created: ${dateStr}
    </div>
  </div>
  <div class="content">
    ${formattedBody}
  </div>
  <div class="footer">
    <span>Exported from Laya · Local-First Productivity</span>
    <span>Page 1 of 1</span>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Copies the note content to system clipboard
 */
export async function copyNoteToClipboard(note: ExportableNote): Promise<boolean> {
  const text = `# ${note.title || "Untitled Note"}\n\n${note.content || ""}`;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

