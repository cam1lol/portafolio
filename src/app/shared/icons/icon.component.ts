import { Component, Input, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICON_PATHS } from './icon-paths';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    [innerHTML]="path()"
  ></svg>`,

  styles: [':host { display: inline-flex; } svg { width: 100%; height: 100%; }'],
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  private readonly nameSignal = signal<string>('');

  @Input({ required: true })
  set name(value: string) {
    this.nameSignal.set(value);
  }
  get name(): string {
    return this.nameSignal();
  }

  protected readonly path = computed<SafeHtml>(() => {
    const markup = ICON_PATHS[this.nameSignal()] ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  });
}
