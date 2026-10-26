import { FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import {
  ImprovementStatus,
  ProjectDetails,
  ProjectDoc,
  ProjectFacts,
  ProjectImprovement,
  ProjectPhoto,
  ProjectResult,
  ProjectScreen,
  ProjectVersion,
  ProjectVideo,
  emptyFacts,
} from '../../../core/data/project-details';

/** Form controls for the optional detail sections of a project (0010). Every field may stay empty. */

const SHORT = 80;
const TITLE = 120;
const CAPTION = 300;
const NOTE = 600;
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
  });
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
  });
}

/**
 * "How many videos": adds empty slots until the list has `count` items. Never removes, so lowering
 * the number cannot wipe filled videos; those are removed one by one with QUITAR.
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
    results: new FormArray<ResultGroup>([]),
    screens: new FormArray<ScreenGroup>([]),
    gallery: new FormArray<PhotoGroup>([]),
    improvements: new FormArray<ImprovementGroup>([]),
    docs: new FormArray<DocGroup>([]),
    versions: new FormArray<VersionGroup>([]),
    videos: new FormArray<VideoGroup>([]),
  };
}

type DetailControls = ReturnType<typeof detailControls>;

function fill<G extends FormGroup, T>(array: FormArray<G>, items: T[], create: (item: T) => G): void {
  array.clear();
  for (const item of items) array.push(create(item));
}

/** Loads saved details into the form (edit mode). */
export function patchDetails(controls: DetailControls, details: ProjectDetails): void {
  controls.featured.setValue(details.featured);
  controls.facts.setValue(details.facts);
  fill(controls.results, details.results, resultGroup);
  fill(controls.screens, details.screens, screenGroup);
  fill(controls.gallery, details.gallery, photoGroup);
  fill(controls.improvements, details.improvements, improvementGroup);
  fill(controls.docs, details.docs, docGroup);
  fill(controls.versions, details.versions, versionGroup);
  fill(controls.videos, details.videos, videoGroup);
}

/** Reads the form back as `ProjectDetails` (empty items are dropped by the service mapping). */
export function readDetails(controls: DetailControls): ProjectDetails {
  return {
    featured: controls.featured.value,
    facts: controls.facts.getRawValue(),
    results: controls.results.getRawValue(),
    screens: controls.screens.getRawValue(),
    gallery: controls.gallery.getRawValue(),
    improvements: controls.improvements.getRawValue(),
    docs: controls.docs.getRawValue(),
    versions: controls.versions.getRawValue(),
    videos: controls.videos.getRawValue(),
  };
}

/** Moves an item up (-1) or down (+1) and marks the form dirty. */
export function moveItem(array: FormArray, index: number, delta: -1 | 1): void {
  const target = index + delta;
  if (target < 0 || target >= array.length) return;
  const item = array.at(index);
  array.removeAt(index, { emitEvent: false });
  array.insert(target, item);
  array.markAsDirty();
}
