import { Component, OnInit, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { CollectionValues, CollectionsService } from '../../../core/data/collections.service';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { COLLECTIONS, CollectionConfig, CollectionField, collectionColumns } from './collection.config';

/** Create/edit screen shared by every simple collection, built from its `CollectionConfig`. */
@Component({
  selector: 'app-admin-collection-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UpperCasePipe],
  templateUrl: './admin-collection-form.component.html',
  styleUrl: './admin-collection-form.component.css',
})
export class AdminCollectionFormComponent implements OnInit {
  private readonly collections = inject(CollectionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly config: CollectionConfig = COLLECTIONS[this.route.snapshot.data['collection']];
  protected readonly form = new FormGroup<Record<string, FormControl<string>>>({});
  protected readonly published = new FormControl(true, { nonNullable: true });

  protected readonly isEditMode = signal(false);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  private rowId: string | null = null;

  constructor() {
    for (const field of this.config.fields) {
      for (const column of this.columnsOf(field)) {
        this.form.addControl(column, new FormControl('', { nonNullable: true, validators: this.validatorsFor(field) }));
      }
    }
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
    return 'Contiene caracteres no permitidos.';
  }

  hasUnsavedChanges(): boolean {
    return (this.form.dirty || this.published.dirty) && !this.submitting();
  }

  submit(): void {
    this.errorMessage.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set('Revisa los campos marcados antes de guardar.');
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

  private validatorsFor(field: CollectionField): ValidatorFn[] {
    const validators = [Validators.maxLength(field.maxLength), noControlCharsValidator({ allowNewlines: field.multiline })];
    return field.required ? [Validators.required, ...validators] : validators;
  }
}
