import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProjectsService } from '../../core/data/projects.service';
import { Project } from '../../core/data/project.model';
import { ModalService } from '../../core/modal/modal.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

type ProjectFilter = 'all' | 'web' | '3d' | 'tool';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [TranslocoPipe, IconComponent, RevealDirective],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly modalService = inject(ModalService);
  private readonly projectsService = inject(ProjectsService);

  private readonly projects = toSignal(this.projectsService.getPublished(), { initialValue: [] });

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

  openProject(project: Project): void {
    this.modalService.openProject(project);
  }
}
