import { Component, computed, input, linkedSignal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProjectChapter } from '../../core/data/project-details';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';
import { LineRevealDirective } from '../../shared/directives/line-reveal.directive';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { Gallery3dComponent } from '../../shared/gallery-3d/gallery-3d.component';

/**
 * Case study chapters composed in the admin: text, image, before/after, quote, code and 3D model,
 * in the admin's order. Each type has its own entrance (line reveal, clip, scramble, typed lines);
 * images also drift with the scroll where the browser supports scroll-driven animations. Missing
 * English falls back to Spanish. The 3D viewer only loads when its chapter scrolls near.
 */
@Component({
  selector: 'app-project-chapters',
  standalone: true,
  imports: [TranslocoPipe, InlineMarkupPipe, LineRevealDirective, RevealDirective, ScrambleDirective, Gallery3dComponent],
  templateUrl: './project-chapters.component.html',
  styleUrl: './project-chapters.component.css',
})
export class ProjectChaptersComponent {
  readonly chapters = input.required<ProjectChapter[]>();
  readonly lang = input<'es' | 'en'>('es');

  protected readonly total = computed(() => this.chapters().length);

  /** Divider position (percent) of each before/after chapter, by index; centred again when the list changes. */
  protected readonly split = linkedSignal<ProjectChapter[], Record<number, number>>({ source: this.chapters, computation: () => ({}) });

  protected loc(es: string, en: string): string {
    return this.lang() === 'en' && en.trim() ? en : es;
  }

  protected pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  protected codeLines(code: string): string[] {
    return code.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  }

  protected splitAt(index: number): number {
    return this.split()[index] ?? 50;
  }

  protected setSplit(index: number, value: string): void {
    this.split.update((all) => ({ ...all, [index]: Number(value) }));
  }
}
