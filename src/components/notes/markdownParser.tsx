import React from "react";

export interface MarkdownRenderOptions {
  onToggleTaskLine?: (lineIndex: number, currentChecked: boolean) => void;
  onWikilinkClick?: (noteTitle: string) => void;
  onCopyCode?: (code: string, id: string) => void;
  copiedCodeId?: string | null;
}

// ─── INLINE MARKDOWN PARSER ───────────────────────────────────────────────────

export function parseInlineMarkdown(
  text: string,
  options?: MarkdownRenderOptions,
  keyPrefix = ""
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Wikilinks [[Note Title]]
    const wikilinkMatch = remaining.match(/^\[\[([^\]]+)\]\]/);
    if (wikilinkMatch) {
      const noteTitle = wikilinkMatch[1];
      nodes.push(
        <button
          key={`${keyPrefix}wl-${key++}`}
          type="button"
          onClick={() => options?.onWikilinkClick?.(noteTitle)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[11px] font-medium transition-colors cursor-pointer mx-0.5"
          title={`Navigate to note: ${noteTitle}`}
        >
          <span className="opacity-60 text-[9px]">[[</span>
          {noteTitle}
          <span className="opacity-60 text-[9px]">]]</span>
        </button>
      );
      remaining = remaining.slice(wikilinkMatch[0].length);
      continue;
    }

    const boldItalicMatch = remaining.match(/^(\*\*\*|___)(.*?)\1/);
    if (boldItalicMatch) {
      nodes.push(
        <strong key={`${keyPrefix}bi-${key++}`} className="font-bold italic">
          {boldItalicMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldItalicMatch[0].length);
      continue;
    }

    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      nodes.push(
        <strong key={`${keyPrefix}b-${key++}`} className="font-bold text-foreground">
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      nodes.push(
        <em key={`${keyPrefix}i-${key++}`} className="italic text-foreground/90">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const strikeMatch = remaining.match(/^~~(.*?)?~~/);
    if (strikeMatch) {
      nodes.push(
        <del key={`${keyPrefix}s-${key++}`} className="line-through text-muted-foreground">
          {strikeMatch[1]}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push(
        <code
          key={`${keyPrefix}c-${key++}`}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted/80 text-primary border border-border/50"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      nodes.push(
        <a
          key={`${keyPrefix}a-${key++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const highlightMatch = remaining.match(/^==(.*?)==/);
    if (highlightMatch) {
      nodes.push(
        <mark
          key={`${keyPrefix}h-${key++}`}
          className="bg-amber-400/25 text-foreground px-1 py-px rounded font-medium dark:bg-amber-400/30"
        >
          {highlightMatch[1]}
        </mark>
      );
      remaining = remaining.slice(highlightMatch[0].length);
      continue;
    }

    nodes.push(remaining[0]);
    remaining = remaining.slice(1);
  }

  return nodes;
}

// ─── TABLE PARSER ─────────────────────────────────────────────────────────────

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(
  headerRow: string[],
  bodyRows: string[][],
  tableIndex: number,
  options?: MarkdownRenderOptions
): React.ReactNode {
  return (
    <div
      key={`table-${tableIndex}`}
      className="my-3 rounded-xl overflow-hidden border border-border shadow-xs overflow-x-auto"
    >
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            {headerRow.map((cell, ci) => (
              <th
                key={ci}
                className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap"
              >
                {parseInlineMarkdown(cell, options, `th-${tableIndex}-${ci}-`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr
              key={ri}
              className={ri % 2 === 0 ? "bg-background" : "bg-muted/25"}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-foreground/90 border-t border-border/40"
                >
                  {parseInlineMarkdown(cell, options, `td-${tableIndex}-${ri}-${ci}-`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN MARKDOWN RENDERER ───────────────────────────────────────────────────

export function renderMarkdown(
  content: string,
  options?: MarkdownRenderOptions
): React.ReactNode {
  if (!content.trim()) {
    return (
      <div className="text-muted-foreground/50 text-sm italic py-4">
        Empty note. Type in the editor to start writing…
      </div>
    );
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeBuffer: string[] = [];
  let codeBlockIndex = 0;
  let tableIndex = 0;

  // Table accumulation state
  let inTable = false;
  let tableHeaderRow: string[] = [];
  let tableBodyRows: string[][] = [];
  let tableHasSeparator = false;

  const flushTable = () => {
    if (tableHeaderRow.length > 0 && tableBodyRows.length > 0) {
      elements.push(
        renderTable(tableHeaderRow, tableBodyRows, tableIndex++, options)
      );
    }
    inTable = false;
    tableHeaderRow = [];
    tableBodyRows = [];
    tableHasSeparator = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Code blocks (highest priority)
    if (line.trim().startsWith("```")) {
      if (inTable) flushTable();

      if (inCodeBlock) {
        const fullCode = codeBuffer.join("\n");
        const blockId = `codeblock-${codeBlockIndex}`;
        const isCopied = options?.copiedCodeId === blockId;
        elements.push(
          <div
            key={blockId}
            className="my-3 rounded-xl overflow-hidden border border-border bg-muted/40 font-mono text-xs shadow-xs"
          >
            <div className="px-3.5 py-1 bg-muted/70 border-b border-border/60 text-[10px] uppercase font-semibold text-muted-foreground flex justify-between items-center">
              <span>{codeLang || "code"}</span>
              <button
                type="button"
                onClick={() => options?.onCopyCode?.(fullCode, blockId)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/60 hover:bg-background border border-border/60 text-[10px] font-medium cursor-pointer transition-colors text-muted-foreground hover:text-foreground normal-case"
                title="Copy code"
              >
                {isCopied ? (
                  <>
                    <svg className="h-2.5 w-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-foreground font-mono leading-relaxed">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLang = "";
        codeBlockIndex++;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // ── Table detection
    if (isTableRow(line)) {
      if (!inTable) {
        // Start accumulating table
        inTable = true;
        tableHeaderRow = parseTableRow(line);
        tableHasSeparator = false;
        tableBodyRows = [];
      } else if (!tableHasSeparator && isSeparatorRow(line)) {
        tableHasSeparator = true;
      } else {
        tableBodyRows.push(parseTableRow(line));
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // ── Non-table, non-code-block lines

    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      elements.push(
        <hr key={`hr-${i}`} className="my-4 border-t border-border/70" />
      );
      continue;
    }

    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-4 mb-2 first:mt-0"
        >
          {parseInlineMarkdown(h1Match[1], options, `h1-${i}-`)}
        </h1>
      );
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-lg sm:text-xl font-semibold tracking-tight text-foreground mt-3.5 mb-1.5"
        >
          {parseInlineMarkdown(h2Match[1], options, `h2-${i}-`)}
        </h2>
      );
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm sm:text-base font-semibold text-foreground mt-3 mb-1"
        >
          {parseInlineMarkdown(h3Match[1], options, `h3-${i}-`)}
        </h3>
      );
      continue;
    }

    const h4Match = line.match(/^####\s+(.+)$/);
    if (h4Match) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-xs sm:text-sm font-semibold text-foreground mt-2 mb-1 uppercase tracking-wide text-muted-foreground"
        >
          {parseInlineMarkdown(h4Match[1], options, `h4-${i}-`)}
        </h4>
      );
      continue;
    }

    const quoteMatch = line.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-primary/60 pl-3.5 my-2 italic text-muted-foreground text-xs sm:text-sm bg-primary/5 py-1.5 rounded-r-lg"
        >
          {parseInlineMarkdown(quoteMatch[1], options, `q-${i}-`)}
        </blockquote>
      );
      continue;
    }

    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === "x";
      const lineIndex = i;
      elements.push(
        <div
          key={`task-${i}`}
          className="flex items-start gap-2.5 my-1.5 group/task select-none text-xs sm:text-sm"
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => options?.onToggleTaskLine?.(lineIndex, isChecked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer accent-primary shrink-0"
          />
          <span
            className={
              isChecked
                ? "line-through text-muted-foreground transition-colors"
                : "text-foreground transition-colors"
            }
          >
            {parseInlineMarkdown(taskMatch[3], options, `task-${i}-`)}
          </span>
        </div>
      );
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div
          key={`bullet-${i}`}
          className="flex items-start gap-2 my-1 text-xs sm:text-sm text-foreground/90 pl-1"
        >
          <span className="text-primary font-bold leading-none mt-1">•</span>
          <span>{parseInlineMarkdown(bulletMatch[2], options, `bul-${i}-`)}</span>
        </div>
      );
      continue;
    }

    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <div
          key={`num-${i}`}
          className="flex items-start gap-2 my-1 text-xs sm:text-sm text-foreground/90 pl-1 font-sans"
        >
          <span className="font-mono text-xs font-semibold text-primary/80 shrink-0">
            {numMatch[2]}.
          </span>
          <span>{parseInlineMarkdown(numMatch[3], options, `num-${i}-`)}</span>
        </div>
      );
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    elements.push(
      <p
        key={`p-${i}`}
        className="my-1.5 text-xs sm:text-sm text-foreground leading-relaxed"
      >
        {parseInlineMarkdown(line, options, `p-${i}-`)}
      </p>
    );
  }

  // Flush any pending table at end of content
  if (inTable) flushTable();

  return <div className="space-y-0.5">{elements}</div>;
}

// ─── WIKILINK EXTRACTOR (for backlinks computation) ───────────────────────────

export function extractWikilinks(content: string): string[] {
  const matches = [...content.matchAll(/\[\[([^\]]+)\]\]/g)];
  return [...new Set(matches.map((m) => m[1].trim()))];
}
