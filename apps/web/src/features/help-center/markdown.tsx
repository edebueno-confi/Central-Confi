import type { ReactNode } from 'react';

interface InlinePart {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
}

interface Block {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote' | 'rule';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text?: string;
  items?: string[];
  lines?: string[];
}

function isSafeHref(value: string) {
  return /^(https?:\/\/|mailto:)/i.test(value);
}

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index) });
    }

    if (match[2] && match[3]) {
      parts.push({
        text: match[2],
        href: isSafeHref(match[3].trim()) ? match[3].trim() : undefined,
      });
    } else if (match[4]) {
      parts.push({ text: match[4], bold: true });
    } else if (match[5]) {
      parts.push({ text: match[5], code: true });
    } else if (match[6]) {
      parts.push({ text: match[6], italic: true });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text }];
}

function parseMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({ type: 'code', lines: codeLines });
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as Block['level'],
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: 'quote', lines: quoteLines });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (
        !candidate ||
        candidate.startsWith('```') ||
        /^(#{1,6})\s+/.test(candidate) ||
        candidate.startsWith('> ') ||
        /^[-*]\s+/.test(candidate) ||
        candidate === '---' ||
        candidate === '***'
      ) {
        break;
      }

      paragraphLines.push(candidate);
      index += 1;
    }

    blocks.push({
      type: 'paragraph',
      text: paragraphLines.join(' '),
    });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  return parseInline(text).map((part, index) => {
    const key = `${part.text}-${index}`;

    if (part.href) {
      return (
        <a
          key={key}
          className="font-medium text-[color:var(--help-link)] underline decoration-[rgba(255,255,255,0.28)] underline-offset-4 hover:text-[color:var(--help-link-hover)]"
          href={part.href}
          rel="noreferrer"
          target="_blank"
        >
          {part.text}
        </a>
      );
    }

    if (part.code) {
      return (
        <code
          key={key}
          className="rounded-lg bg-[rgba(20,31,71,0.08)] px-1.5 py-0.5 font-mono text-[0.92em] text-[color:var(--help-ink-strong)]"
        >
          {part.text}
        </code>
      );
    }

    if (part.bold) {
      return <strong key={key}>{part.text}</strong>;
    }

    if (part.italic) {
      return <em key={key}>{part.text}</em>;
    }

    return <span key={key}>{part.text}</span>;
  });
}

export function MarkdownDocument({ source }: { source: string }) {
  const blocks = parseMarkdown(source);

  return (
    <div className="space-y-6 text-[color:var(--help-ink)]">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === 'rule') {
          return (
            <hr
              key={key}
              className="border-0 border-t border-[rgba(20,31,71,0.12)]"
            />
          );
        }

        if (block.type === 'heading') {
          const Tag = `h${block.level ?? 2}` as const;
          const className =
            block.level === 1
              ? 'scroll-mt-24 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--help-ink-strong)] sm:text-[2.1rem]'
              : block.level === 2
                ? 'scroll-mt-24 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--help-ink-strong)] sm:text-[1.75rem]'
                : 'scroll-mt-24 text-xl font-semibold tracking-[-0.03em] text-[color:var(--help-ink-strong)] sm:text-[1.3rem]';

          return (
            <Tag key={key} className={className}>
              {renderInline(block.text ?? '')}
            </Tag>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p
              key={key}
              className="max-w-[72ch] text-[1.02rem] leading-8 text-[color:var(--help-ink)] sm:text-[1.06rem] sm:leading-9"
            >
              {renderInline(block.text ?? '')}
            </p>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={key}
              className="max-w-[72ch] rounded-[24px] border border-[rgba(20,31,71,0.12)] bg-[rgba(48,127,226,0.06)] px-5 py-4 text-base leading-8 text-[color:var(--help-ink)]"
            >
              {block.lines?.map((line, lineIndex) => (
                <p key={`${key}-${lineIndex}`}>{renderInline(line)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'code') {
          return (
            <pre
              key={key}
              className="max-w-full overflow-x-auto rounded-[24px] bg-[color:var(--help-code-surface)] px-5 py-4 text-sm leading-7 text-[color:var(--help-code-ink)]"
            >
              <code>{block.lines?.join('\n') ?? ''}</code>
            </pre>
          );
        }

        if (block.type === 'list') {
          return (
            <ul
              key={key}
              className="grid max-w-[72ch] gap-3 pl-6 text-[1.02rem] leading-8 text-[color:var(--help-ink)]"
            >
              {block.items?.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="list-disc">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        return null;
      })}
    </div>
  );
}
