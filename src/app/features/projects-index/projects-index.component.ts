import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { IconComponent } from '../../shared/icons/icon.component';

const SITE_NAME = 'Camilo Ayala';

/** /proyectos — every published project with filters by type, status, technology and text. */
@Component({
  selector: 'app-projects-index',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, PreviewPlayDirective, UpperCasePipe, IconComponent],
  templateUrl: './projects-index.component.html',
  styleUrl: './projects-index.component.css',
})
export class ProjectsIndexComponent {
  private readonly transloco = inject(TranslocoService);
  /** Shared-element names for the open / back transition with the project page. */
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
  protected readonly hasFilters = computed(() => this.type() !== 'all' || this.status() !== 'all' || !!this.tech() || !!this.query().trim());

  protected readonly types: { value: NonNullable<ProjectFilters['type']>; key: string }[] = [
    { value: 'all', key: 'pi_all' },
    { value: 'web', key: 't_web' },
    { value: '3d', key: '3D' },
    { value: 'tool', key: 't_tool' },
  ];
  protected readonly statuses: Project['status'][] = ['live', 'wip', 'archive'];

  private readonly isEn = computed(() => this.transloco.activeLang() === 'en');

  // selectTranslate waits for the file and follows language changes.
  private readonly pageTitle = toSignal(this.transloco.selectTranslate<string>('pi_title'), { initialValue: '' });
  private readonly pageLead = toSignal(this.transloco.selectTranslate<string>('pi_lead'), { initialValue: '' });

  constructor() {
    effect(() => {
      if (!this.pageTitle()) return;
      this.title.setTitle(`${this.pageTitle()} · ${SITE_NAME}`);
      this.meta.updateTag({ name: 'description', content: this.pageLead() });
    });
  }

  protected loc(es: string, en: string): string {
    return this.isEn() ? en || es : es;
  }

  /** "2025 · Full-stack · Velamentum": the fact sheet in one line, skipping empty fields. */
  protected factsLine(project: Project): string {
    const facts = project.facts;
    return [facts.year, this.loc(facts.roleEs, facts.roleEn), facts.client].filter((value) => value.trim()).join(' · ');
  }

  protected reset(): void {
    this.type.set('all');
    this.status.set('all');
    this.tech.set('');
    this.query.set('');
  }
}
