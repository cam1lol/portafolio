import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'night' | 'day';

const STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.resolveInitial());

  constructor() {
    effect(() => {
      const value = this.theme();
      document.documentElement.setAttribute('data-theme', value);
      localStorage.setItem(STORAGE_KEY, value);
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'night' ? 'day' : 'night');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
  }

  private resolveInitial(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'night' || stored === 'day') {
      return stored;
    }
    return matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';
  }
}
