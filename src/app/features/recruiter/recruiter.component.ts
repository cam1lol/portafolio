import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProjectsService } from '../../core/data/projects.service';
import { ExperienceService } from '../../core/data/experience.service';
import { CollectionsService } from '../../core/data/collections.service';
import { homeProjects } from '../../core/data/project-details';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { AvailabilityComponent } from '../../shared/availability/availability.component';
import { CvButtonComponent } from '../../shared/cv-button/cv-button.component';
import { IconComponent } from '../../shared/icons/icon.component';

/**
 * Modo reclutador (/reclutador, también /?modo=reclutador y Ctrl+K): lo esencial en una pantalla, hecho
 * solo con contenido que ya existe (textos del sitio, disponibilidad, CV, proyectos, experiencia,
 * ticker). Se imprime limpio en una página.
 */
@Component({
  selector: 'app-recruiter',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, SiteTextPipe, AvailabilityComponent, CvButtonComponent, IconComponent],
  templateUrl: './recruiter.component.html',
  styleUrl: './recruiter.component.css',
})
export class RecruiterComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly en = computed(() => this.lang() === 'en');

  private readonly projects = toSignal(inject(ProjectsService).getPublished(), { initialValue: [] });
  protected readonly featured = computed(() => homeProjects(this.projects()).slice(0, 3));
  protected readonly experience = toSignal(inject(ExperienceService).getPublished(), { initialValue: [] });
  private readonly ticker = toSignal(inject(CollectionsService).getPublished('ticker_items'), { initialValue: null });
  protected readonly stack = computed(() => (this.ticker() ?? []).map((row) => String(row['label'] ?? '').trim()).filter(Boolean));

  constructor() {
    const title = inject(Title);
    const heading = toSignal(this.transloco.selectTranslate('rc_title'), { initialValue: '' });
    effect(() => title.setTitle(heading() ? `${heading()} · Camilo Ayala` : 'Camilo Ayala'));
  }

  protected loc(es: string, en: string): string {
    return (this.en() ? en || es : es).trim();
  }

  protected print(): void {
    window.print();
  }
}
