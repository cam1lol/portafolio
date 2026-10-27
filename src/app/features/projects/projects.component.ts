import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { ProjectsService } from '../../core/data/projects.service';
import { Project } from '../../core/data/project.model';
import { ModalService } from '../../core/modal/modal.service';
import { IconComponent } from '../../shared/icons/icon.component';
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
  imports: [TranslocoPipe, IconComponent, RevealDirective, SiteTextPipe, PreviewPlayDirective, RouterLink, TiltDirective, ScrambleDirective],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly modalService = inject(ModalService);
  private readonly vt = inject(ProjectTransitionService);
  private readonly projectsService = inject(ProjectsService);

  private readonly allProjects = toSignal(this.projectsService.getPublished(), { initialValue: [] });
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

  /** Shared names leave the card while the modal shows it (names must be unique on the page). */
  protected cardName(slug: string, part: SharedPart): string | null {
    return this.modalService.active() ? null : this.vt.name(slug, part);
  }
}
