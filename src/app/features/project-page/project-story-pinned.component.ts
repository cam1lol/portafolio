import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, signal, viewChildren } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RichTextComponent } from '../../shared/site-text/rich-text.component';
import { ProjectCoverArtComponent } from '../../shared/media/project-cover-art.component';

export interface PinnedStep {
  key: string;
  label: string;
  text: string;
}

/**
 * Historia contada con scroll (A6): una pantalla enmarcada queda fija mientras pasan los pasos problema /
 * proceso / resultado, y muestra la imagen del paso que está en el centro de la pantalla. Un solo
 * IntersectionObserver y solo fundidos de opacidad. Solo en pantallas anchas; en las estrechas la página
 * mantiene la línea de tiempo.
 */
@Component({
  selector: 'app-project-story-pinned',
  standalone: true,
  imports: [TranslocoPipe, RichTextComponent, ProjectCoverArtComponent],
  template: `
    <div class="pin">
      <div class="frame">
        <span class="tick tl" aria-hidden="true"></span><span class="tick br" aria-hidden="true"></span>
        <div class="screen">
          @for (image of images(); track $index; let i = $index) {
            <img [src]="image" alt="" loading="lazy" [class.on]="i === active() % images().length" />
          } @empty {
            <app-project-cover-art [icon]="icon()" [name]="name()" />
          }
          <span class="big" aria-hidden="true">{{ pad(active() + 1) }}</span>
        </div>
      </div>
      <p class="state mono" aria-hidden="true">
        <b>{{ pad(active() + 1) }}</b> / {{ pad(steps().length) }} · {{ steps()[active()]?.label ?? '' | transloco }}
      </p>
    </div>
    <ol class="steps">
      @for (step of steps(); track step.key; let i = $index) {
        <li #step class="step" [class.on]="i === active()" [attr.data-i]="i">
          <span class="n" aria-hidden="true">{{ pad(i + 1) }}</span>
          <h3 class="mono">{{ step.label | transloco }}</h3>
          <app-rich-text [text]="step.text" />
        </li>
      }
    </ol>
  `,
  styleUrl: './project-story-pinned.component.css',
})
export class ProjectStoryPinnedComponent {
  readonly steps = input.required<PinnedStep[]>();
  /** Una imagen por paso si hay suficientes; si no, se repiten. */
  readonly images = input<string[]>([]);
  readonly icon = input('');
  readonly name = input('');

  protected readonly active = signal(0);
  private readonly stepEls = viewChildren<ElementRef<HTMLElement>>('step');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) this.active.set(Number((entry.target as HTMLElement).dataset['i']));
          }
        },
        { rootMargin: '-45% 0px -45% 0px' },
      );
      this.stepEls().forEach((el) => observer.observe(el.nativeElement));
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
