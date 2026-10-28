import { Component, DestroyRef, ElementRef, HostListener, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { MediaPickerComponent, MediaUpload } from '../../../shared/media-picker/media-picker.component';
import { isValidSlug, slugify } from '../../../shared/media/project-media';
import { HasUnsavedChanges } from '../shared/unsaved-changes.guard';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { AdminProject, ProjectInput, ProjectsService } from '../../../core/data/projects.service';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { HotspotEditorComponent } from './hotspot-editor.component';
import { MAX_HOTSPOTS, MAX_MOBILE_IMAGES } from '../../../core/data/project-details';
import { FormStep, FormStepsComponent } from '../shared/form-steps.component';
import { FieldHintComponent } from '../shared/field-hint.component';
import { TagInputComponent } from '../shared/tag-input.component';
import { focusFirstInvalid } from '../shared/focus-first-invalid';
import { RepeatHeadComponent } from '../shared/repeat-head.component';
import { IconPickerComponent } from '../shared/icon-picker.component';
import {
  MAX_ITEMS, detailControls, docGroup, improvementGroup, moveItem, patchDetails, photoGroup, readDetails,
  resultGroup, screenGroup, versionGroup, videoGroup, fillToCount, chapterGroup, ChapterGroup, itemErrorMessage,
} from './project-details.form';
import { CHAPTER_TYPES, ChapterType, IMPROVEMENT_STATUSES, MEDIA_FOCUS_POINTS } from '../../../core/data/project-details';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { ModelUploadComponent } from '../../../shared/model-upload/model-upload.component';
import { ProjectCardPreviewComponent } from './project-card-preview.component';
import { FormSuggestionsService } from '../shared/form-suggestions.service';
import { TranslatorService, containsControl, translationPairs } from '../shared/translator.service';
import { AutoTranslateDirective } from '../shared/auto-translate.directive';
import { ComboboxComponent } from '../shared/combobox.component';
import { DurationPickerComponent } from '../shared/duration-picker.component';
import { TeamPickerComponent } from '../shared/team-picker.component';
import { rank } from '../shared/form-suggestions.service';
import { ProjectPageComponent } from '../../project-page/project-page.component';
import { BlockExampleComponent } from './block-example.component';
import { PageOrganizerComponent } from './page-organizer.component';
import { exampleChapter } from './block-examples';
import { ProjectChaptersComponent } from '../../project-page/project-chapters.component';
import { Project } from '../../../core/data/project.model';

/** Name and one-line purpose of each chapter type, shown in the type picker and the folded headers. */
const CHAPTER_INFO: Record<ChapterType, { label: string; desc: string }> = {
  text: { label: 'Texto', desc: 'Un título y párrafos: el relato del proyecto.' },
  image: { label: 'Imagen', desc: 'Una imagen grande, contenida o a todo el ancho.' },
  compare: { label: 'Antes / después', desc: 'Dos imágenes con un deslizador para comparar.' },
  quote: { label: 'Cita', desc: 'Una frase destacada de un cliente o usuario.' },
  code: { label: 'Código', desc: 'Un fragmento de código en una tarjeta de terminal.' },
  model: { label: 'Modelo 3D', desc: 'Un GLB de tu biblioteca que se puede girar.' },
};

/** Repeatable detail lists and the factory that builds a new empty item for each. */
const LIST_FACTORIES = {
  results: resultGroup,
  screens: screenGroup,
  gallery: photoGroup,
  improvements: improvementGroup,
  docs: docGroup,
  versions: versionGroup,
  videos: videoGroup,
};
type DetailList = keyof typeof LIST_FACTORIES;

const COMMON_LANGUAGES = ['ts', 'js', 'html', 'css', 'scss', 'json', 'python', 'java', 'sql', 'bash'];
const urlValidator = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(String(control.value).trim()) ? null : { url: true };

const PREFS_KEY = 'ca-project-form-prefs';
function readPref(key: string): string | undefined {
  try {
    return (JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Record<string, string>)[key];
  } catch {
    return undefined;
  }
}
function writePref(key: string, value: string): void {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Record<string, string>;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, [key]: value }));
  } catch {}
}
/** Lists checked for errors on save (chapters are built by type, so they are not in LIST_FACTORIES). */
const LIST_KEYS = [...Object.keys(LIST_FACTORIES), 'chapters'] as (DetailList | 'chapters')[];

const NAME_MAX = 120;
const ICON_MAX = 60;
const TYPE_LABEL_MAX = 60;
const SUMMARY_MAX = 300;
const LONG_MAX = 4000;
const LIST_ITEM_MAX = 300;
const URL_MAX = 2000;
const CASE_STUDY_MAX = 12000;

function requiredTextValidators(maxLength: number, multiline = false) {
  return [Validators.required, Validators.maxLength(maxLength), noControlCharsValidator({ allowNewlines: multiline })];
}

function optionalTextValidators(maxLength: number, multiline = false) {
  return [Validators.maxLength(maxLength), noControlCharsValidator({ allowNewlines: multiline })];
}

function listItemControl(value = ''): FormControl<string> {
  return new FormControl(value, {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(LIST_ITEM_MAX), noControlCharsValidator()],
  });
}

@Component({
  selector: 'app-admin-project-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, NgTemplateOutlet, DatePipe, ImageUploadComponent, MediaPickerComponent,
    FormStepsComponent, FieldHintComponent, TagInputComponent, RepeatHeadComponent, IconPickerComponent,
    ProjectCardPreviewComponent, ModelUploadComponent, ProjectPageComponent, AutoTranslateDirective, HotspotEditorComponent,
    ComboboxComponent, DurationPickerComponent, TeamPickerComponent, BlockExampleComponent, ProjectChaptersComponent, PageOrganizerComponent,
  ],
  templateUrl: './admin-project-form.component.html',
  styleUrls: ['../shared/admin-form.css', './admin-project-form.component.css', './admin-project-form-extras.css'],
})
export class AdminProjectFormComponent implements OnInit, HasUnsavedChanges {
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly translator = inject(TranslatorService);
  private readonly suggestionsService = inject(FormSuggestionsService);
  /** What was already used in other projects, offered as suggestions (stack, labels, roles...). */
  protected readonly suggestions = this.suggestionsService.suggestions;
  /** The admin shell gives this page more of the screen and an icon-only menu. */
  readonly wideLayout = true;

  // ---- Editing preferences (remembered in this browser)

  /** `es`: only Spanish fields on screen, English filled by the translator; `both`: side by side. */
  protected readonly editLang = signal<'es' | 'both'>(readPref('lang') === 'both' ? 'both' : 'es');
  /** The long explanations under fields and steps. */
  protected readonly hintsOn = signal(readPref('hints') !== 'off');

  protected setEditLang(lang: 'es' | 'both'): void {
    this.editLang.set(lang);
    writePref('lang', lang);
  }

  protected toggleHints(): void {
    this.hintsOn.update((on) => !on);
    writePref('hints', this.hintsOn() ? 'on' : 'off');
  }

  /** Spanish/English pairs of the step on screen whose English side is still empty. */
  protected readonly missingInStep = computed(() => {
    this.value();
    this.translator.version();
    return this.stepPairs().filter((pair) => String(pair.es.value ?? '').trim() && !String(pair.en.value ?? '').trim()).length + this.missingHighlights();
  });

  private stepPairs() {
    const step = this.steps[this.activeStep()];
    return translationPairs(this.form).filter((pair) => step.controls.some((control) => containsControl(control, pair.es)));
  }

  /** Highlights are two lists: English rows missing for the Spanish ones (Historia step). */
  private missingHighlights(): number {
    if (this.steps[this.activeStep()].id !== 'step-story') return 0;
    return Math.max(0, this.highlightsEs.length - this.highlightsEn.length);
  }

  async translateStep(): Promise<void> {
    let filled = 0;
    try {
      filled = await this.translator.fillAll(this.stepPairs());
    } catch {
      this.toast.show('No se pudo preparar el traductor de Chrome (la primera vez descarga el idioma). Revisa la conexión e inténtalo de nuevo.', 'error');
      return;
    }
    if (this.steps[this.activeStep()].id === 'step-story') {
      for (let i = this.highlightsEn.length; i < this.highlightsEs.length; i++) {
        const text = (await this.translator.translate(this.highlightsEs.at(i).value)).trim();
        if (!text) continue;
        this.highlightsEn.push(listItemControl(text));
        filled++;
      }
      if (filled) this.form.markAsDirty();
    }
    this.toast.show(filled ? `${filled} ${filled === 1 ? 'campo traducido' : 'campos traducidos'} al inglés. Revísalos antes de publicar.` : 'No había nada pendiente de traducir en este paso.');
  }

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: requiredTextValidators(NAME_MAX) }),
    type: new FormControl<'web' | '3d' | 'tool'>('web', { nonNullable: true, validators: [Validators.required] }),
    kind: new FormControl<'front' | 'back'>('front', { nonNullable: true, validators: [Validators.required] }),
    device: new FormControl<'browser' | 'phone' | ''>('', { nonNullable: true }),
    status: new FormControl<'live' | 'wip' | 'archive'>('wip', { nonNullable: true, validators: [Validators.required] }),
    icon: new FormControl('', { nonNullable: true, validators: requiredTextValidators(ICON_MAX) }),
    typeLabel: new FormControl('', { nonNullable: true, validators: requiredTextValidators(TYPE_LABEL_MAX) }),
    summaryEs: new FormControl('', { nonNullable: true, validators: requiredTextValidators(SUMMARY_MAX, true) }),
    summaryEn: new FormControl('', { nonNullable: true, validators: requiredTextValidators(SUMMARY_MAX, true) }),
    longEs: new FormControl('', { nonNullable: true, validators: optionalTextValidators(LONG_MAX, true) }),
    longEn: new FormControl('', { nonNullable: true, validators: optionalTextValidators(LONG_MAX, true) }),
    previewImage: new FormControl('', { nonNullable: true, validators: optionalTextValidators(URL_MAX) }),
    repoUrl: new FormControl('', { nonNullable: true, validators: [...optionalTextValidators(URL_MAX), urlValidator] }),
    liveUrl: new FormControl('', { nonNullable: true, validators: [...optionalTextValidators(URL_MAX), urlValidator] }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, (c) => (isValidSlug(c.value) ? null : { slug: true }), (c) => this.slugTaken(c.value)],
    }),
    previewVideo: new FormControl('', { nonNullable: true }),
    demoVideoUrl: new FormControl('', { nonNullable: true }),
    caseStudyEs: new FormControl('', { nonNullable: true, validators: optionalTextValidators(CASE_STUDY_MAX, true) }),
    caseStudyEn: new FormControl('', { nonNullable: true, validators: optionalTextValidators(CASE_STUDY_MAX, true) }),
    published: new FormControl(false, { nonNullable: true }),
    highlightsEs: new FormArray<FormControl<string>>([]),
    highlightsEn: new FormArray<FormControl<string>>([]),
    stack: new FormArray<FormControl<string>>([]),
    ...detailControls(),
  });

  private readonly c = this.form.controls;
  /** Ordered by what the visitor sees: who it is, the card, the story, the data, then the extras. */
  protected readonly steps: FormStep[] = [
    { id: 'step-identity', label: 'Identidad', controls: [this.c.name, this.c.slug, this.c.typeLabel, this.c.icon, this.c.stack] },
    { id: 'step-card', label: 'Tarjeta y portada', controls: [this.c.previewImage, this.c.previewVideo, this.c.demoVideoUrl, this.c.repoUrl, this.c.liveUrl] },
    { id: 'step-story', label: 'Historia', controls: [this.c.summaryEs, this.c.summaryEn, this.c.longEs, this.c.longEn, this.c.story, this.c.caseStudyEs, this.c.caseStudyEn, this.c.highlightsEs, this.c.highlightsEn] },
    { id: 'step-facts', label: 'Ficha y cifras', controls: [this.c.facts, this.c.results] },
    { id: 'step-chapters', label: 'Capítulos', controls: [this.c.chapters] },
    { id: 'step-gallery', label: 'Galería', controls: [this.c.videos, this.c.screens, this.c.gallery] },
    { id: 'step-extras', label: 'Extras', controls: [this.c.improvements, this.c.docs, this.c.versions] },
    { id: 'step-publish', label: 'Revisar y publicar', controls: [this.c.published, this.c.featured] },
  ];

  /** Step on screen (the rail shows one at a time). */
  protected readonly activeStep = signal(0);
  protected readonly lastStep = this.steps.length - 1;

  /** Form value as a signal, for the card preview and the review step. */
  protected readonly value = signal(this.form.getRawValue());

  /** "Revisar y publicar": every public section, whether it will show and where to fill it. */
  protected readonly review = computed(() => {
    const v = this.value();
    const has = (text: string) => text.trim() !== '';
    const count = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : '');
    const storyFilled = Object.values(v.story).some(has);
    const factsFilled = Object.values(v.facts).some(has);
    return [
      { label: 'Imagen o clip de la tarjeta', step: 1, detail: has(v.previewVideo) ? 'Clip' : has(v.previewImage) ? 'Imagen' : '' },
      { label: 'Video demo', step: 1, detail: has(v.demoVideoUrl) ? 'Listo' : '' },
      { label: 'Enlaces (demo y repositorio)', step: 1, detail: [has(v.liveUrl) ? 'Demo' : '', has(v.repoUrl) ? 'Repositorio' : ''].filter(Boolean).join(' y ') },
      { label: 'Descripción larga', step: 2, detail: has(v.longEs) ? 'Lista' : '' },
      { label: 'Historia en tres pasos', step: 2, detail: storyFilled ? 'Lista' : '' },
      { label: 'Cómo está hecho', step: 2, detail: has(v.caseStudyEs) ? 'Listo' : '' },
      { label: 'Puntos destacados', step: 2, detail: count(v.highlightsEs.length, 'punto', 'puntos') },
      { label: 'Ficha', step: 3, detail: factsFilled ? 'Lista' : '' },
      { label: 'Resultados con cifras', step: 3, detail: count(v.results.length, 'resultado', 'resultados') },
      { label: 'Capítulos', step: 4, detail: count(v.chapters.length, 'capítulo', 'capítulos') },
      { label: 'Videos', step: 5, detail: count(v.videos.length, 'video', 'videos') },
      { label: 'Pantallas', step: 5, detail: count(v.screens.length, 'pantalla', 'pantallas') },
      { label: 'Galería de fotos', step: 5, detail: count(v.gallery.length, 'foto', 'fotos') },
      { label: 'Mejoras, documentos y versiones', step: 6, detail: count(v.improvements.length + v.docs.length + v.versions.length, 'elemento', 'elementos') },
    ];
  });

  /** Items of the repeatable lists whose body is unfolded (new ones open, loaded ones folded). */
  private readonly openItems = signal(new Set<AbstractControl>());
  /** Factory for new tags, so they keep the list item validators. */
  protected readonly newListItem = listItemControl;

  protected readonly isEditMode = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  private projectId: string | null = null;
  /** The slug follows the name until it is edited by hand (or the project already exists). */
  private slugEdited = false;

  constructor() {
    this.suggestionsService.load();
    // The address check needs the other projects: re-run it when they arrive.
    effect(() => {
      this.suggestions();
      untracked(() => this.form.controls.slug.updateValueAndValidity({ emitEvent: false }));
    });
    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugEdited) this.form.controls.slug.setValue(slugify(name));
    });
    this.form.valueChanges.subscribe(() => this.value.set(this.form.getRawValue()));

    // A new step starts at the top of the form, not where the previous one was scrolled to.
    let first = true;
    effect(() => {
      this.activeStep();
      if (first) {
        first = false;
        return;
      }
      untracked(() => {
        const top = (this.host.nativeElement as HTMLElement).querySelector('.form-layout');
        if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
    });
  }

  protected goStep(index: number): void {
    this.activeStep.set(Math.min(Math.max(index, 0), this.lastStep));
  }

  protected isOpen(item: AbstractControl): boolean {
    return this.openItems().has(item);
  }

  protected toggleItem(item: AbstractControl): void {
    this.openItems.update((open) => {
      const next = new Set(open);
      if (!next.delete(item)) next.add(item);
      return next;
    });
  }

  /** Item-level problem (half-filled result, video without file...), once the item was touched. */
  protected itemError(item: AbstractControl): string | null {
    return item.touched || item.dirty ? itemErrorMessage(item) : null;
  }

  protected itemInvalid(item: AbstractControl): boolean {
    return item.invalid && item.touched;
  }

  /** First filled field of an item, for its folded header. */
  protected itemSummary(item: AbstractControl, ...keys: string[]): string {
    for (const key of keys) {
      const value = item.get(key)?.value;
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  /** Thumbnail for a folded item: the first of its fields that holds an image. */
  protected itemThumb(item: AbstractControl, ...keys: string[]): string {
    for (const key of keys) {
      const value = item.get(key)?.value;
      if (typeof value === 'string' && /\.(webp|png|jpe?g|gif|avif)(\?|$)/i.test(value)) return value;
    }
    return '';
  }

  // ---- Live preview (the real project page, fed with the form) and the private draft link

  protected readonly previewOpen = signal(false);
  /** Rebuilt on every change of the form (value() follows it). */
  protected readonly previewProject = computed<Project>(() => {
    this.value();
    return { ...this.buildPayload(), id: this.projectId ?? 'preview' };
  });

  protected togglePreview(open = !this.previewOpen()): void {
    this.previewOpen.set(open);
  }

  /** null: not loaded yet or migration 0014 missing; '' while loading. */
  protected readonly previewToken = signal<string | null>(null);
  protected readonly draftLink = computed(() => {
    const token = this.previewToken();
    const slug = this.value().slug.trim();
    return token && slug ? `${location.origin}/proyectos/${slug}?preview=${token}` : '';
  });

  protected copyDraftLink(): void {
    const link = this.draftLink();
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => this.toast.show('Enlace privado copiado.'),
      () => this.toast.show('No se pudo copiar; selecciona el enlace y cópialo a mano.', 'error'),
    );
  }

  async regenerateDraftLink(): Promise<void> {
    if (!this.projectId) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Nuevo enlace privado',
      message: 'El enlace actual dejará de funcionar para quien lo tenga. ¿Generar uno nuevo?',
      confirmLabel: 'GENERAR',
    });
    if (!confirmed) return;
    this.projectsService.regeneratePreviewToken(this.projectId).subscribe((token) => {
      if (token) {
        this.previewToken.set(token);
        this.toast.show('Enlace privado nuevo listo.');
      } else {
        this.toast.show('No se pudo generar el enlace.', 'error');
      }
    });
  }

  // ---- "¿Cómo se ve?": one section of the real page (yours, or an example while it is empty)

  protected readonly exampleOpen = signal<string | null>(null);

  protected toggleExample(id: string): void {
    this.exampleOpen.update((open) => (open === id ? null : id));
  }

  /** Chapter type under the pointer (or focus) in the picker, previewed live next to the cards. */
  protected readonly hoverChapterType = signal<ChapterType>('text');
  protected readonly hoverChapter = computed(() => [exampleChapter(this.hoverChapterType())]);

  // ---- "Organizar la página": order of the project page sections

  protected readonly organizerOpen = signal(false);

  protected setSectionOrder(order: string[]): void {
    if (order.join() === this.form.controls.sectionOrder.value.join()) return;
    this.form.controls.sectionOrder.setValue(order);
    this.form.controls.sectionOrder.markAsDirty();
    this.toast.show('Orden de la página actualizado. Se guarda con el proyecto.');
  }

  // ---- Pickers and checks

  /** Years offered for the fact sheet: next year back to 2010. */
  protected readonly years = Array.from({ length: new Date().getFullYear() + 2 - 2010 }, (_, i) => String(new Date().getFullYear() + 1 - i));

  /** Code languages: the ones already used first, then the common ones. */
  protected readonly languageOptions = computed(() => rank([...this.suggestions().languages, ...COMMON_LANGUAGES]));

  /** Another project already has this address (its page would be unreachable). */
  private slugTaken(slug: string): { slugTaken: true } | null {
    const taken = this.suggestions?.().slugs.some((entry) => entry.slug === slug && entry.id !== this.projectId);
    return taken ? { slugTaken: true } : null;
  }

  // ---- Focus point of the card image (what stays visible when it is cropped)

  protected readonly focusPoints = MEDIA_FOCUS_POINTS;
  protected readonly focusLabels = ['Arriba a la izquierda', 'Arriba', 'Arriba a la derecha', 'Izquierda', 'Centro', 'Derecha', 'Abajo a la izquierda', 'Abajo', 'Abajo a la derecha'];

  /** Segmented choices (story layout, results style): set the value and mark it for saving. */
  protected setChoice<T>(control: FormControl<T>, value: T): void {
    control.setValue(value);
    control.markAsDirty();
  }

  protected setFocus(point: string): void {
    this.form.controls.mediaFocus.setValue(point);
    this.form.controls.mediaFocus.markAsDirty();
  }

  // ---- Chapters

  protected readonly chapterTypes: { type: ChapterType; label: string; desc: string }[] = CHAPTER_TYPES.map((type) => ({ type, ...CHAPTER_INFO[type] }));
  protected readonly chapterPickerOpen = signal(false);

  protected chapterLabel(type: ChapterType): string {
    return CHAPTER_INFO[type].label;
  }

  addChapter(type: ChapterType): void {
    const array = this.form.controls.chapters;
    if (array.length >= MAX_ITEMS) return;
    const item = chapterGroup(type);
    array.push(item);
    array.markAsDirty();
    this.openItems.update((open) => new Set(open).add(item));
    this.chapterPickerOpen.set(false);
  }

  async removeChapter(index: number): Promise<void> {
    const chapter = this.form.controls.chapters.at(index);
    const confirmed = await this.confirmDialog.confirm({
      title: 'Quitar capítulo',
      message: `Se quitará el capítulo ${index + 1} (${this.chapterLabel(chapter.controls.type.value)}). Al guardar desaparece de la página del proyecto.`,
      confirmLabel: 'QUITAR',
    });
    if (!confirmed) return;
    this.form.controls.chapters.removeAt(index);
    this.form.controls.chapters.markAsDirty();
  }

  moveChapter(index: number, delta: -1 | 1): void {
    moveItem(this.form.controls.chapters, index, delta);
  }

  /** Folded header of a chapter: what identifies it for its type. */
  protected chapterSummary(chapter: ChapterGroup): string {
    const keys: Record<ChapterType, string[]> = {
      text: ['titleEs', 'titleEn', 'bodyEs'],
      image: ['captionEs', 'altEs', 'media'],
      compare: ['captionEs', 'altEs', 'media'],
      quote: ['bodyEs', 'bodyEn', 'author'],
      code: ['captionEs', 'language', 'code'],
      model: ['captionEs', 'media'],
    };
    return this.itemSummary(chapter, ...keys[chapter.controls.type.value]);
  }

  setChapterLayout(chapter: ChapterGroup, full: boolean): void {
    chapter.controls.layout.setValue(full ? 'full' : 'contained');
    chapter.markAsDirty();
  }

  onSlugInput(): void {
    this.slugEdited = true;
  }

  onDemoVideoChange(url: string): void {
    this.form.controls.demoVideoUrl.setValue(url);
    this.form.markAsDirty();
  }

  setIcon(name: string): void {
    this.form.controls.icon.setValue(name);
    this.form.controls.icon.markAsDirty();
    this.form.controls.icon.markAsTouched();
  }

  onPreviewVideoChange(url: string): void {
    this.form.controls.previewVideo.setValue(url);
    this.form.markAsDirty();
  }

  /** Uploading the demo also gives a hover clip: use it for the card if there is none yet. */
  onDemoUploaded(upload: MediaUpload): void {
    if (upload.preview && !this.form.controls.previewVideo.value) this.onPreviewVideoChange(upload.preview);
  }

  /** An uploaded video brings its own poster, hover clip and duration; they replace the previous video's. */
  onVideoUploaded(group: FormGroup, upload: MediaUpload): void {
    group.patchValue({ poster: upload.poster ?? '', preview: upload.preview ?? '', ...(upload.duration ? { duration: upload.duration } : {}) });
    group.markAsDirty();
  }

  /** A screen's still defaults to the poster of its uploaded video. */
  onScreenUploaded(group: FormGroup, upload: MediaUpload): void {
    if (upload.poster && !group.get('image')?.value) group.patchValue({ image: upload.poster });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const from = this.route.snapshot.queryParamMap.get('from');
    if (id) {
      this.projectId = id;
      this.isEditMode.set(true);
      this.loadExisting(id);
    } else if (from) {
      this.loadAsCopy(from);
    } else {
      this.checkLocalDraft();
    }
    this.watchLocalDraft();
  }

  /** "Duplicar": a new project that starts with everything from another one, unpublished, new address. */
  private loadAsCopy(sourceId: string): void {
    this.loading.set(true);
    this.projectsService.getById(sourceId).subscribe({
      next: (row) => {
        this.loading.set(false);
        if (!row) {
          this.errorMessage.set('No se encontró el proyecto a duplicar.');
          return;
        }
        this.patchForm(row);
        this.slugEdited = false;
        this.form.patchValue({ name: `${row.name} (copia)`, published: false, featured: false });
        this.form.markAsDirty();
        this.toast.show('Copia lista: cambia el nombre y lo que haga falta, y guarda.');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar el proyecto a duplicar.');
      },
    });
  }

  // ---- Local draft: what you were writing survives a closed tab or a lost connection

  private get draftKey(): string {
    return `ca-project-draft-${this.projectId ?? 'new'}`;
  }

  /** A newer unsaved version of this form found in the browser (offered, never applied silently). */
  protected readonly localDraft = signal<{ at: number; payload: ProjectInput } | null>(null);

  private checkLocalDraft(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(this.draftKey) || 'null') as { at: number; payload: ProjectInput } | null;
      if (saved?.payload && JSON.stringify(saved.payload) !== JSON.stringify(this.buildPayload())) this.localDraft.set(saved);
    } catch {}
  }

  private watchLocalDraft(): void {
    this.form.valueChanges.pipe(debounceTime(1200), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.form.dirty || this.saving()) return;
      try {
        localStorage.setItem(this.draftKey, JSON.stringify({ at: Date.now(), payload: this.buildPayload() }));
      } catch {}
    });
  }

  protected restoreLocalDraft(): void {
    const draft = this.localDraft();
    if (!draft) return;
    this.patchForm({ ...draft.payload, id: this.projectId ?? '', sortOrder: 0 } as AdminProject);
    this.form.markAsDirty();
    this.localDraft.set(null);
    this.toast.show('Borrador recuperado. Revisa y guarda.');
  }

  protected discardLocalDraft(): void {
    this.localDraft.set(null);
    this.clearLocalDraft();
  }

  private clearLocalDraft(): void {
    try {
      localStorage.removeItem(this.draftKey);
    } catch {}
  }

  private loadExisting(id: string): void {
    this.loading.set(true);
    this.projectsService.getById(id).subscribe({
      next: (row) => {
        this.loading.set(false);
        if (!row) {
          this.errorMessage.set('No se encontró ese proyecto.');
          return;
        }
        this.patchForm(row);
        this.checkLocalDraft();
        this.projectsService.getPreviewToken(id).subscribe((token) => this.previewToken.set(token));
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar el proyecto.');
      },
    });
  }

  private patchForm(row: AdminProject): void {
    this.form.patchValue({
      name: row.name,
      type: row.type,
      kind: row.kind,
      device: row.device ?? '',
      status: row.status,
      icon: row.icon,
      typeLabel: row.typeLabel,
      summaryEs: row.summaryEs,
      summaryEn: row.summaryEn,
      longEs: row.longEs,
      longEn: row.longEn,
      previewImage: row.previewImage ?? '',
      repoUrl: row.repoUrl ?? '',
      liveUrl: row.liveUrl ?? '',
      published: row.published,
      slug: row.slug,
      previewVideo: row.previewVideo ?? '',
      demoVideoUrl: row.demoVideoUrl ?? '',
      caseStudyEs: row.caseStudyEs,
      caseStudyEn: row.caseStudyEn,
    });
    this.slugEdited = true;

    this.setListValues(this.highlightsEs, row.highlightsEs);
    this.setListValues(this.highlightsEn, row.highlightsEn);
    this.setListValues(this.stack, row.stack);
    patchDetails(this.form.controls, row);
  }

  private setListValues(array: FormArray<FormControl<string>>, values: string[]): void {
    array.clear();
    for (const value of values) {
      array.push(listItemControl(value));
    }
  }

  get highlightsEs(): FormArray<FormControl<string>> {
    return this.form.controls.highlightsEs;
  }

  get highlightsEn(): FormArray<FormControl<string>> {
    return this.form.controls.highlightsEn;
  }

  get stack(): FormArray<FormControl<string>> {
    return this.form.controls.stack;
  }

  addHighlightEs(): void {
    this.highlightsEs.push(listItemControl());
    this.form.markAsDirty();
  }

  removeHighlightEs(index: number): void {
    this.highlightsEs.removeAt(index);
    this.form.markAsDirty();
  }

  addHighlightEn(): void {
    this.highlightsEn.push(listItemControl());
    this.form.markAsDirty();
  }

  removeHighlightEn(index: number): void {
    this.highlightsEn.removeAt(index);
    this.form.markAsDirty();
  }

  protected readonly maxItems = MAX_ITEMS;
  protected readonly improvementStatuses = IMPROVEMENT_STATUSES;
  protected readonly statusLabels = { planned: 'Planeada', in_progress: 'En curso', done: 'Hecha' };

  /** "¿Cuántos videos?": value of the number field next to the button. */
  protected readonly videoCount = signal(1);

  createVideoSlots(): void {
    const before = this.form.controls.videos.length;
    fillToCount(this.form.controls.videos, this.videoCount(), videoGroup);
    const added = this.form.controls.videos.controls.slice(before);
    this.openItems.update((open) => new Set([...open, ...added]));
  }

  addItem(list: DetailList): void {
    const array = this.form.controls[list] as unknown as FormArray<FormGroup>;
    if (array.length >= MAX_ITEMS) return;
    const item = LIST_FACTORIES[list]() as unknown as FormGroup;
    array.push(item);
    array.markAsDirty();
    this.openItems.update((open) => new Set(open).add(item));
  }

  removeItem(list: DetailList, index: number): void {
    const array = this.form.controls[list] as unknown as FormArray;
    array.removeAt(index);
    array.markAsDirty();
  }

  moveItem(list: DetailList, index: number, delta: -1 | 1): void {
    moveItem(this.form.controls[list] as unknown as FormArray, index, delta);
  }

  /** Media pickers inside list items write the chosen path into that item's control. */
  setItemPath(group: FormGroup, key: string, path: string): void {
    group.get(key)?.setValue(path);
    group.markAsDirty();
  }

  stackHasErrors(): boolean {
    return this.stack.controls.some((control) => control.invalid);
  }

  protected readonly maxHotspots = MAX_HOTSPOTS;

  // ---- Mobile version: a vertical clip and up to six vertical captures (empty ones are not saved).

  protected readonly maxMobileImages = MAX_MOBILE_IMAGES;
  protected readonly mobileImages = computed(() => this.value().mobileImages);
  protected readonly firstMobileImage = computed(() => this.mobileImages().find((src) => src.trim()) ?? '');

  onMobileVideoChange(path: string): void {
    this.form.controls.mobileVideo.setValue(path);
    this.form.markAsDirty();
  }

  protected addMobileImage(): void {
    if (this.mobileImages().length < MAX_MOBILE_IMAGES) this.setMobileImages([...this.mobileImages(), '']);
  }

  protected setMobileImage(index: number, url: string): void {
    this.setMobileImages(this.mobileImages().map((src, i) => (i === index ? url : src)));
  }

  protected moveMobileImage(index: number, delta: -1 | 1): void {
    const images = [...this.mobileImages()];
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    this.setMobileImages(images);
  }

  protected removeMobileImage(index: number): void {
    this.setMobileImages(this.mobileImages().filter((_, i) => i !== index));
  }

  private setMobileImages(images: string[]): void {
    this.form.controls.mobileImages.setValue(images);
    this.form.controls.mobileImages.markAsDirty();
  }

  onPreviewImageChange(url: string): void {
    this.form.controls.previewImage.setValue(url);
    this.form.markAsDirty();
  }

  hasError(controlName: keyof typeof this.form.controls, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(error);
  }

  listControlErrors(array: FormArray<FormControl<string>>, index: number): ValidationErrors | null {
    const control = array.at(index);
    return control.touched ? control.errors : null;
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.errorMessage.set('Revisa los campos marcados antes de guardar.');
      // Unfold the items with errors and open the first step that has one, then focus its field.
      const invalidItems = LIST_KEYS.flatMap((list) => (this.form.controls[list] as unknown as FormArray).controls.filter((item) => item.invalid));
      this.openItems.update((open) => new Set([...open, ...invalidItems]));
      const step = this.steps.findIndex((s) => s.controls.some((control) => control.invalid));
      if (step >= 0) this.activeStep.set(step);
      // An English field with an error would be folded away in Spanish-only mode: show both languages.
      if (translationPairs(this.form).some((pair) => pair.en.invalid)) this.setEditLang('both');
      setTimeout(() => {
        const fieldset = step >= 0 ? document.getElementById(this.steps[step].id) : null;
        focusFirstInvalid(fieldset ?? this.host.nativeElement);
      });
      return;
    }

    const payload = this.buildPayload();

    this.saving.set(true);
    this.errorMessage.set('');

    const request$ = this.isEditMode() && this.projectId
      ? this.projectsService.update(this.projectId, payload)
      : this.projectsService.create(payload);

    request$.subscribe({
      next: (result) => {
        this.saving.set(false);
        if (!result) {
          this.errorMessage.set('No se pudo guardar el proyecto.');
          return;
        }
        this.form.markAsPristine();
        this.clearLocalDraft();
        this.suggestionsService.load(true);
        this.toast.show('Proyecto guardado.');
        this.router.navigateByUrl('/admin/projects');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar el proyecto.');
      },
    });
  }

  /** The form as the payload saved to Supabase (also feeds the live preview). */
  private buildPayload(): ProjectInput {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      type: value.type,
      kind: value.kind,
      device: value.device === '' ? undefined : value.device,
      status: value.status,
      icon: value.icon.trim(),
      typeLabel: value.typeLabel.trim(),
      summaryEs: value.summaryEs.trim(),
      summaryEn: value.summaryEn.trim(),
      longEs: value.longEs.trim(),
      longEn: value.longEn.trim(),
      previewImage: value.previewImage.trim() || undefined,
      repoUrl: value.repoUrl.trim() || undefined,
      liveUrl: value.liveUrl.trim() || undefined,
      published: value.published,
      highlightsEs: value.highlightsEs.map((h) => h.trim()),
      highlightsEn: value.highlightsEn.map((h) => h.trim()),
      stack: value.stack.map((s) => s.trim()),
      slug: value.slug.trim(),
      previewVideo: value.previewVideo.trim(),
      demoVideoUrl: value.demoVideoUrl.trim(),
      caseStudyEs: value.caseStudyEs.trim(),
      caseStudyEn: value.caseStudyEn.trim(),
      ...readDetails(this.form.controls),
    };
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.previewOpen()) this.togglePreview(false);
  }

  /** Ctrl/Cmd + S saves; Alt + arrows move between steps. */
  @HostListener('document:keydown', ['$event'])
  protected onShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!this.saving()) this.submit();
    } else if (event.altKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      this.goStep(this.activeStep() + (event.key === 'ArrowRight' ? 1 : -1));
    }
  }

  /** "Revisar y publicar": things worth fixing before publishing, each with the step that fixes it. */
  protected readonly quality = computed(() => {
    const v = this.value();
    this.translator.version();
    const issues: { text: string; step: number }[] = [];
    const pending = translationPairs(this.form).filter((pair) => String(pair.es.value ?? '').trim() && !String(pair.en.value ?? '').trim());
    if (pending.length) {
      const step = this.steps.findIndex((s) => s.controls.some((control) => containsControl(control, pending[0].es)));
      issues.push({ text: `${pending.length} ${pending.length === 1 ? 'campo sin versión en inglés' : 'campos sin versión en inglés'} (se mostrará el español)`, step: Math.max(step, 0) });
    }
    const auto = translationPairs(this.form).filter((pair) => this.translator.isAuto(pair.en)).length;
    if (auto) issues.push({ text: `${auto} ${auto === 1 ? 'traducción automática sin revisar' : 'traducciones automáticas sin revisar'}`, step: 2 });
    if (!v.previewImage.trim() && !v.previewVideo.trim()) issues.push({ text: 'Sin imagen ni clip: la tarjeta usa la portada generada con el icono', step: 1 });
    if (!v.stack.length) issues.push({ text: 'Sin tecnologías en el stack', step: 0 });
    const noAlt = v.chapters.filter((c) => (c.type === 'image' || c.type === 'compare') && c.media.trim() && !c.altEs.trim()).length;
    if (noAlt) issues.push({ text: `${noAlt} ${noAlt === 1 ? 'imagen de capítulo sin texto alternativo' : 'imágenes de capítulo sin texto alternativo'}`, step: 4 });
    const noPoster = v.videos.filter((video) => video.video.trim() && !video.poster.trim()).length;
    if (noPoster) issues.push({ text: `${noPoster} ${noPoster === 1 ? 'video sin póster' : 'videos sin póster'} (se verá el primer fotograma)`, step: 5 });
    if (!v.longEs.trim() && !v.caseStudyEs.trim() && !v.chapters.length) issues.push({ text: 'Sin descripción, caso de estudio ni capítulos: la página del proyecto quedará corta', step: 2 });
    return issues;
  });
}
