import { Component, ElementRef, computed, effect, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';
import { ProjectsService } from '../../core/data/projects.service';
import { Project } from '../../core/data/project.model';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';
import { ProjectMediaComponent, hasProjectMedia } from '../../shared/media/project-media.component';
import { relatedProjects } from '../../core/data/project-details';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';
import { SwipeBackDirective } from '../../shared/gestures/swipe-back.directive';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { LineRevealDirective } from '../../shared/directives/line-reveal.directive';
import { ProjectVideosComponent } from './project-videos.component';

const SITE_NAME = 'Camilo Ayala';

/** /proyectos/:slug — shareable, indexable page with the full project and its case study. */
@Component({
  selector: 'app-project-page',
  standalone: true,
  imports: [LineRevealDirective, RouterLink, TranslocoPipe, InlineMarkupPipe, ProjectMediaComponent, ProjectVideosComponent, SwipeBackDirective, ScrambleDirective],
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.css', './project-page-details.component.css'],
})
export class ProjectPageComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly vt = inject(ProjectTransitionService);

  private readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('slug') ?? '')), { initialValue: '' });
  private readonly projects = toSignal(inject(ProjectsService).getPublished(), { initialValue: null });

  protected readonly loaded = computed(() => this.projects() !== null);
  private readonly index = computed(() => (this.projects() ?? []).findIndex((p) => p.slug === this.slug()));
  protected readonly project = computed<Project | null>(() => (this.projects() ?? [])[this.index()] ?? null);
  protected readonly previous = computed(() => (this.index() > 0 ? this.projects()![this.index() - 1] : null));
  protected readonly next = computed(() => {
    const list = this.projects() ?? [];
    return this.index() >= 0 && this.index() < list.length - 1 ? list[this.index() + 1] : null;
  });

  private readonly isEn = computed(() => this.transloco.activeLang() === 'en');
  protected readonly lang = computed<'es' | 'en'>(() => (this.isEn() ? 'en' : 'es'));

  protected readonly related = computed(() => {
    const project = this.project();
    return project ? relatedProjects(project, this.projects() ?? []) : [];
  });

  /** Selected screen in the tour; back to the first one when the project changes. */
  protected readonly screenIndex = linkedSignal(() => (this.project(), 0));
  protected readonly screen = computed(() => this.project()?.screens[this.screenIndex()] ?? null);

  /** Gallery lightbox (native <dialog>: focus trap and Esc for free). */
  private readonly lightbox = viewChild<ElementRef<HTMLDialogElement>>('lightbox');
  protected readonly photoIndex = signal(0);
  protected readonly photo = computed(() => this.project()?.gallery[this.photoIndex()] ?? null);

  constructor() {
    // Going back, the list card of this project carries the shared names, so the page shrinks into it.
    effect(() => {
      const slug = this.slug();
      if (slug) this.vt.activeSlug.set(slug);
    });

    // Title and description per language, for sharing and search engines.
    effect(() => {
      const project = this.project();
      if (!project) {
        if (this.loaded()) this.title.setTitle(SITE_NAME);
        return;
      }
      this.title.setTitle(`${project.name} · ${SITE_NAME}`);
      this.meta.updateTag({ name: 'description', content: this.summary(project) });
    });
  }

  /** Localized text: the English value when browsing in English, falling back to Spanish. */
  /** Problem / process / result steps that have text in the current language (ES fallback). */
  protected storySteps(p: Project): { key: string; label: string; text: string }[] {
    const s = p.story;
    return [
      { key: 'challenge', label: 'pp_story_challenge', text: this.loc(s.challengeEs, s.challengeEn) },
      { key: 'approach', label: 'pp_story_approach', text: this.loc(s.approachEs, s.approachEn) },
      { key: 'outcome', label: 'pp_story_outcome', text: this.loc(s.outcomeEs, s.outcomeEn) },
    ].filter((step) => step.text);
  }

  protected hasStory(p: Project): boolean {
    return this.storySteps(p).length > 0;
  }

  protected loc(es: string, en: string): string {
    return (this.isEn() ? en || es : es).trim();
  }

  protected hasFacts(project: Project): boolean {
    return Object.values(project.facts).some((value) => value.trim());
  }

  protected openPhoto(index: number): void {
    this.photoIndex.set(index);
    this.lightbox()?.nativeElement.showModal();
  }

  protected closePhoto(): void {
    this.lightbox()?.nativeElement.close();
  }

  protected stepPhoto(delta: number): void {
    const count = this.project()?.gallery.length ?? 0;
    if (count) this.photoIndex.update((index) => (index + delta + count) % count);
  }

  protected onLightboxKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.stepPhoto(1);
    if (event.key === 'ArrowLeft') this.stepPhoto(-1);
  }

  protected hasMedia(project: Project): boolean {
    return hasProjectMedia(project);
  }

  protected summary(project: Project): string {
    return this.isEn() ? project.summaryEn || project.summaryEs : project.summaryEs;
  }

  protected longText(project: Project): string {
    return (this.isEn() ? project.longEn || project.longEs : project.longEs).trim();
  }

  protected highlights(project: Project): string[] {
    return this.isEn() && project.highlightsEn.length ? project.highlightsEn : project.highlightsEs;
  }

  protected caseStudy(project: Project): string {
    return (this.isEn() ? project.caseStudyEn || project.caseStudyEs : project.caseStudyEs).trim();
  }
}
