import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InlineMarkupPipe } from '../site-text/inline-markup.pipe';
import { ProjectMediaComponent, hasProjectMedia } from '../media/project-media.component';
import { TranslocoService } from '@jsverse/transloco';
import { ModalService } from '../../core/modal/modal.service';
import { Project } from '../../core/data/project.model';
import { Experience } from '../../core/data/experience.model';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [RouterLink, InlineMarkupPipe, ProjectMediaComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  protected readonly modalService = inject(ModalService);
  private readonly transloco = inject(TranslocoService);

  protected readonly active = this.modalService.active;
  protected readonly lang = this.transloco.activeLang;

  protected readonly isEs = computed(() => this.lang() === 'es');

  protected readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly tab = signal<'summary' | 'how'>('summary');

  constructor() {
    // Every time a different item opens, start on the summary tab.
    effect(() => {
      this.active();
      this.tab.set('summary');
    });
  }

  protected hasMedia(project: Project): boolean {
    return hasProjectMedia(project);
  }

  protected caseStudy(project: Project): string {
    const text = this.isEs() ? project.caseStudyEs : project.caseStudyEn || project.caseStudyEs;
    return (text ?? '').trim();
  }

  protected summaryTabLabel(): string {
    return this.isEs() ? 'RESUMEN' : 'OVERVIEW';
  }

  protected howTabLabel(): string {
    return this.isEs() ? 'CÓMO ESTÁ HECHO' : 'HOW IT IS BUILT';
  }

  protected projectPageLabel(): string {
    return this.isEs() ? 'VER PÁGINA DEL PROYECTO' : 'OPEN PROJECT PAGE';
  }

  protected readonly tag = computed(() => {
    const state = this.active();
    if (!state) {
      return '';
    }
    if (state.kind === 'project') {
      return `PROJECT // ${state.data.typeLabel}`;
    }
    return `EXPERIENCE // ${this.period(state.data)}`;
  });

  close(): void {
    this.modalService.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.active()) {
      this.close();
    }
  }

  protected statusLabel(status: Project['status']): string {
    if (this.isEs()) {
      return status === 'live' ? 'EN VIVO' : status === 'wip' ? 'EN CURSO' : 'ARCHIVO';
    }
    return status === 'live' ? 'LIVE' : status === 'wip' ? 'WIP' : 'ARCHIVE';
  }

  protected summary(project: Project): string {
    return this.isEs() ? project.longEs : project.longEn;
  }

  protected highlights(project: Project): string[] {
    return this.isEs() ? project.highlightsEs : project.highlightsEn;
  }

  protected period(experience: Experience): string {
    return this.isEs() ? experience.periodEs : experience.periodEn;
  }

  protected role(experience: Experience): string {
    return this.isEs() ? experience.roleEs : experience.roleEn;
  }

  protected experienceSummary(experience: Experience): string {
    return this.isEs() ? experience.summaryEs : experience.summaryEn;
  }

  protected points(experience: Experience): string[] {
    return this.isEs() ? experience.pointsEs : experience.pointsEn;
  }

  protected subprojectDesc(subproject: { descEs: string; descEn: string }): string {
    return this.isEs() ? subproject.descEs : subproject.descEn;
  }

  protected highlightsLabel(): string {
    return this.isEs() ? 'DESTACADOS' : 'HIGHLIGHTS';
  }

  protected achievementsLabel(): string {
    return this.isEs() ? 'RESPONSABILIDADES & LOGROS' : 'RESPONSIBILITIES & ACHIEVEMENTS';
  }

  protected subprojectsLabel(): string {
    return this.isEs() ? 'PROYECTOS CONSTRUIDOS' : 'PROJECTS BUILT';
  }
}
