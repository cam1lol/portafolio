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
        { threshold: 0.15 },
      );
    }
    return this.observer;
  }
}
