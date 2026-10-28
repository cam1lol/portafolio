import { Pipe, PipeTransform } from '@angular/core';

/**
 * Minimal admin-safe markup for `[innerHTML]`: the text is HTML-escaped first,
 * then `**bold**` -> <b>, `__muted__` -> <span class="muted">, a backtick span -> <code>, newline -> <br>.
 * The output still goes through Angular's default sanitizer (no bypass).
 */
export function renderInlineMarkup(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return escaped
    .replace(/`([^`\n]+?)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/gs, '<b>$1</b>')
    .replace(/__(.+?)__/gs, '<span class="muted">$1</span>')
    .replace(/\r?\n/g, '<br>');
}

@Pipe({ name: 'inlineMarkup', standalone: true })
export class InlineMarkupPipe implements PipeTransform {
  transform(text: string | null | undefined): string {
    return text ? renderInlineMarkup(text) : '';
  }
}
