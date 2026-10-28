import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { CollectionValues, CollectionsService } from '../../../core/data/collections.service';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { COLLECTIONS, CollectionConfig, CollectionField, collectionColumns } from './collection.config';
import { FormStep, FormStepsComponent } from '../shared/form-steps.component';
import { FieldHintComponent } from '../shared/field-hint.component';
import { focusFirstInvalid } from '../shared/focus-first-invalid';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { MediaPickerComponent, MediaUpload } from '../../../shared/media-picker/media-picker.component';

/** Create/edit screen shared by every simple collection, built from its `CollectionConfig`. */
@Component({
  selector: 'app-admin-collection-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UpperCasePipe, FormStepsComponent, FieldHintComponent, ImageUploadComponent, MediaPickerComponent],
  templateUrl: './admin-collection-form.component.html',
  styleUrls: ['../shared/admin-form.css', './admin-collection-form.component.css'],
})
export class AdminCollectionFormComponent implements OnInit {
  private readonly collections = inject(CollectionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly config: CollectionConfig = COLLECTIONS[this.route.snapshot.data['collection']];
  protected readonly form = new FormGroup<Record<string, FormControl<string>>>({});
  protected readonly published = new FormControl(true, { nonNullable: true });

  protected readonly steps: FormStep[];

  protected readonly isEditMode = signal(false);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  private rowId: string | null = null;

  constructor() {
    for (const field of this.config.fields) {
      for (const column of this.columnsOf(field)) {
        this.form.addControl(column, new FormControl(this.initialValue(field), { nonNullable: true, validators: this.validatorsFor(field, column) }));
      }
    }
    this.steps = [
      { id: 'step-content', label: 'Contenido', controls: Object.values(this.form.controls) },
      { id: 'step-publish', label: 'Publicación', controls: [this.published] },
    ];
  }

  ngOnInit(): void {
    this.rowId = this.route.snapshot.paramMap.get('id');
    if (!this.rowId) return;

    this.isEditMode.set(true);
    this.loading.set(true);
    this.collections.getById(this.config.table, this.rowId).subscribe({
      next: (row) => {
        this.loading.set(false);
        if (!row) {
          this.errorMessage.set('No se encontró este elemento. Puede que ya se haya eliminado.');
          return;
        }
        for (const column of collectionColumns(this.config)) {
          this.form.controls[column]?.setValue(String(row[column] ?? ''));
        }
        this.published.setValue(row.published !== false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar este elemento.');
      },
    });
  }

  protected columnsOf(field: CollectionField): string[] {
    return field.bilingual ? [`${field.name}_es`, `${field.name}_en`] : [field.name];
  }

  protected hasError(column: string): boolean {
    const control = this.form.controls[column];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected errorText(field: CollectionField, column: string): string {
    const control = this.form.controls[column];
    if (control?.hasError('required')) return 'Este campo es obligatorio.';
    if (control?.hasError('maxlength')) return `Máximo ${field.maxLength} caracteres.`;
    if (control?.hasError('pattern')) return 'Debe empezar por https:// o http://';
    return 'Contiene caracteres no permitidos.';
  }

  protected isRequired(field: CollectionField, column: string): boolean {
    return field.required === true || (field.required === 'es' && !column.endsWith('_en'));
  }

  /** New items start with the field default (first option of a select, today for a date). */
  private initialValue(field: CollectionField): string {
    if (field.defaultValue === 'today') return new Date().toISOString().slice(0, 10);
    return field.defaultValue ?? (field.kind === 'select' ? field.options?.[0]?.value ?? '' : '');
  }

  /** An uploaded video brings its poster: it fills the poster field if that one is still empty. */
  protected onVideoUploaded(field: CollectionField, upload: MediaUpload): void {
    if (!field.posterField || !upload.poster) return;
    const poster = this.form.controls[field.posterField];
    if (poster && !poster.value) this.setValue(field.posterField, upload.poster);
  }

  /** Values set by a widget instead of an input (image upload). */
  protected setValue(column: string, value: string): void {
    const control = this.form.controls[column];
    control.setValue(value);
    control.markAsDirty();
  }

  hasUnsavedChanges(): boolean {
    return (this.form.dirty || this.published.dirty) && !this.submitting();
  }

  submit(): void {
    this.errorMessage.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set('Revisa los campos marcados antes de guardar.');
      focusFirstInvalid(this.host.nativeElement);
      return;
    }

    const values: CollectionValues = { published: this.published.value };
    for (const [column, control] of Object.entries(this.form.controls)) {
      values[column] = control.value.trim();
    }

    this.submitting.set(true);
    const request = this.rowId
      ? this.collections.update(this.config.table, this.rowId, values)
      : this.collections.create(this.config.table, values);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.markAsPristine();
        this.published.markAsPristine();
        this.toast.show('Cambios guardados.');
        this.router.navigate(['/admin', this.config.path]);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('No se pudo guardar. Comprueba tu sesión de administrador e inténtalo de nuevo.');
      },
    });
  }

  private validatorsFor(field: CollectionField, column: string): ValidatorFn[] {
    const validators = [Validators.maxLength(field.maxLength), noControlCharsValidator({ allowNewlines: field.multiline })];
    if (field.kind === 'url') validators.push(Validators.pattern(/^https?:\/\/\S+$/));
    return this.isRequired(field, column) ? [Validators.required, ...validators] : validators;
  }
}
