import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RevealObserverService {
  private observer?: IntersectionObserver;
  private readonly callbacks = new Map<Element, () => void>();

  observe(target: Element, onReveal: () => void): void {
    this.callbacks.set(target, onReveal);
    this.ensureObserver().observe(target);
  }

  unobserve(target: Element): void {
    this.observer?.unobserve(target);
    this.callbacks.delete(target);
  }

  private ensureObserver(): IntersectionObserver {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const callback = this.callbacks.get(entry.target);
              callback?.();
              this.observer?.unobserve(entry.target);
              this.callbacks.delete(entry.target);
            }
          }
        },
        // Aparece cuando su borde entra en el 90 % inferior de la pantalla. Con un umbral de proporción
        // (antes 0.15), un elemento más alto que unas 6 pantallas nunca llegaba a él y no aparecía.
        { threshold: 0, rootMargin: '0px 0px -10% 0px' },
      );
    }
    return this.observer;
  }
}
