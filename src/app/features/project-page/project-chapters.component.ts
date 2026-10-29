import { Component, computed, input, linkedSignal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProjectChapter } from '../../core/data/project-details';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';
import { LineRevealDirective } from '../../shared/directives/line-reveal.directive';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { Gallery3dComponent } from '../../shared/gallery-3d/gallery-3d.component';

/**
 * Capítulos del caso de estudio compuestos en el admin: texto, imagen, antes/después, cita, código y
 * modelo 3D, en el orden del admin. Cada tipo tiene su entrada (líneas, recorte, descifrado, líneas que
 * se escriben); las imágenes además se desplazan con el scroll si el navegador lo soporta. Si falta el
 * inglés se usa el español. El visor 3D solo carga cuando su capítulo se acerca.
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

  /** Posición del divisor (porcentaje) de cada capítulo antes/después, por índice; vuelve al centro si cambia la lista. */
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
