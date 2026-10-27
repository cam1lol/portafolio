import { Directive, ElementRef, OnDestroy, effect, inject, input, untracked } from '@angular/core';

const STAGGER_MS = 90;

/**
 * Reveals a paragraph line by line when it scrolls into view: words are wrapped, grouped by the line
 * they actually fall on (so it follows the real width), and each line rises with a small delay.
 * Inline markup (bold, muted spans) is kept. `appLineReveal` takes the rendered content (text or
 * HTML) only to know when it changes: after the first reveal, new content (language switch) shows
 * without replaying. Skipped with reduced motion.
 */
@Directive({ selector: '[appLineReveal]', standalone: true })
export class LineRevealDirective implements OnDestroy {
  readonly content = input<string>('', { alias: 'appLineReveal' });

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private observer: IntersectionObserver | null = null;
  private revealed = false;

  constructor() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) this.el.classList.add('lr-pending');

    effect(() => {
      this.content();
      untracked(() => {
        if (reduce) return;
        // Wait for Angular to write the new content into the element.
        queueMicrotask(() => (this.revealed ? this.el.classList.remove('lr-pending') : this.watch()));
      });
    });
  }

  private watch(): void {
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        this.observer?.disconnect();
        this.play();
      },
      { threshold: 0.25 },
    );
    this.observer.observe(this.el);
  }

  private play(): void {
    this.revealed = true;
    const words = this.wrapWords();
    // Group by rendered line (offsetTop), then stagger per line.
    let line = -1;
    let lastTop = Number.NEGATIVE_INFINITY;
    for (const word of words) {
      if (word.offsetTop > lastTop + 2) {
        line++;
        lastTop = word.offsetTop;
      }
      word.style.animationDelay = `${line * STAGGER_MS}ms`;
    }
    this.el.classList.remove('lr-pending');
    this.el.classList.add('lr-play');
  }

  /** Wraps every word of every text node in a span, keeping the surrounding elements. */
  private wrapWords(): HTMLElement[] {
    const words: HTMLElement[] = [];
    const walker = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    for (const text of texts) {
      const parts = (text.textContent ?? '').split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'lr-w';
          span.textContent = part;
          fragment.appendChild(span);
          words.push(span);
        }
      }
      text.replaceWith(fragment);
    }
    return words;
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
