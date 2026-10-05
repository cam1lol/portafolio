import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { AdminProject, ProjectInput, ProjectsService } from '../../../core/data/projects.service';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';

const NAME_MAX = 120;
const ICON_MAX = 60;
const TYPE_LABEL_MAX = 60;
const SUMMARY_MAX = 300;
const LONG_MAX = 4000;
const LIST_ITEM_MAX = 300;
const URL_MAX = 2000;

function requiredTextValidators(maxLength: number) {
  return [Validators.required, Validators.maxLength(maxLength), noControlCharsValidator()];
}

function optionalTextValidators(maxLength: number) {
  return [Validators.maxLength(maxLength), noControlCharsValidator()];
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
  imports: [ReactiveFormsModule, RouterLink, ImageUploadComponent],
  templateUrl: './admin-project-form.component.html',
  styleUrl: './admin-project-form.component.css',
})
export class AdminProjectFormComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: requiredTextValidators(NAME_MAX) }),
    type: new FormControl<'web' | '3d' | 'tool'>('web', { nonNullable: true, validators: [Validators.required] }),
    kind: new FormControl<'front' | 'back'>('front', { nonNullable: true, validators: [Validators.required] }),
    device: new FormControl<'browser' | 'phone' | ''>('', { nonNullable: true }),
    status: new FormControl<'live' | 'wip' | 'archive'>('wip', { nonNullable: true, validators: [Validators.required] }),
    icon: new FormControl('', { nonNullable: true, validators: requiredTextValidators(ICON_MAX) }),
    typeLabel: new FormControl('', { nonNullable: true, validators: requiredTextValidators(TYPE_LABEL_MAX) }),
    summaryEs: new FormControl('', { nonNullable: true, validators: requiredTextValidators(SUMMARY_MAX) }),
    summaryEn: new FormControl('', { nonNullable: true, validators: requiredTextValidators(SUMMARY_MAX) }),
    longEs: new FormControl('', { nonNullable: true, validators: optionalTextValidators(LONG_MAX) }),
    longEn: new FormControl('', { nonNullable: true, validators: optionalTextValidators(LONG_MAX) }),
    previewImage: new FormControl('', { nonNullable: true, validators: optionalTextValidators(URL_MAX) }),
    repoUrl: new FormControl('', { nonNullable: true, validators: optionalTextValidators(URL_MAX) }),
    liveUrl: new FormControl('', { nonNullable: true, validators: optionalTextValidators(URL_MAX) }),
    published: new FormControl(false, { nonNullable: true }),
    highlightsEs: new FormArray<FormControl<string>>([]),
    highlightsEn: new FormArray<FormControl<string>>([]),
    stack: new FormArray<FormControl<string>>([]),
  });

  protected readonly isEditMode = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  private projectId: string | null = null;

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
    });

    this.setListValues(this.highlightsEs, row.highlightsEs);
    this.setListValues(this.highlightsEn, row.highlightsEn);
    this.setListValues(this.stack, row.stack);
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
  }

  removeHighlightEs(index: number): void {
    this.highlightsEs.removeAt(index);
  }

  addHighlightEn(): void {
    this.highlightsEn.push(listItemControl());
  }

  removeHighlightEn(index: number): void {
    this.highlightsEn.removeAt(index);
  }

  addStackItem(): void {
    this.stack.push(listItemControl());
  }

  removeStackItem(index: number): void {
    this.stack.removeAt(index);
  }

  onPreviewImageChange(url: string): void {
    this.form.controls.previewImage.setValue(url);
  }

  hasError(controlName: keyof typeof this.form.controls, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(error);
  }

  listControlErrors(array: FormArray<FormControl<string>>, index: number): ValidationErrors | null {
    const control = array.at(index);
    return control.touched ? control.errors : null;
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.errorMessage.set('Revisa los campos marcados antes de guardar.');
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
        this.router.navigateByUrl('/admin/projects');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar el proyecto.');
      },
    });
  }
}
