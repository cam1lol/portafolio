import { Component, DestroyRef, ElementRef, computed, effect, inject, input, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';
import { ProjectsService } from '../../core/data/projects.service';
import { ProjectViewsService } from '../../core/data/project-views.service';
import { ScrollFrameService } from '../../shared/perf/scroll-frame.service';
import { Project } from '../../core/data/project.model';
import { ProjectMediaComponent, hasProjectMedia, hasProjectVisual } from '../../shared/media/project-media.component';
import { effectiveSectionOrder, relatedProjects } from '../../core/data/project-details';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';
import { SwipeBackDirective } from '../../shared/gestures/swipe-back.directive';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { ProjectVideosComponent } from './project-videos.component';
import { ProjectChaptersComponent } from './project-chapters.component';
import { NgTemplateOutlet } from '@angular/common';
import { RichTextComponent } from '../../shared/site-text/rich-text.component';
import { ProjectCoverArtComponent } from '../../shared/media/project-cover-art.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ProjectStoryPinnedComponent } from './project-story-pinned.component';
import { ProjectDevicesComponent } from './project-devices.component';
import { ProjectHotspotsComponent } from './project-hotspots.component';
import { ScanRevealDirective } from '../../shared/directives/scan-reveal.directive';

const SITE_NAME = 'Camilo Ayala';

/** /proyectos/:slug — shareable, indexable page with the full project and its case study. */
@Component({
  selector: 'app-project-page',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, ProjectMediaComponent, ProjectVideosComponent, ProjectChaptersComponent, NgTemplateOutlet, RichTextComponent, ProjectCoverArtComponent, RevealDirective, SwipeBackDirective, ScrambleDirective, ProjectStoryPinnedComponent, ProjectDevicesComponent, ProjectHotspotsComponent, ScanRevealDirective],
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.css', './project-page-details.component.css', './project-page-dossier.component.css'],
})
export class ProjectPageComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly vt = inject(ProjectTransitionService);
  private readonly projectsService = inject(ProjectsService);
  private readonly views = inject(ProjectViewsService);
  private readonly scrollFrames = inject(ScrollFrameService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Admin live preview: the project being edited, rendered with the real page. In this mode the page
   * does not touch the document title, the transitions or the analytics.
   */
  readonly previewProject = input<Project | null>(null);
  /** Admin examples: render only this section (no hero, facts, index or pager), e.g. "s-results". */
  readonly focusSection = input<string | null>(null);

  protected show(id: string): boolean {
    const focus = this.focusSection();
    return !focus || focus === id;
  }

  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')), { initialValue: '' });
  /** Private draft link: /proyectos/<slug>?preview=<token>. */
  private readonly previewToken = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('preview') ?? '')), { initialValue: '' });
  private readonly projects = toSignal(this.projectsService.getPublished(), { initialValue: null });
  /** The draft fetched with the private token (undefined: not asked or still loading). */
  private readonly draft = signal<Project | null | undefined>(undefined);

  protected readonly index = computed(() => (this.projects() ?? []).findIndex((p) => p.slug === this.slug()));
  private readonly published = computed<Project | null>(() => (this.projects() ?? [])[this.index()] ?? null);
  protected readonly project = computed<Project | null>(() => this.previewProject() ?? this.published() ?? this.draft() ?? null);
  /** Shown through the private link while not published: a banner says so and search engines skip it. */
  protected readonly isDraft = computed(() => !this.previewProject() && !this.published() && !!this.draft());
  private readonly isAdminPreview = computed(() => !!this.previewProject());
  protected readonly loaded = computed(
    () => this.isAdminPreview() || (this.projects() !== null && (!this.previewToken() || this.published() !== null || this.draft() !== undefined)),
  );
  protected readonly previous = computed(() => (this.index() > 0 ? this.projects()![this.index() - 1] : null));
  protected readonly next = computed(() => {
    const list = this.projects() ?? [];
    return this.index() >= 0 && this.index() < list.length - 1 ? list[this.index() + 1] : null;
  });

  /** "02": position among the published projects (file number of the dossier). Empty for drafts and previews. */
  protected readonly fileNo = computed(() => (this.index() >= 0 && !this.previewProject() ? this.pad(this.index() + 1) : ''));
  protected readonly fileTotal = computed(() => this.pad((this.projects() ?? []).length));

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** The name in one line, or two (the second drawn in outline) when it has several words. */
  protected titleLines(project: Project): string[] {
    const words = project.name.trim().split(/\s+/);
    if (words.length < 2) return [project.name.trim()];
    const cut = Math.ceil(words.length / 2);
    return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
  }

  private readonly bigNo = viewChild<ElementRef<HTMLElement>>('bigNo');
  private readonly titleEl = viewChild<ElementRef<HTMLElement>>('title');
  private readonly band = viewChild<ElementRef<HTMLElement>>('band');
  private readonly bandTrack = viewChild<ElementRef<HTMLElement>>('bandTrack');

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
      if (slug && !this.isAdminPreview()) this.vt.activeSlug.set(slug);
    });

    // Private draft link: only asked when the slug is not among the published projects.
    effect(() => {
      const token = this.previewToken();
      const slug = this.slug();
      if (!token || !slug || this.projects() === null || this.published()) return;
      untracked(() => this.projectsService.getPreview(slug, token).subscribe((draft) => this.draft.set(draft)));
    });

    // Title and description per language, for sharing and search engines.
    effect(() => {
      if (this.isAdminPreview()) return;
      const project = this.project();
      if (!project) {
        if (this.loaded()) this.title.setTitle(SITE_NAME);
        return;
      }
      this.title.setTitle(`${project.name} · ${SITE_NAME}`);
      this.meta.updateTag({ name: 'description', content: this.summary(project) });
      if (this.isDraft()) this.meta.updateTag({ name: 'robots', content: 'noindex' });
      else this.meta.removeTag('name="robots"');
    });

    this.trackReading();
    this.spySections();
    this.driveHero();
  }

  /**
   * Scroll-driven hero: the giant number drifts down, the title lines move apart and the name band
   * slides sideways. Transforms only, written when they change and only while on screen (AGENTS 8.1).
   */
  private driveHero(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const last = { no: '', title: '', band: '' };
    this.scrollFrames.register(
      {
        read: (frame) => {
          const band = this.band()?.nativeElement;
          const track = this.bandTrack()?.nativeElement;
          const rect = band?.getBoundingClientRect();
          const bandOn = !!rect && rect.bottom > 0 && rect.top < frame.viewportHeight;
          return { bandOn, half: bandOn && track ? track.scrollWidth / 2 : 0 };
        },
        write: ({ bandOn, half }, frame) => {
          const y = frame.scrollY;
          const heroOn = y < frame.viewportHeight * 1.2;
          const no = this.bigNo()?.nativeElement;
          const noValue = `translate3d(0, ${Math.round(y * 0.25)}px, 0)`;
          if (no && heroOn && noValue !== last.no) no.style.transform = last.no = noValue;

          const title = this.titleEl()?.nativeElement;
          const progress = Math.min(1, y / (frame.viewportHeight * 0.8));
          const shift = Math.round(progress * Math.min(64, frame.viewportWidth * 0.06));
          const titleValue = String(shift);
          if (title && heroOn && title.children.length > 1 && titleValue !== last.title) {
            last.title = titleValue;
            (title.children[0] as HTMLElement).style.transform = `translate3d(${-shift}px, 0, 0)`;
            (title.children[1] as HTMLElement).style.transform = `translate3d(${shift}px, 0, 0)`;
          }

          const track = this.bandTrack()?.nativeElement;
          if (track && bandOn && half > 0) {
            const bandValue = `translate3d(${-Math.round((y * 0.35) % half)}px, 0, 0)`;
            if (bandValue !== last.band) track.style.transform = last.band = bandValue;
          }
        },
      },
      this.destroyRef,
    );
  }

  /**
   * Analytics (migration 0014): how far down the visitor read and for how long, sent once when they
   * leave the project (another project, another page or closing the tab). Reads the scroll through
   * the shared ScrollFrameService (measure only, no DOM writes). Not for drafts or the admin preview.
   */
  private trackReading(): void {
    let current: { slug: string; start: number; depth: number } | null = null;
    const flush = () => {
      if (!current) return;
      this.views.record({ slug: current.slug, lang: this.lang(), depth: current.depth, seconds: (performance.now() - current.start) / 1000 });
      current = null;
    };
    effect(() => {
      const project = this.project();
      const trackable = !!project && !this.isDraft() && !this.isAdminPreview();
      untracked(() => {
        if (current && current.slug !== project?.slug) flush();
        if (trackable && !current) current = { slug: project.slug, start: performance.now(), depth: 0 };
      });
    });
    this.scrollFrames.register(
      {
        read: (frame) => {
          const height = document.documentElement.scrollHeight;
          return height > 0 ? Math.min(100, ((frame.scrollY + frame.viewportHeight) / height) * 100) : 0;
        },
        write: (depth) => {
          if (current && depth > current.depth) current.depth = depth;
        },
      },
      this.destroyRef,
    );
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', onHide);
      flush();
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

  /** Images for the pinned story screen: the screens first, then the gallery, then the card image. */
  protected storyImages(p: Project): string[] {
    const images = [...p.screens.map((s) => s.image), ...p.gallery.map((g) => g.image), p.previewImage ?? ''].filter((src) => src.trim());
    return images.slice(0, 3);
  }

  /**
   * Degrees a result ring fills to: percentages ("-40 %", "94%") or plain numbers from 0 to 100.
   * Anything else (e.g. "3x", "1.2 s") has no ring and shows as a big number.
   */
  protected ringAngle(value: string): number | null {
    const match = value.trim().match(/^[-+]?\s*(\d+(?:[.,]\d+)?)\s*(%?)$/);
    if (!match) return null;
    const n = Number(match[1].replace(',', '.'));
    if (!match[2] && n > 100) return null;
    return Math.min(100, n) * 3.6;
  }

  /** Rotation of each half arc of the ring: the right half fills first, then the left one. */
  protected halfTurn(value: string, half: 0 | 1): number {
    const angle = this.ringAngle(value) ?? 0;
    return half === 0 ? Math.min(angle, 180) : Math.max(0, angle - 180);
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

  // ---- Sections and their index (left column)

  /** Sections this project has, in page order, for the index and the numbered headings. */
  protected readonly sections = computed(() => {
    const p = this.project();
    if (!p) return [];
    const list: { id: string; label: string; show: boolean }[] = [
      { id: 's-demo', label: 'pp_demo', show: !!p.demoVideoUrl && hasProjectVisual(p) },
      { id: 's-story', label: 'pp_story', show: this.hasStory(p) },
      { id: 's-results', label: 'pp_results', show: p.results.length > 0 },
      { id: 's-devices', label: this.devicesLabel(p), show: this.hasDevices(p) },
      { id: 's-hotspots', label: 'pp_hotspots', show: this.hasHotspots(p) },
      { id: 's-overview', label: 'pp_overview', show: this.hasOverview(p) },
      { id: 's-how', label: 'pp_how', show: !!this.caseStudy(p) },
      { id: 's-chapters', label: 'pp_chapters_title', show: p.chapters.length > 0 },
      { id: 's-videos', label: 'pp_videos', show: p.videos.length > 0 },
      { id: 's-screens', label: 'pp_screens', show: p.screens.length > 0 },
      { id: 's-gallery', label: 'pp_gallery', show: p.gallery.length > 0 },
      { id: 's-extras', label: 'pp_extras', show: p.improvements.length + p.docs.length + p.versions.length > 0 },
      { id: 's-related', label: 'pp_related', show: this.related().length > 0 },
    ];
    const order = this.sectionOrder();
    return list.filter((section) => section.show).sort((a, b) => this.rank(a.id, order) - this.rank(b.id, order));
  });

  /** Order chosen in the admin ("Organizar la página"), completed with the default one. */
  private readonly sectionOrder = computed(() => effectiveSectionOrder(this.project()?.sectionOrder ?? []));

  private rank(id: string, order: string[]): number {
    const index = order.indexOf(id);
    return index < 0 ? 100 : index; // related (not movable) stays at the end
  }

  /** CSS order of a section in the column (the markup keeps a fixed order). */
  protected orderOf(id: string): number {
    return this.rank(id, this.sectionOrder());
  }

  /** Section crossing the upper third of the screen (scroll spy through the shared ScrollFrameService). */
  protected readonly activeSection = signal('');

  protected num(id: string): string {
    return String(this.sections().findIndex((section) => section.id === id) + 1).padStart(2, '0');
  }

  protected jump(event: Event, id: string): void {
    event.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  private spySections(): void {
    this.scrollFrames.register(
      {
        read: (frame) => {
          let current = '';
          for (const section of this.sections()) {
            const el = document.getElementById(section.id);
            if (el && el.getBoundingClientRect().top <= frame.viewportHeight * 0.35) current = section.id;
          }
          return current;
        },
        write: (current) => {
          if (current !== this.activeSection()) this.activeSection.set(current);
        },
      },
      this.destroyRef,
    );
  }

  /** Shown when the project has a mobile version (clip or captures); the desktop capture is optional. */
  protected hasDevices(project: Project): boolean {
    return !!project.mobileVideo.trim() || project.mobileImages.length > 0;
  }

  /** "Escritorio y móvil" with both versions, "Versión móvil" with the phone alone. */
  protected devicesLabel(project: Project): string {
    return project.previewImage?.trim() ? 'pp_devices' : 'pp_mobile_version';
  }

  /** Points of interest are placed on the card image. */
  protected hasHotspots(project: Project): boolean {
    return !!project.previewImage?.trim() && project.hotspots.length > 0;
  }

  protected hasOverview(project: Project): boolean {
    return !!this.longText(project) || this.highlights(project).length > 0 || project.stack.length > 0;
  }

  /** The fact sheet as label/value pairs (only the filled ones). */
  protected factItems(project: Project): { label: string; value: string }[] {
    const f = project.facts;
    return [
      { label: 'pp_year', value: f.year },
      { label: 'pp_role', value: this.loc(f.roleEs, f.roleEn) },
      { label: 'pp_duration', value: this.loc(f.durationEs, f.durationEn) },
      { label: 'pp_client', value: f.client },
      { label: 'pp_team', value: this.teamText(f.team) },
    ].filter((item) => item.value?.trim());
  }

  /** Team stored as a number by the admin picker: "Solo yo" / "4 personas" in the visitor's language. */
  protected teamText(team: string): string {
    const value = (team ?? '').trim();
    if (!/^\d+$/.test(value)) return value;
    const n = Number(value);
    return n === 1 ? this.transloco.translate('pp_team_solo') : this.transloco.translate('pp_team_n', { n });
  }

  /** Address shown in the browser frame of the hero: the live site, else this page. */
  protected displayUrl(project: Project): string {
    return (project.liveUrl || `${location.host}/proyectos/${project.slug}`).replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  protected hasMedia(project: Project): boolean {
    return hasProjectMedia(project);
  }

  protected hasVisual(project: Project): boolean {
    return hasProjectVisual(project);
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
