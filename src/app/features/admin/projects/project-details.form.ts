import { AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import {
  ImprovementStatus,
  ResultsStyle,
  StoryLayout,
  ProjectChapter,
  ProjectDetails,
  ProjectDoc,
  ProjectFacts,
  ProjectStory,
  ProjectImprovement,
  ProjectPhoto,
  ProjectResult,
  ProjectHotspot,
  ProjectScreen,
  ProjectVersion,
  ProjectVideo,
  ChapterLayout,
  ChapterType,
  DEFAULT_MEDIA_FOCUS,
  emptyChapter,
  emptyFacts,
  emptyStory,
} from '../../../core/data/project-details';

/** Controles de formulario de las secciones de detalle opcionales de un proyecto (0010). Todo puede quedar vacío. */

const SHORT = 80;
const TITLE = 120;
const CAPTION = 300;
const NOTE = 600;
const STORY = 1200;
const PATH = 500;
export const MAX_ITEMS = 30;

const URL_PATTERN = /^https?:\/\/\S+$/i;

function optional(max: number, multiline = false, value = ''): FormControl<string> {
  return new FormControl(value, { nonNullable: true, validators: [Validators.maxLength(max), noControlCharsValidator({ allowNewlines: multiline })] });
}

const urlValidator: ValidatorFn = (control) => (!control.value || URL_PATTERN.test(control.value) ? null : { url: true });

type Controls<T> = { [K in keyof T]: FormControl<T[K]> };
export type FactsGroup = FormGroup<Controls<ProjectFacts>>;
export type ResultGroup = FormGroup<Controls<ProjectResult>>;
export type ScreenGroup = FormGroup<Controls<ProjectScreen>>;
export type PhotoGroup = FormGroup<Controls<ProjectPhoto>>;
export type ImprovementGroup = FormGroup<Controls<ProjectImprovement>>;
export type DocGroup = FormGroup<Controls<ProjectDoc>>;
export type VersionGroup = FormGroup<Controls<ProjectVersion>>;
export type VideoGroup = FormGroup<Controls<ProjectVideo>>;
export type ChapterGroup = FormGroup<Controls<ProjectChapter>>;
export type HotspotGroup = FormGroup<Controls<ProjectHotspot>>;

/** Un punto de interés: dónde está (porcentaje de la imagen) y su etiqueta bilingüe. */
export function hotspotGroup(item?: Partial<ProjectHotspot>): HotspotGroup {
  return new FormGroup({
    x: new FormControl(item?.x ?? 50, { nonNullable: true }),
    y: new FormControl(item?.y ?? 50, { nonNullable: true }),
    labelEs: optional(SHORT, false, item?.labelEs),
    labelEn: optional(SHORT, false, item?.labelEn),
  });
}

/** Problema / proceso / resultado, bilingüe (vacío = la franja no se muestra). */
export function storyGroup(story: ProjectStory = emptyStory()): FormGroup<Controls<ProjectStory>> {
  return new FormGroup({
    challengeEs: optional(STORY, true, story.challengeEs),
    challengeEn: optional(STORY, true, story.challengeEn),
    approachEs: optional(STORY, true, story.approachEs),
    approachEn: optional(STORY, true, story.approachEn),
    outcomeEs: optional(STORY, true, story.outcomeEs),
    outcomeEn: optional(STORY, true, story.outcomeEn),
  });
}

export function factsGroup(facts: ProjectFacts = emptyFacts()): FactsGroup {
  return new FormGroup({
    year: optional(20, false, facts.year),
    durationEs: optional(SHORT, false, facts.durationEs),
    durationEn: optional(SHORT, false, facts.durationEn),
    roleEs: optional(TITLE, false, facts.roleEs),
    roleEn: optional(TITLE, false, facts.roleEn),
    client: optional(TITLE, false, facts.client),
    team: optional(SHORT, false, facts.team),
  });
}

export function resultGroup(item?: ProjectResult): ResultGroup {
  return new FormGroup({
    value: optional(30, false, item?.value),
    labelEs: optional(SHORT, false, item?.labelEs),
    labelEn: optional(SHORT, false, item?.labelEn),
    contextEs: optional(CAPTION, false, item?.contextEs),
    contextEn: optional(CAPTION, false, item?.contextEn),
  }, { validators: needs('value', ['labelEs', 'labelEn', 'contextEs', 'contextEn'], 'needsValue') });
}

export function screenGroup(item?: ProjectScreen): ScreenGroup {
  return new FormGroup({
    titleEs: optional(TITLE, false, item?.titleEs),
    titleEn: optional(TITLE, false, item?.titleEn),
    descEs: optional(NOTE, true, item?.descEs),
    descEn: optional(NOTE, true, item?.descEn),
    video: optional(PATH, false, item?.video),
    image: optional(PATH, false, item?.image),
  });
}

export function photoGroup(item?: ProjectPhoto): PhotoGroup {
  return new FormGroup({
    image: optional(PATH, false, item?.image),
    captionEs: optional(CAPTION, false, item?.captionEs),
    captionEn: optional(CAPTION, false, item?.captionEn),
  });
}

export function improvementGroup(item?: ProjectImprovement): ImprovementGroup {
  return new FormGroup({
    textEs: optional(CAPTION, false, item?.textEs),
    textEn: optional(CAPTION, false, item?.textEn),
    status: new FormControl<ImprovementStatus>(item?.status ?? 'planned', { nonNullable: true }),
  });
}

export function docGroup(item?: ProjectDoc): DocGroup {
  return new FormGroup({
    titleEs: optional(TITLE, false, item?.titleEs),
    titleEn: optional(TITLE, false, item?.titleEn),
    file: optional(PATH, false, item?.file),
    url: new FormControl(item?.url ?? '', { nonNullable: true, validators: [Validators.maxLength(2000), urlValidator] }),
  });
}

export function versionGroup(item?: ProjectVersion): VersionGroup {
  return new FormGroup({
    version: optional(30, false, item?.version),
    date: optional(30, false, item?.date),
    notesEs: optional(NOTE, true, item?.notesEs),
    notesEn: optional(NOTE, true, item?.notesEn),
  });
}

const CHAPTER_BODY = 6000;
const CHAPTER_CODE = 12000;
/** El código conserva tabuladores y saltos de línea; cualquier otro carácter de control se rechaza. */
const CODE_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const codeValidator: ValidatorFn = (control) => (typeof control.value === 'string' && CODE_CONTROL_CHARS.test(control.value) ? { controlChars: true } : null);

const filled = (group: AbstractControl, key: string) => String(group.get(key)?.value ?? '').trim() !== '';

/** Comprobación de grupo: si algún campo de `when` tiene contenido, `key` también debe tenerlo (un elemento a medias se descartaría). */
function needs(key: string, when: string[], error: string): ValidatorFn {
  return (group) => (!filled(group, key) && when.some((other) => filled(group, other)) ? { [error]: true } : null);
}

/** Lo que necesita cada tipo de capítulo cuando ya se empezó a rellenar. */
const chapterValidator: ValidatorFn = (group) => {
  const type = group.get('type')?.value as ChapterType;
  const any = (...keys: string[]) => keys.some((key) => filled(group, key));
  if (type === 'compare' && filled(group, 'media') !== filled(group, 'mediaAfter')) return { needsBothImages: true };
  if (type === 'image' && !filled(group, 'media') && any('captionEs', 'captionEn', 'altEs', 'altEn')) return { needsImage: true };
  if (type === 'code' && !filled(group, 'code') && any('captionEs', 'captionEn', 'language')) return { needsCode: true };
  if (type === 'quote' && !any('bodyEs', 'bodyEn') && filled(group, 'author')) return { needsQuote: true };
  if (type === 'model' && !filled(group, 'media') && any('captionEs', 'captionEn')) return { needsModel: true };
  return null;
};

/** Mensaje de un error de elemento (se ve dentro del elemento y resumido en su cabecera plegada). */
export function itemErrorMessage(group: AbstractControl): string | null {
  const errors = group.errors ?? {};
  if (errors['needsValue']) return 'Falta la cifra: un resultado sin número no se muestra.';
  if (errors['needsVideo']) return 'Falta el archivo de video: sin él, este video no se guarda.';
  if (errors['needsBothImages']) return 'Un antes y después necesita las dos imágenes.';
  if (errors['needsImage']) return 'Falta la imagen de este capítulo.';
  if (errors['needsCode']) return 'Falta el código de este capítulo.';
  if (errors['needsQuote']) return 'Falta el texto de la cita.';
  if (errors['needsModel']) return 'Elige o sube el modelo 3D.';
  return null;
}

/** Un capítulo del caso de estudio; un nombre de tipo crea un capítulo vacío de ese tipo. */
export function chapterGroup(item: ProjectChapter | ChapterType): ChapterGroup {
  const chapter = typeof item === 'string' ? emptyChapter(item) : item;
  return new FormGroup({
    type: new FormControl<ChapterType>(chapter.type, { nonNullable: true }),
    layout: new FormControl<ChapterLayout>(chapter.layout, { nonNullable: true }),
    titleEs: optional(TITLE, false, chapter.titleEs),
    titleEn: optional(TITLE, false, chapter.titleEn),
    bodyEs: optional(CHAPTER_BODY, true, chapter.bodyEs),
    bodyEn: optional(CHAPTER_BODY, true, chapter.bodyEn),
    captionEs: optional(CAPTION, false, chapter.captionEs),
    captionEn: optional(CAPTION, false, chapter.captionEn),
    altEs: optional(CAPTION, false, chapter.altEs),
    altEn: optional(CAPTION, false, chapter.altEn),
    media: optional(PATH, false, chapter.media),
    mediaAfter: optional(PATH, false, chapter.mediaAfter),
    author: optional(TITLE, false, chapter.author),
    code: new FormControl(chapter.code, { nonNullable: true, validators: [Validators.maxLength(CHAPTER_CODE), codeValidator] }),
    language: optional(30, false, chapter.language),
  }, { validators: chapterValidator });
}

export function videoGroup(item?: ProjectVideo): VideoGroup {
  return new FormGroup({
    titleEs: optional(TITLE, false, item?.titleEs),
    titleEn: optional(TITLE, false, item?.titleEn),
    descEs: optional(NOTE, true, item?.descEs),
    descEn: optional(NOTE, true, item?.descEn),
    video: optional(PATH, false, item?.video),
    poster: optional(PATH, false, item?.poster),
    preview: optional(PATH, false, item?.preview),
    duration: optional(12, false, item?.duration),
  }, { validators: needs('video', ['titleEs', 'titleEn', 'descEs', 'descEn', 'poster', 'duration'], 'needsVideo') });
}

/**
 * "¿Cuántos videos?": añade huecos vacíos hasta que la lista tenga `count` elementos. Nunca quita, así
 * bajar el número no borra videos rellenos; esos se quitan uno a uno con QUITAR.
 */
export function fillToCount<G extends FormGroup>(array: FormArray<G>, count: number, create: () => G): number {
  const target = Math.min(Math.max(0, Math.floor(count)), MAX_ITEMS);
  let added = 0;
  while (array.length < target) {
    array.push(create());
    added++;
  }
  if (added) array.markAsDirty();
  return added;
}

export function detailControls() {
  return {
    featured: new FormControl(false, { nonNullable: true }),
    facts: factsGroup(),
    story: storyGroup(),
    results: new FormArray<ResultGroup>([]),
    screens: new FormArray<ScreenGroup>([]),
    gallery: new FormArray<PhotoGroup>([]),
    improvements: new FormArray<ImprovementGroup>([]),
    docs: new FormArray<DocGroup>([]),
    versions: new FormArray<VersionGroup>([]),
    videos: new FormArray<VideoGroup>([]),
    chapters: new FormArray<ChapterGroup>([]),
    mediaFocus: new FormControl(DEFAULT_MEDIA_FOCUS, { nonNullable: true }),
    sectionOrder: new FormControl<string[]>([], { nonNullable: true }),
    storyLayout: new FormControl<StoryLayout>('timeline', { nonNullable: true }),
    resultsStyle: new FormControl<ResultsStyle>('numbers', { nonNullable: true }),
    mobileVideo: optional(PATH),
    mobileImages: new FormControl<string[]>([], { nonNullable: true }),
    hotspots: new FormArray<HotspotGroup>([]),
  };
}

type DetailControls = ReturnType<typeof detailControls>;

function fill<G extends FormGroup, T>(array: FormArray<G>, items: T[], create: (item: T) => G): void {
  array.clear();
  for (const item of items) array.push(create(item));
}

/** Carga los detalles guardados en el formulario (modo edición). */
export function patchDetails(controls: DetailControls, details: ProjectDetails): void {
  controls.featured.setValue(details.featured);
  controls.facts.setValue(details.facts);
  controls.story.setValue(details.story);
  fill(controls.results, details.results, resultGroup);
  fill(controls.screens, details.screens, screenGroup);
  fill(controls.gallery, details.gallery, photoGroup);
  fill(controls.improvements, details.improvements, improvementGroup);
  fill(controls.docs, details.docs, docGroup);
  fill(controls.versions, details.versions, versionGroup);
  fill(controls.videos, details.videos, videoGroup);
  fill(controls.chapters, details.chapters, chapterGroup);
  controls.mediaFocus.setValue(details.mediaFocus || DEFAULT_MEDIA_FOCUS);
  controls.sectionOrder.setValue(details.sectionOrder ?? []);
  controls.storyLayout.setValue(details.storyLayout ?? 'timeline');
  controls.resultsStyle.setValue(details.resultsStyle ?? 'numbers');
  controls.mobileVideo.setValue(details.mobileVideo ?? '');
  controls.mobileImages.setValue(details.mobileImages ?? []);
  fill(controls.hotspots, details.hotspots ?? [], hotspotGroup);
}

/** Lee el formulario como `ProjectDetails` (el mapeo del servicio descarta los elementos vacíos). */
export function readDetails(controls: DetailControls): ProjectDetails {
  return {
    featured: controls.featured.value,
    facts: controls.facts.getRawValue(),
    story: controls.story.getRawValue(),
    results: controls.results.getRawValue(),
    screens: controls.screens.getRawValue(),
    gallery: controls.gallery.getRawValue(),
    improvements: controls.improvements.getRawValue(),
    docs: controls.docs.getRawValue(),
    versions: controls.versions.getRawValue(),
    videos: controls.videos.getRawValue(),
    chapters: controls.chapters.getRawValue(),
    mediaFocus: controls.mediaFocus.value,
    sectionOrder: controls.sectionOrder.value,
    storyLayout: controls.storyLayout.value,
    resultsStyle: controls.resultsStyle.value,
    mobileVideo: controls.mobileVideo.value,
    mobileImages: controls.mobileImages.value,
    hotspots: controls.hotspots.getRawValue(),
  };
}

/** Sube (-1) o baja (+1) un elemento y marca el formulario como modificado. */
export function moveItem(array: FormArray, index: number, delta: -1 | 1): void {
  const target = index + delta;
  if (target < 0 || target >= array.length) return;
  const item = array.at(index);
  array.removeAt(index, { emitEvent: false });
  array.insert(target, item);
  array.markAsDirty();
}
