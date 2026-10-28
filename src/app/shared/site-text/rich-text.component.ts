import { Component, booleanAttribute, computed, input } from '@angular/core';
import { InlineMarkupPipe } from './inline-markup.pipe';
import { RevealDirective } from '../directives/reveal.directive';
import { LineRevealDirective } from '../directives/line-reveal.directive';

export type RichBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'cards'; cards: { title: string; text: string }[] };

/**
 * Long texts from the admin with structure instead of a wall of paragraphs:
 * - blank line between paragraphs; the first one can be a larger lead;
 * - lines starting with "- " become a checklist;
 * - paragraphs starting with a bold title ("**Reactividad:** Angular Signals...") become feature
 *   cards, consecutive ones grouped in a grid;
 * - inside any text, **bold** and `code` (InlineMarkupPipe).
 */
export function parseRichText(source: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  const paragraphs = source.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  for (const paragraph of paragraphs) {
    const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length && lines.every((line) => /^[-•]\s+/.test(line))) {
      blocks.push({ kind: 'list', items: lines.map((line) => line.replace(/^[-•]\s+/, '')) });
      continue;
    }
    const card = /^\*\*([^*\n]{1,60}?):?\*\*:?\s*([\s\S]*)$/.exec(paragraph);
    if (card && card[2].trim()) {
      const last = blocks.at(-1);
      const entry = { title: card[1].trim(), text: card[2].trim() };
      if (last?.kind === 'cards') last.cards.push(entry);
      else blocks.push({ kind: 'cards', cards: [entry] });
      continue;
    }
    blocks.push({ kind: 'p', text: paragraph });
  }
  return blocks;
}

@Component({
  selector: 'app-rich-text',
  standalone: true,
  imports: [InlineMarkupPipe, RevealDirective, LineRevealDirective],
  template: `
    @for (block of blocks(); track $index; let first = $first) {
      @switch (block.kind) {
        @case ('p') {
          <p [class.lead]="lead() && first" [appLineReveal]="block.text" [innerHTML]="block.text | inlineMarkup"></p>
        }
        @case ('list') {
          <ul class="checks reveal" appReveal>
            @for (item of block.items; track $index) { <li [innerHTML]="item | inlineMarkup"></li> }
          </ul>
        }
        @case ('cards') {
          <div class="cards">
            @for (card of block.cards; track $index; let i = $index) {
              <article class="card reveal" appReveal [style.transition-delay.ms]="(i % 3) * 80">
                <span class="card-no mono">{{ (i + 1).toString().padStart(2, '0') }}</span>
                <h3>{{ card.title }}</h3>
                <p [innerHTML]="card.text | inlineMarkup"></p>
              </article>
            }
          </div>
        }
      }
    }
  `,
  styles: `
    :host { display: grid; gap: 22px; color: var(--bone-dim); font-size: 16px; line-height: 1.75; }
    p { margin: 0; max-width: 72ch; }
    .lead { color: var(--bone); font-size: clamp(19px, 1.6vw, 23px); line-height: 1.55; }
    :host ::ng-deep b { color: var(--bone); font-weight: 600; }
    :host ::ng-deep code { padding: 1px 6px; border: 1px solid var(--line); border-radius: 3px; background: var(--ink); color: var(--ember); font: .86em 'Space Mono', monospace; white-space: nowrap; }
    .checks { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .checks li { position: relative; padding-left: 26px; }
    .checks li::before { content: ''; position: absolute; top: .55em; left: 2px; width: 10px; height: 6px; border-left: 2px solid var(--ember); border-bottom: 2px solid var(--ember); transform: rotate(-45deg); }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 12px; }
    .card { position: relative; padding: 20px 20px 18px; border: 1px solid var(--line); border-radius: var(--r); background: var(--graphite); transition: border-color .25s; }
    .card::before { content: ''; position: absolute; top: -1px; left: 18px; width: 28px; height: 2px; background: var(--ember); }
    .card:hover { border-color: var(--steel); }
    .card-no { color: var(--ember); font-size: 10px; letter-spacing: .12em; }
    .card h3 { margin: 8px 0 8px; color: var(--bone); font: 800 17px/1.25 'Archivo', sans-serif; letter-spacing: -.01em; }
    .card p { font-size: 14px; line-height: 1.6; }
  `,
})
export class RichTextComponent {
  readonly text = input('');
  /** The first paragraph larger (entry of a section). */
  readonly lead = input(false, { transform: booleanAttribute });
  protected readonly blocks = computed(() => parseRichText(this.text()));
}
