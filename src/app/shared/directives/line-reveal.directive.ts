import { Directive, ElementRef, OnDestroy, effect, inject, input, untracked } from '@angular/core';

const STAGGER_MS = 90;

/**
 * Muestra un párrafo línea a línea al entrar en pantalla: envuelve las palabras, las agrupa por la
 * línea en la que caen de verdad (sigue el ancho real) y cada línea sube con un pequeño retraso.
 * Conserva el marcado en línea (negritas, spans atenuados). `appLineReveal` recibe el contenido solo
 * para saber cuándo cambia: tras la primera aparición, el contenido nuevo (cambio de idioma) se ve
 * sin repetir la animación. Se salta con movimiento reducido.
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
        // Espera a que Angular escriba el contenido nuevo en el elemento.
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
    // Agrupa por línea pintada (offsetTop) y escalona por línea.
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

  /** Envuelve cada palabra de cada nodo de texto en un span, conservando los elementos que la rodean. */
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
