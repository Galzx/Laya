import React from "react";

export interface MarkdownRenderOptions {
  onToggleTaskLine?: (lineIndex: number, currentChecked: boolean) => void;
}

export function parseInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldItalicMatch = remaining.match(/^(\*\*\*|___)(.*?)\1/);
    if (boldItalicMatch) {
      nodes.push(
        <strong key={key++} className="font-bold italic">
          {boldItalicMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldItalicMatch[0].length);
      continue;
    }

    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      nodes.push(
        <strong key={key++} className="font-bold text-foreground">
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      nodes.push(
        <em key={key++} className="italic text-foreground/90">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      nodes.push(
        <del key={key++} className="line-through text-muted-foreground">
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
          key={key++}
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
          key={key++}
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
          key={key++}
          className="bg-amber-400/25 text-foreground px-1 py-0.2 rounded font-medium dark:bg-amber-400/30"
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        const fullCode = codeBuffer.join("\n");
        elements.push(
          <div
            key={`code-block-${codeBlockIndex++}`}
            className="my-3 rounded-xl overflow-hidden border border-border bg-muted/40 font-mono text-xs shadow-xs"
          >
            {codeLang && (
              <div className="px-3.5 py-1 bg-muted/70 border-b border-border/60 text-[10px] uppercase font-semibold text-muted-foreground flex justify-between items-center">
                <span>{codeLang}</span>
              </div>
            )}
            <pre className="p-3.5 overflow-x-auto text-foreground font-mono leading-relaxed">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLang = "";
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
          {parseInlineMarkdown(h1Match[1])}
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
          {parseInlineMarkdown(h2Match[1])}
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
          {parseInlineMarkdown(h3Match[1])}
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
          {parseInlineMarkdown(h4Match[1])}
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
          {parseInlineMarkdown(quoteMatch[1])}
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
            {parseInlineMarkdown(taskMatch[3])}
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
          <span>{parseInlineMarkdown(bulletMatch[2])}</span>
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
          <span>{parseInlineMarkdown(numMatch[3])}</span>
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
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

