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

export interface ProjectDetails {
  /** Shown on the home page; /proyectos shows every published project. */
  featured: boolean;
  facts: ProjectFacts;
  results: ProjectResult[];
  screens: ProjectScreen[];
  gallery: ProjectPhoto[];
  improvements: ProjectImprovement[];
  docs: ProjectDoc[];
  versions: ProjectVersion[];
  videos: ProjectVideo[];
}

export const IMPROVEMENT_STATUSES: ImprovementStatus[] = ['planned', 'in_progress', 'done'];

export function emptyFacts(): ProjectFacts {
  return { year: '', durationEs: '', durationEn: '', roleEs: '', roleEn: '', client: '', team: '' };
}

export function emptyDetails(): ProjectDetails {
  return { featured: false, facts: emptyFacts(), results: [], screens: [], gallery: [], improvements: [], docs: [], versions: [], videos: [] };
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
const VIDEO_KEYS: (keyof ProjectVideo)[] = ['titleEs', 'titleEn', 'descEs', 'descEn', 'video', 'poster', 'preview', 'duration'];

export function detailsFromRow(row: Json): ProjectDetails {
  return {
    featured: row['featured'] === true,
    facts: readItem<ProjectFacts>(object(row['facts']), FACT_KEYS),
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
  };
}

export function detailsToRow(details: ProjectDetails): Json {
  const items = <T extends object>(values: T[]): Json[] => values.filter(hasContent).map(writeItem);
  return {
    featured: details.featured,
    facts: writeItem(details.facts),
    results: items(details.results),
    screens: items(details.screens),
    gallery: details.gallery.filter((photo) => photo.image.trim()).map(writeItem),
    improvements: items(details.improvements),
    docs: details.docs.filter((doc) => doc.file.trim() || doc.url.trim()).map(writeItem),
    versions: items(details.versions),
    videos: details.videos.filter((video) => video.video.trim()).map(writeItem),
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
