import { Pipe, PipeTransform } from '@angular/core';

/**
 * Marcado mínimo y seguro para `[innerHTML]`: primero se escapa el HTML del texto y luego
 * `**negrita**` -> <b>, `__atenuado__` -> <span class="muted">, texto entre comillas invertidas -> <code>,
 * salto de línea -> <br>. El resultado sigue pasando por el saneado por defecto de Angular (sin bypass).
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
