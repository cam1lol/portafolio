import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators, } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { AdminExperience, ExperienceInput, ExperienceService } from '../../../core/data/experience.service';

const COMPANY_MAX = 120;
const ROLE_MAX = 120;
const PERIOD_MAX = 60;
const TAG_MAX = 60;
const SUMMARY_MAX = 600;
const LIST_ITEM_MAX = 300;
const SUBPROJECT_NAME_MAX = 120;
const SUBPROJECT_DESC_MAX = 400;

function requiredTextValidators(maxLength: number) {
  return [Validators.required, Validators.maxLength(maxLength), noControlCharsValidator()];
}

type SubprojectGroup = FormGroup<{
  name: FormControl<string>;
  descEs: FormControl<string>;
  descEn: FormControl<string>;
}>;

function subprojectGroup(name = '', descEs = '', descEn = ''): SubprojectGroup {
  return new FormGroup({
    name: new FormControl(name, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(SUBPROJECT_NAME_MAX), noControlCharsValidator()],
    }),
    descEs: new FormControl(descEs, {
      nonNullable: true,
      validators: [Validators.maxLength(SUBPROJECT_DESC_MAX), noControlCharsValidator()],
    }),
    descEn: new FormControl(descEn, {
      nonNullable: true,
      validators: [Validators.maxLength(SUBPROJECT_DESC_MAX), noControlCharsValidator()],
    }),
  });
}

function listItemControl(value = ''): FormControl<string> {
  return new FormControl(value, {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(LIST_ITEM_MAX), noControlCharsValidator()],
  });
}

@Component({
  selector: 'app-admin-experience-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-experience-form.component.html',
  styleUrl: './admin-experience-form.component.css',
})
export class AdminExperienceFormComponent implements OnInit {
  private readonly experienceService = inject(ExperienceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    company: new FormControl('', { nonNullable: true, validators: requiredTextValidators(COMPANY_MAX) }),
    roleEs: new FormControl('', { nonNullable: true, validators: requiredTextValidators(ROLE_MAX) }),
    roleEn: new FormControl('', { nonNullable: true, validators: requiredTextValidators(ROLE_MAX) }),
    periodEs: new FormControl('', { nonNullable: true, validators: requiredTextValidators(PERIOD_MAX) }),
    periodEn: new FormControl('', { nonNullable: true, validators: requiredTextValidators(PERIOD_MAX) }),
    tagEs: new FormControl('', { nonNullable: true, validators: requiredTextValidators(TAG_MAX) }),
    tagEn: new FormControl('', { nonNullable: true, validators: requiredTextValidators(TAG_MAX) }),
    isCurrent: new FormControl(false, { nonNullable: true }),
    summaryEs: new FormControl('', { nonNullable: true, validators: requiredTextValidators(SUMMARY_MAX) }),
    summaryEn: new FormControl('', { nonNullable: true, validators: requiredTextValidators(SUMMARY_MAX) }),
    published: new FormControl(false, { nonNullable: true }),
    pointsEs: new FormArray<FormControl<string>>([]),
    pointsEn: new FormArray<FormControl<string>>([]),
    stack: new FormArray<FormControl<string>>([]),
    subprojects: new FormArray<SubprojectGroup>([]),
  });

  protected readonly isEditMode = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  private experienceId: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.experienceId = id;
      this.isEditMode.set(true);
      this.loadExisting(id);
    }
  }

  private loadExisting(id: string): void {
    this.loading.set(true);
    this.experienceService.getById(id).subscribe({
      next: (row) => {
        this.loading.set(false);
        if (!row) {
          this.errorMessage.set('No se encontró esa experiencia.');
          return;
        }
        this.patchForm(row);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar la experiencia.');
      },
    });
  }

  private patchForm(row: AdminExperience): void {
    this.form.patchValue({
      company: row.company,
      roleEs: row.roleEs,
      roleEn: row.roleEn,
      periodEs: row.periodEs,
      periodEn: row.periodEn,
      tagEs: row.tagEs,
      tagEn: row.tagEn,
      isCurrent: row.isCurrent,
      summaryEs: row.summaryEs,
      summaryEn: row.summaryEn,
      published: row.published,
    });

    this.setListValues(this.pointsEs, row.pointsEs);
    this.setListValues(this.pointsEn, row.pointsEn);
    this.setListValues(this.stack, row.stack);

    this.subprojects.clear();
    for (const sub of row.subprojects ?? []) {
      this.subprojects.push(subprojectGroup(sub.name, sub.descEs, sub.descEn));
    }
  }

  private setListValues(array: FormArray<FormControl<string>>, values: string[]): void {
    array.clear();
    for (const value of values) {
      array.push(listItemControl(value));
    }
  }

  get pointsEs(): FormArray<FormControl<string>> {
    return this.form.controls.pointsEs;
  }

  get pointsEn(): FormArray<FormControl<string>> {
    return this.form.controls.pointsEn;
  }

  get stack(): FormArray<FormControl<string>> {
    return this.form.controls.stack;
  }

  get subprojects(): FormArray<SubprojectGroup> {
    return this.form.controls.subprojects;
  }

  addPointEs(): void {
    this.pointsEs.push(listItemControl());
  }

  removePointEs(index: number): void {
    this.pointsEs.removeAt(index);
  }

  addPointEn(): void {
    this.pointsEn.push(listItemControl());
  }

  removePointEn(index: number): void {
    this.pointsEn.removeAt(index);
  }

  addStackItem(): void {
    this.stack.push(listItemControl());
  }

  removeStackItem(index: number): void {
    this.stack.removeAt(index);
  }

  addSubproject(): void {
    this.subprojects.push(subprojectGroup());
  }

  removeSubproject(index: number): void {
    this.subprojects.removeAt(index);
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
    this.subprojects.controls.forEach((group) => group.markAllAsTouched());

    if (this.form.invalid) {
      this.errorMessage.set('Revisa los campos marcados antes de guardar.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: ExperienceInput = {
      company: value.company.trim(),
      roleEs: value.roleEs.trim(),
      roleEn: value.roleEn.trim(),
      periodEs: value.periodEs.trim(),
      periodEn: value.periodEn.trim(),
      tagEs: value.tagEs.trim(),
      tagEn: value.tagEn.trim(),
      isCurrent: value.isCurrent,
      summaryEs: value.summaryEs.trim(),
      summaryEn: value.summaryEn.trim(),
      published: value.published,
      pointsEs: value.pointsEs.map((p) => p.trim()),
      pointsEn: value.pointsEn.map((p) => p.trim()),
      stack: value.stack.map((s) => s.trim()),
      subprojects: value.subprojects.length
        ? value.subprojects.map((sub) => ({
            name: sub.name.trim(),
            descEs: sub.descEs.trim(),
            descEn: sub.descEn.trim(),
          }))
        : undefined,
    };

    this.saving.set(true);
    this.errorMessage.set('');

    const request$ = this.isEditMode() && this.experienceId
      ? this.experienceService.update(this.experienceId, payload)
      : this.experienceService.create(payload);

    request$.subscribe({
      next: (result) => {
        this.saving.set(false);
        if (!result) {
          this.errorMessage.set('No se pudo guardar la experiencia.');
          return;
        }
        this.router.navigateByUrl('/admin/experience');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar la experiencia.');
      },
    });
  }
}
