import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ScrollFrameService } from '../../shared/perf/scroll-frame.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { ProjectsService } from '../../core/data/projects.service';
import { Project } from '../../core/data/project.model';
import { ModalService } from '../../core/modal/modal.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { ProjectCoverArtComponent } from '../../shared/media/project-cover-art.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { PreviewPlayDirective } from '../../shared/media/preview-play.directive';
import { RouterLink } from '@angular/router';
import { ProjectTransitionService, SharedPart } from '../../core/transitions/project-transition.service';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { homeProjects } from '../../core/data/project-details';

type ProjectFilter = 'all' | 'web' | '3d' | 'tool';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ProjectCoverArtComponent, TranslocoPipe, IconComponent, RevealDirective, SiteTextPipe, PreviewPlayDirective, RouterLink, TiltDirective, ScrambleDirective],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css', './projects-run.component.css'],
})
export class ProjectsComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly modalService = inject(ModalService);
  private readonly vt = inject(ProjectTransitionService);
  private readonly projectsService = inject(ProjectsService);

  /** undefined while loading (skeleton cards), then the list. */
  private readonly loadedProjects = toSignal(this.projectsService.getPublished());
  protected readonly loading = computed(() => this.loadedProjects() === undefined);
  private readonly allProjects = computed(() => this.loadedProjects() ?? []);
  /** Home shows the featured projects (all of them while none is marked); /proyectos lists everything. */
  private readonly projects = computed(() => homeProjects(this.allProjects()));
  protected readonly totalCount = computed(() => this.allProjects().length);

  protected readonly filter = signal<ProjectFilter>('all');

  protected readonly filtered = computed(() => {
    const current = this.filter();
    const all = this.projects();
    return current === 'all' ? all : all.filter((p) => p.type === current);
  });

  /** Reactive active language signal — descriptions update without a reload. */
  private readonly lang = this.transloco.activeLang;
  protected readonly isEs = computed(() => this.lang() === 'es');

  protected description(project: Project): string {
    return this.isEs() ? project.summaryEs : project.summaryEn;
  }

  protected openHintLabel(): string {
    return this.isEs() ? 'VER DETALLE +' : 'VIEW DETAIL +';
  }

  /** Mirrors the prototype's `stLabel()` (lines 658). */
  protected statusLabel(status: Project['status']): string {
    if (this.isEs()) {
      return status === 'live' ? 'EN VIVO' : status === 'wip' ? 'EN CURSO' : 'ARCHIVO';
    }
    return status === 'live' ? 'LIVE' : status === 'wip' ? 'WIP' : 'ARCHIVE';
  }

  setFilter(value: ProjectFilter): void {
    this.filter.set(value);
  }

  /** The card title morphs into the modal title: open as a view transition (see ProjectTransitionService). */
  openProject(project: Project): void {
    this.vt.activeSlug.set(project.slug);
    this.vt.run(() => this.modalService.openProject(project));
  }

  private readonly run = viewChild.required<ElementRef<HTMLElement>>('run');
  private readonly pin = viewChild.required<ElementRef<HTMLElement>>('pin');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly runNo = viewChild.required<ElementRef<HTMLElement>>('runNo');
  private readonly runBar = viewChild.required<ElementRef<HTMLElement>>('runBar');

  constructor() {
    this.driveRun();
  }

  /**
   * A11: on wide screens with more than 3 projects the section pins and the cards slide sideways
   * while scrolling down (the run is as tall as the extra width). Measure first, then write; the
   * track only gets a transform, and nothing is written while the section is off screen.
   */
  private driveRun(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollFrames = inject(ScrollFrameService);
    const last = { on: false, height: -1, x: '', no: '01', bar: '' };
    effect(() => {
      this.filtered(); // new cards, new width
      scrollFrames.request();
    });
    scrollFrames.register(
      {
        read: (frame) => {
          const want = !reduce && frame.viewportWidth >= 1100 && this.filtered().length > 3;
          if (!want || !last.on) return { want, extra: 0, progress: 0, visible: true };
          const runRect = this.run().nativeElement.getBoundingClientRect();
          const extra = Math.max(0, this.track().nativeElement.scrollWidth - this.run().nativeElement.clientWidth);
          const pinTop = this.pin().nativeElement.getBoundingClientRect().top;
          const visible = runRect.bottom > 0 && runRect.top < frame.viewportHeight;
          const progress = extra ? Math.min(1, Math.max(0, (pinTop - runRect.top) / extra)) : 0;
          return { want, extra, progress, visible, pinHeight: this.pin().nativeElement.offsetHeight };
        },
        write: (m) => {
          const run = this.run().nativeElement;
          if (m.want !== last.on) {
            // Switching layout: the next frame measures the new width.
            last.on = m.want;
            run.classList.toggle('h-on', m.want);
            if (!m.want) {
              run.style.height = '';
              this.track().nativeElement.style.transform = '';
              last.height = -1;
              last.x = '';
            }
            scrollFrames.request();
            return;
          }
          if (!m.want || !m.visible || !('pinHeight' in m)) return;
          const height = Math.round((m.pinHeight ?? 0) + m.extra);
          if (height !== last.height) run.style.height = `${(last.height = height)}px`;
          const x = `translate3d(${-Math.round(m.progress * m.extra)}px, 0, 0)`;
          if (x !== last.x) this.track().nativeElement.style.transform = last.x = x;
          const bar = `scaleX(${m.progress.toFixed(3)})`;
          if (bar !== last.bar) this.runBar().nativeElement.style.transform = last.bar = bar;
          const count = this.filtered().length;
          const no = String(Math.min(count, 1 + Math.floor(m.progress * count))).padStart(2, '0');
          if (no !== last.no) this.runNo().nativeElement.textContent = last.no = no;
        },
      },
      inject(DestroyRef),
    );
  }

  /** Keyboard: tabbing to a card that is off to the side scrolls the page to where it shows. */
  protected revealFocused(event: FocusEvent): void {
    const run = this.run().nativeElement;
    if (!run.classList.contains('h-on')) return;
    const card = (event.target as HTMLElement).closest('.card');
    const cards = Array.from(this.track().nativeElement.querySelectorAll('.card'));
    const index = card ? cards.indexOf(card) : -1;
    if (index < 0) return;
    const extra = Math.max(0, this.track().nativeElement.scrollWidth - run.clientWidth);
    const progress = cards.length > 1 ? index / (cards.length - 1) : 0;
    // The pin sticks under the header once the run's top reaches it; from there each pixel scrolled is a pixel of travel.
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-h')) || 0;
    const runTop = run.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: runTop - header + progress * extra, behavior: 'auto' });
  }

  /** Shared names leave the card while the modal shows it (names must be unique on the page). */
  protected cardName(slug: string, part: SharedPart): string | null {
    return this.modalService.active() ? null : this.vt.name(slug, part);
  }
}
