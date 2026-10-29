import { Component, DestroyRef, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { ScrollFrameService } from '../../shared/perf/scroll-frame.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProjectsService } from '../../core/data/projects.service';
import { Project } from '../../core/data/project.model';
import { ProjectFilters, allTechnologies, filterProjects } from '../../core/data/project-details';
import { PreviewPlayDirective } from '../../shared/media/preview-play.directive';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { IconComponent } from '../../shared/icons/icon.component';
import { ProjectCoverArtComponent } from '../../shared/media/project-cover-art.component';

const SITE_NAME = 'Camilo Ayala';

/** /proyectos: todos los proyectos publicados, con filtros por tipo, estado, tecnología y texto. */
@Component({
  selector: 'app-projects-index',
  standalone: true,
  imports: [ProjectCoverArtComponent, RouterLink, TranslocoPipe, PreviewPlayDirective, UpperCasePipe, IconComponent, TiltDirective, ScrambleDirective],
  templateUrl: './projects-index.component.html',
  styleUrls: ['./projects-index.component.css', './projects-index-stack.component.css'],
})
export class ProjectsIndexComponent {
  private readonly transloco = inject(TranslocoService);
  /** Nombres compartidos para la transición de abrir / volver con la página del proyecto. */
  protected readonly vt = inject(ProjectTransitionService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly projects = toSignal(inject(ProjectsService).getPublished(), { initialValue: null });
  protected readonly loaded = computed(() => this.projects() !== null);

  protected readonly type = signal<NonNullable<ProjectFilters['type']>>('all');
  protected readonly status = signal<NonNullable<ProjectFilters['status']>>('all');
  protected readonly tech = signal('');
  protected readonly query = signal('');

  protected readonly technologies = computed(() => allTechnologies(this.projects() ?? []));
  protected readonly filtered = computed(() =>
    filterProjects(this.projects() ?? [], { type: this.type(), status: this.status(), tech: this.tech(), query: this.query() }),
  );
  /** Cuántos proyectos mostraría cada pestaña de tipo y cada estado, combinado con los demás filtros. */
  protected readonly typeCounts = computed(() => {
    const base = { status: this.status(), tech: this.tech(), query: this.query() };
    return Object.fromEntries(this.types.map((t) => [t.value, filterProjects(this.projects() ?? [], { ...base, type: t.value }).length]));
  });
  protected readonly statusCounts = computed(() => {
    const base = { type: this.type(), tech: this.tech(), query: this.query() };
    return Object.fromEntries(['all', ...this.statuses].map((st) => [st, filterProjects(this.projects() ?? [], { ...base, status: st as NonNullable<ProjectFilters['status']> }).length]));
  });

  protected readonly hasFilters = computed(() => this.type() !== 'all' || this.status() !== 'all' || !!this.tech() || !!this.query().trim());

  protected readonly types: { value: NonNullable<ProjectFilters['type']>; key: string }[] = [
    { value: 'all', key: 'pi_all' },
    { value: 'web', key: 't_web' },
    { value: '3d', key: '3D' },
    { value: 'tool', key: 't_tool' },
  ];
  protected readonly statuses: Project['status'][] = ['live', 'wip', 'archive'];

  private readonly isEn = computed(() => this.transloco.activeLang() === 'en');

  // selectTranslate espera al archivo y sigue los cambios de idioma.
  private readonly pageTitle = toSignal(this.transloco.selectTranslate<string>('pi_title'), { initialValue: '' });
  private readonly pageLead = toSignal(this.transloco.selectTranslate<string>('pi_lead'), { initialValue: '' });

  constructor() {
    effect(() => {
      if (!this.pageTitle()) return;
      this.title.setTitle(`${this.pageTitle()} · ${SITE_NAME}`);
      this.meta.updateTag({ name: 'description', content: this.pageLead() });
    });
    this.stackFrames();
  }

  /**
   * A12: mientras la siguiente fila tapa a una, esta se encoge un poco y se oscurece. Mide todas las filas
   * primero y luego escribe solo los valores que cambiaron. Desactivado en pantallas estrechas y con
   * movimiento reducido (ahí el CSS deja la lista simple).
   */
  private stackFrames(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const scrollFrames = inject(ScrollFrameService);
    const written = new WeakMap<HTMLElement, string>();
    effect(() => {
      this.filtered();
      scrollFrames.request();
    });
    scrollFrames.register(
      {
        read: (frame) => {
          const items = Array.from(host.querySelectorAll<HTMLElement>('.list.stacked > .item'));
          if (frame.viewportWidth < 861) return items.map((el) => ({ el, covered: 0 }));
          const rects = items.map((el) => el.getBoundingClientRect());
          return items.map((el, i) => {
            const next = rects[i + 1];
            if (!next) return { el, covered: 0 };
            // 0 mientras la siguiente fila está a una fila de distancia, 1 cuando ya está encima de esta.
            const gap = next.top - rects[i].top - 14;
            return { el, covered: Math.min(1, Math.max(0, 1 - gap / rects[i].height)) };
          });
        },
        write: (rows) => {
          for (const { el, covered } of rows) {
            const c = Math.round(covered * 100) / 100;
            const key = String(c);
            if (written.get(el) === key) continue;
            written.set(el, key);
            el.style.transform = c ? `scale(${(1 - c * 0.05).toFixed(3)})` : '';
            const shade = el.firstElementChild as HTMLElement | null;
            if (shade?.classList.contains('dim')) shade.style.opacity = c ? (c * 0.55).toFixed(2) : '';
          }
        },
      },
      inject(DestroyRef),
    );
  }

  protected loc(es: string, en: string): string {
    return this.isEn() ? en || es : es;
  }

  /** "2025 · Full-stack · Velamentum": la ficha en una línea, sin los campos vacíos. */
  protected factsLine(project: Project): string {
    const facts = project.facts;
    return [facts.year, this.loc(facts.roleEs, facts.roleEn), facts.client].filter((value) => value.trim()).join(' · ');
  }

  protected pad(n: number): string {
    return String(n ?? 0).padStart(2, '0');
  }

  protected reset(): void {
    this.type.set('all');
    this.status.set('all');
    this.tech.set('');
    this.query.set('');
  }
}
