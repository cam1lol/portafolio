import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { MediaPickerComponent, MediaUpload } from '../../../shared/media-picker/media-picker.component';
import { isValidSlug, slugify } from '../../../shared/media/project-media';
import { HasUnsavedChanges } from '../shared/unsaved-changes.guard';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { AdminProject, ProjectInput, ProjectsService } from '../../../core/data/projects.service';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { FormStep, FormStepsComponent } from '../shared/form-steps.component';
import { FieldHintComponent } from '../shared/field-hint.component';
import { TagInputComponent } from '../shared/tag-input.component';
import { focusFirstInvalid } from '../shared/focus-first-invalid';
import { RepeatHeadComponent } from '../shared/repeat-head.component';
import { IconPickerComponent } from '../shared/icon-picker.component';
import {
  MAX_ITEMS, detailControls, docGroup, improvementGroup, moveItem, patchDetails, photoGroup, readDetails,
  resultGroup, screenGroup, versionGroup, videoGroup, fillToCount,
} from './project-details.form';
import { IMPROVEMENT_STATUSES } from '../../../core/data/project-details';

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
    ReactiveFormsModule, RouterLink, ImageUploadComponent, MediaPickerComponent,
    FormStepsComponent, FieldHintComponent, TagInputComponent, RepeatHeadComponent, IconPickerComponent,
  ],
  templateUrl: './admin-project-form.component.html',
  styleUrls: ['../shared/admin-form.css', './admin-project-form.component.css'],
})
export class AdminProjectFormComponent implements OnInit, HasUnsavedChanges {
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);

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
    repoUrl: new FormControl('', { nonNullable: true, validators: optionalTextValidators(URL_MAX) }),
    liveUrl: new FormControl('', { nonNullable: true, validators: optionalTextValidators(URL_MAX) }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, (c) => (isValidSlug(c.value) ? null : { slug: true })] }),
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
  protected readonly steps: FormStep[] = [
    { id: 'step-content', label: 'Contenido', controls: [this.c.name, this.c.summaryEs, this.c.summaryEn, this.c.longEs, this.c.longEn, this.c.caseStudyEs, this.c.caseStudyEn, this.c.highlightsEs, this.c.highlightsEn] },
    { id: 'step-media', label: 'Medios', controls: [this.c.typeLabel, this.c.icon, this.c.stack, this.c.slug, this.c.previewImage, this.c.repoUrl, this.c.liveUrl] },
    { id: 'step-facts', label: 'Ficha', controls: [this.c.facts, this.c.results] },
    { id: 'step-videos', label: 'Videos', controls: [this.c.videos] },
    { id: 'step-screens', label: 'Pantallas', controls: [this.c.screens, this.c.gallery] },
    { id: 'step-extras', label: 'Extras', controls: [this.c.improvements, this.c.docs, this.c.versions] },
    { id: 'step-publish', label: 'Publicación', controls: [this.c.published, this.c.featured] },
  ];
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
    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugEdited) this.form.controls.slug.setValue(slugify(name));
    });
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
    if (id) {
      this.projectId = id;
      this.isEditMode.set(true);
      this.loadExisting(id);
    }
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
    fillToCount(this.form.controls.videos, this.videoCount(), videoGroup);
  }

  addItem(list: DetailList): void {
    const array = this.form.controls[list] as unknown as FormArray<FormGroup>;
    if (array.length >= MAX_ITEMS) return;
    array.push(LIST_FACTORIES[list]() as unknown as FormGroup);
    array.markAsDirty();
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
      focusFirstInvalid(this.host.nativeElement);
      return;
    }

    const value = this.form.getRawValue();
    const payload: ProjectInput = {
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
        this.toast.show('Proyecto guardado.');
        this.router.navigateByUrl('/admin/projects');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar el proyecto.');
      },
    });
  }
}
