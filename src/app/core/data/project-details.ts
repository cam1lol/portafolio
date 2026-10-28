import { Project } from './project.model';

/** Fact sheet shown at the top of the project page. Every field is optional (empty = hidden). */
export interface ProjectFacts {
  year: string;
  durationEs: string;
  durationEn: string;
  roleEs: string;
  roleEn: string;
  client: string;
  team: string;
}

/** One screen of the product: a video and/or a still, with a short explanation. */
export interface ProjectScreen {
  titleEs: string;
  titleEn: string;
  descEs: string;
  descEn: string;
  video: string;
  image: string;
}

export interface ProjectPhoto {
  image: string;
  captionEs: string;
  captionEn: string;
}

/** A number with context, e.g. "-40 %" / "tiempo de carga" / "tras migrar a Angular 20". */
export interface ProjectResult {
  value: string;
  labelEs: string;
  labelEn: string;
  contextEs: string;
  contextEn: string;
}

export type ImprovementStatus = 'planned' | 'in_progress' | 'done';

export interface ProjectImprovement {
  textEs: string;
  textEn: string;
  status: ImprovementStatus;
}

/** A file in the repo (PDF) or an external link (Notion, Figma, docs). */
export interface ProjectDoc {
  titleEs: string;
  titleEn: string;
  file: string;
  url: string;
}

/** A video of the project, shown in the Videos grid and played in a modal. */
export interface ProjectVideo {
  titleEs: string;
  titleEn: string;
  descEs: string;
  descEn: string;
  video: string;
  /** Still shown before playing; without it the first frame is used. */
  poster: string;
  /** Short silent clip played on hover (generated on upload); without it the hover plays the video itself. */
  preview: string;
  /** Free text, e.g. "2:15". */
  duration: string;
}

export interface ProjectVersion {
  version: string;
  date: string;
  notesEs: string;
  notesEn: string;
}

/**
 * Case study in three steps (problem, process, result), shown as a numbered HUD strip on the
 * project page. Stored inside the `facts` jsonb column, so it needs no migration. Optional.
 */
export interface ProjectStory {
  challengeEs: string;
  challengeEn: string;
  approachEs: string;
  approachEn: string;
  outcomeEs: string;
  outcomeEn: string;
}

export type ChapterType = 'text' | 'image' | 'compare' | 'quote' | 'code' | 'model';
export type ChapterLayout = 'contained' | 'full';

/**
 * One piece of the case study, composed in the admin. A flat shape for every type (unused fields
 * stay empty), so the form and the jsonb stay simple:
 * - text: title + body (blank line between paragraphs, **bold**).
 * - image: media + alt + caption, contained or full-bleed.
 * - compare: media (before) + mediaAfter + alt + caption.
 * - quote: body + author.
 * - code: code + language + caption.
 * - model: media (GLB path in the `models` bucket) + caption.
 */
export interface ProjectChapter {
  type: ChapterType;
  layout: ChapterLayout;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  captionEs: string;
  captionEn: string;
  altEs: string;
  altEn: string;
  media: string;
  mediaAfter: string;
  author: string;
  code: string;
  language: string;
}

export interface ProjectDetails {
  /** Shown on the home page; /proyectos shows every published project. */
  featured: boolean;
  facts: ProjectFacts;
  story: ProjectStory;
  results: ProjectResult[];
  screens: ProjectScreen[];
  gallery: ProjectPhoto[];
  improvements: ProjectImprovement[];
  docs: ProjectDoc[];
  versions: ProjectVersion[];
  videos: ProjectVideo[];
  chapters: ProjectChapter[];
  /**
   * Part of the card image / clip that must always show when it is cropped (CSS object-position,
   * e.g. "50% 0%" = top). Stored inside the facts jsonb like the story, so it needs no migration.
   */
  mediaFocus: string;
  /** Order of the movable sections on the project page (ids of PAGE_SECTIONS); empty = default order. */
  sectionOrder: string[];
}

/** Sections of the project page that can be reordered from the admin ("Organizar la página"), in default order. */
export const PAGE_SECTIONS: { id: string; label: string }[] = [
  { id: 's-demo', label: 'Video demo' },
  { id: 's-story', label: 'Historia en tres pasos' },
  { id: 's-results', label: 'Resultados con cifras' },
  { id: 's-overview', label: 'Resumen y stack' },
  { id: 's-how', label: 'Cómo está hecho' },
  { id: 's-chapters', label: 'Capítulos' },
  { id: 's-videos', label: 'Videos' },
  { id: 's-screens', label: 'Pantallas' },
  { id: 's-gallery', label: 'Galería de fotos' },
  { id: 's-extras', label: 'Mejoras, documentos y versiones' },
];

/** A saved order completed with any section it does not mention (new ones go where they belong by default). */
export function effectiveSectionOrder(saved: string[]): string[] {
  const known = PAGE_SECTIONS.map((section) => section.id);
  const order = saved.filter((id, i) => known.includes(id) && saved.indexOf(id) === i);
  for (const id of known) if (!order.includes(id)) order.splice(Math.min(known.indexOf(id), order.length), 0, id);
  return order;
}

/** The nine focus points offered in the admin (3 x 3 grid), as object-position values. */
export const MEDIA_FOCUS_POINTS = ['0% 0%', '50% 0%', '100% 0%', '0% 50%', '50% 50%', '100% 50%', '0% 100%', '50% 100%', '100% 100%'];
export const DEFAULT_MEDIA_FOCUS = '50% 50%';

export const IMPROVEMENT_STATUSES: ImprovementStatus[] = ['planned', 'in_progress', 'done'];
export const CHAPTER_TYPES: ChapterType[] = ['text', 'image', 'compare', 'quote', 'code', 'model'];

export function emptyChapter(type: ChapterType): ProjectChapter {
  return {
    type, layout: 'contained', titleEs: '', titleEn: '', bodyEs: '', bodyEn: '', captionEs: '', captionEn: '',
    altEs: '', altEn: '', media: '', mediaAfter: '', author: '', code: '', language: '',
  };
}

/** Whether a chapter has what its type needs to be shown; incomplete ones are dropped on save. */
export function chapterHasContent(chapter: ProjectChapter): boolean {
  const filled = (value: string) => value.trim() !== '';
  switch (chapter.type) {
    case 'text': return filled(chapter.titleEs) || filled(chapter.titleEn) || filled(chapter.bodyEs) || filled(chapter.bodyEn);
    case 'image': return filled(chapter.media);
    case 'compare': return filled(chapter.media) && filled(chapter.mediaAfter);
    case 'quote': return filled(chapter.bodyEs) || filled(chapter.bodyEn);
    case 'code': return filled(chapter.code);
    case 'model': return filled(chapter.media);
  }
}

export function emptyFacts(): ProjectFacts {
  return { year: '', durationEs: '', durationEn: '', roleEs: '', roleEn: '', client: '', team: '' };
}

export function emptyStory(): ProjectStory {
  return { challengeEs: '', challengeEn: '', approachEs: '', approachEn: '', outcomeEs: '', outcomeEn: '' };
}

export function emptyDetails(): ProjectDetails {
  return { featured: false, facts: emptyFacts(), story: emptyStory(), results: [], screens: [], gallery: [], improvements: [], docs: [], versions: [], videos: [], chapters: [], mediaFocus: DEFAULT_MEDIA_FOCUS, sectionOrder: [] };
}

// ---- Row mapping (jsonb keys are snake_case, like `experience.subprojects`) ----

type Json = Record<string, unknown>;

const text = (source: Json, key: string): string => (typeof source[key] === 'string' ? (source[key] as string) : '');
const list = (value: unknown): Json[] => (Array.isArray(value) ? value.filter((item): item is Json => !!item && typeof item === 'object') : []);
const object = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {});

/** Maps a camelCase field list to snake_case keys: titleEs -> title_es. */
const snake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function readItem<T>(source: Json, keys: (keyof T & string)[]): T {
  return Object.fromEntries(keys.map((key) => [key, text(source, snake(key))])) as T;
}

function writeItem<T extends object>(item: T): Json {
  return Object.fromEntries(Object.entries(item).map(([key, value]) => [snake(key), typeof value === 'string' ? value.trim() : value]));
}

/** An item is kept only if some text field has content (ignores the status selector). */
function hasContent(item: object): boolean {
  return Object.entries(item).some(([key, value]) => key !== 'status' && typeof value === 'string' && value.trim() !== '');
}

const FACT_KEYS: (keyof ProjectFacts)[] = ['year', 'durationEs', 'durationEn', 'roleEs', 'roleEn', 'client', 'team'];
const RESULT_KEYS: (keyof ProjectResult)[] = ['value', 'labelEs', 'labelEn', 'contextEs', 'contextEn'];
const SCREEN_KEYS: (keyof ProjectScreen)[] = ['titleEs', 'titleEn', 'descEs', 'descEn', 'video', 'image'];
const PHOTO_KEYS: (keyof ProjectPhoto)[] = ['image', 'captionEs', 'captionEn'];
const DOC_KEYS: (keyof ProjectDoc)[] = ['titleEs', 'titleEn', 'file', 'url'];
const VERSION_KEYS: (keyof ProjectVersion)[] = ['version', 'date', 'notesEs', 'notesEn'];
const STORY_KEYS: (keyof ProjectStory)[] = ['challengeEs', 'challengeEn', 'approachEs', 'approachEn', 'outcomeEs', 'outcomeEn'];
const VIDEO_KEYS: (keyof ProjectVideo)[] = ['titleEs', 'titleEn', 'descEs', 'descEn', 'video', 'poster', 'preview', 'duration'];
const CHAPTER_TEXT_KEYS = ['titleEs', 'titleEn', 'bodyEs', 'bodyEn', 'captionEs', 'captionEn', 'altEs', 'altEn', 'media', 'mediaAfter', 'author', 'code', 'language'] as const;

/** Unknown types are skipped (a newer admin, or a hand-edited row, must not break the page). */
function readChapters(value: unknown): ProjectChapter[] {
  return list(value).flatMap((item) => {
    const type = text(item, 'type') as ChapterType;
    if (!CHAPTER_TYPES.includes(type)) return [];
    const layout: ChapterLayout = text(item, 'layout') === 'full' ? 'full' : 'contained';
    return [{ ...readItem<Omit<ProjectChapter, 'type' | 'layout'>>(item, [...CHAPTER_TEXT_KEYS]), type, layout }];
  });
}

export function detailsFromRow(row: Json): ProjectDetails {
  return {
    featured: row['featured'] === true,
    facts: readItem<ProjectFacts>(object(row['facts']), FACT_KEYS),
    story: readItem<ProjectStory>(object(row['facts']), STORY_KEYS),
    results: list(row['results']).map((item) => readItem<ProjectResult>(item, RESULT_KEYS)),
    screens: list(row['screens']).map((item) => readItem<ProjectScreen>(item, SCREEN_KEYS)),
    gallery: list(row['gallery']).map((item) => readItem<ProjectPhoto>(item, PHOTO_KEYS)),
    improvements: list(row['improvements']).map((item) => {
      const status = text(item, 'status') as ImprovementStatus;
      return { textEs: text(item, 'text_es'), textEn: text(item, 'text_en'), status: IMPROVEMENT_STATUSES.includes(status) ? status : 'planned' };
    }),
    docs: list(row['docs']).map((item) => readItem<ProjectDoc>(item, DOC_KEYS)),
    versions: list(row['versions']).map((item) => readItem<ProjectVersion>(item, VERSION_KEYS)),
    videos: list(row['videos']).map((item) => readItem<ProjectVideo>(item, VIDEO_KEYS)),
    chapters: readChapters(row['chapters']),
    mediaFocus: MEDIA_FOCUS_POINTS.includes(text(object(row['facts']), 'media_focus')) ? text(object(row['facts']), 'media_focus') : DEFAULT_MEDIA_FOCUS,
    sectionOrder: text(object(row['facts']), 'section_order').split(',').map((id) => id.trim()).filter((id) => PAGE_SECTIONS.some((s) => s.id === id)),
  };
}

export function detailsToRow(details: ProjectDetails): Json {
  const items = <T extends object>(values: T[]): Json[] => values.filter(hasContent).map(writeItem);
  return {
    featured: details.featured,
    // The story shares the facts column (no migration): its keys never collide with the fact keys.
    facts: { ...writeItem(details.facts), ...writeItem(details.story), media_focus: details.mediaFocus || DEFAULT_MEDIA_FOCUS, section_order: details.sectionOrder.join(',') },
    results: items(details.results),
    screens: items(details.screens),
    gallery: details.gallery.filter((photo) => photo.image.trim()).map(writeItem),
    improvements: items(details.improvements),
    docs: details.docs.filter((doc) => doc.file.trim() || doc.url.trim()).map(writeItem),
    versions: items(details.versions),
    videos: details.videos.filter((video) => video.video.trim()).map(writeItem),
    chapters: details.chapters.filter(chapterHasContent).map(writeItem),
  };
}

// ---- Lists ----

const lower = (values: string[]): string[] => values.map((value) => value.toLowerCase());

/** Other projects sharing technologies, most shared first; none if nothing is shared. */
export function relatedProjects(project: Project, all: Project[], max = 3): Project[] {
  const own = new Set(lower(project.stack));
  return all
    .filter((other) => other.id !== project.id)
    .map((other, index) => ({ other, index, shared: lower(other.stack).filter((tech) => own.has(tech)).length }))
    .filter((entry) => entry.shared > 0)
    .sort((x, y) => y.shared - x.shared || x.index - y.index)
    .slice(0, max)
    .map((entry) => entry.other);
}

/** Home page: the featured projects, or all of them while none is marked. */
export function homeProjects(all: Project[]): Project[] {
  const featured = all.filter((project) => project.featured);
  return featured.length ? featured : all;
}

export interface ProjectFilters {
  type?: Project['type'] | 'all';
  status?: Project['status'] | 'all';
  tech?: string;
  query?: string;
}

export function filterProjects(all: Project[], filters: ProjectFilters): Project[] {
  const tech = filters.tech?.toLowerCase() ?? '';
  const query = filters.query?.trim().toLowerCase() ?? '';
  return all.filter((project) => {
    if (filters.type && filters.type !== 'all' && project.type !== filters.type) return false;
    if (filters.status && filters.status !== 'all' && project.status !== filters.status) return false;
    if (tech && !lower(project.stack).includes(tech)) return false;
    if (query) {
      const haystack = [project.name, project.typeLabel, project.summaryEs, project.summaryEn, ...project.stack].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Every technology used across the list, deduplicated case-insensitively, alphabetical. */
export function allTechnologies(all: Project[]): string[] {
  const seen = new Map<string, string>();
  for (const tech of all.flatMap((project) => project.stack)) {
    if (!seen.has(tech.toLowerCase())) seen.set(tech.toLowerCase(), tech);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
