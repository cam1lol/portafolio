import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { TranslocoService, Translation } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { SiteContentRow, SiteContentService } from '../../../core/data/site-content.service';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { SITE_TEXT_GROUPS, SiteTextField, SiteTextGroup } from './site-texts.config';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-admin-site-texts',
  standalone: true,
  imports: [ReactiveFormsModule, UpperCasePipe],
  templateUrl: './admin-site-texts.component.html',
  styleUrl: './admin-site-texts.component.css',
})
export class AdminSiteTextsComponent implements OnInit {
  private readonly siteContent = inject(SiteContentService);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly groups = SITE_TEXT_GROUPS;
  protected readonly forms: Record<string, FormGroup<Record<string, FormControl<string>>>> = {};
  protected readonly saveState = signal<Record<string, SaveState>>({});
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  private translations: Record<'es' | 'en', Translation> = { es: {}, en: {} };

  constructor() {
    for (const group of this.groups) {
      const form = new FormGroup<Record<string, FormControl<string>>>({});
      for (const field of group.fields) {
        for (const column of this.columnsOf(field)) {
          form.addControl(column, new FormControl('', { nonNullable: true, validators: this.validatorsFor(field) }));
        }
      }
      this.forms[group.id] = form;
    }
  }

  ngOnInit(): void {
    forkJoin({
      es: this.transloco.load('es'),
      en: this.transloco.load('en'),
      rows: this.siteContent.getAll(),
    }).subscribe({
      next: ({ es, en, rows }) => {
        this.translations = { es, en };
        this.fill(rows);
        this.loading.set(false);
        this.scrollToFragment();
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los textos. Si es la primera vez, aplica la migración 0005_site_content.sql en Supabase.');
        this.loading.set(false);
      },
    });
  }

  protected columnsOf(field: SiteTextField): string[] {
    return field.bilingual ? [`${field.key}_es`, `${field.key}_en`] : [field.key];
  }

  protected hasError(groupId: string, column: string): boolean {
    const control = this.forms[groupId].controls[column];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorText(field: SiteTextField, groupId: string, column: string): string {
    const control = this.forms[groupId].controls[column];
    if (control.hasError('maxlength')) return `Máximo ${field.maxLength} caracteres.`;
    if (control.hasError('pattern')) return field.kind === 'number' ? 'Solo números enteros.' : 'Escribe un email válido.';
    return 'Contiene caracteres no permitidos.';
  }

  /** Current i18n value shown as a reference for fields that are not prefilled. */
  protected reference(field: SiteTextField): string {
    if (!field.referenceI18nKey) return '';
    const es = String(this.translations.es[field.referenceI18nKey] ?? '');
    const en = String(this.translations.en[field.referenceI18nKey] ?? '');
    return es === en ? es : `ES: ${es} · EN: ${en}`;
  }

  hasUnsavedChanges(): boolean {
    return Object.values(this.forms).some((form) => form.dirty);
  }

  save(group: SiteTextGroup): void {
    const form = this.forms[group.id];
    form.markAllAsTouched();
    if (form.invalid) {
      this.setState(group.id, 'error');
      return;
    }

    const rows: SiteContentRow[] = group.fields.map((field) => {
      if (field.bilingual) {
        return {
          key: field.key,
          value_es: form.controls[`${field.key}_es`].value.trim(),
          value_en: form.controls[`${field.key}_en`].value.trim(),
        };
      }
      const value = form.controls[field.key].value.trim();
      return { key: field.key, value_es: value, value_en: value };
    });

    this.setState(group.id, 'saving');
    this.siteContent.saveMany(rows).subscribe({
      next: () => {
        form.markAsPristine();
        this.setState(group.id, 'saved');
        this.toast.show(`${group.title}: textos guardados.`);
      },
      error: () => {
        this.setState(group.id, 'error');
        this.toast.show('No se pudieron guardar los textos.', 'error');
      },
    });
  }

  private fill(rows: SiteContentRow[]): void {
    const byKey = new Map(rows.map((row) => [row.key, row]));
    for (const group of this.groups) {
      const form = this.forms[group.id];
      for (const field of group.fields) {
        const row = byKey.get(field.key);
        if (field.bilingual) {
          form.controls[`${field.key}_es`].setValue(this.initialValue(field, row?.value_es, 'es'));
          form.controls[`${field.key}_en`].setValue(this.initialValue(field, row?.value_en, 'en'));
        } else {
          form.controls[field.key].setValue(this.initialValue(field, row?.value_es, 'es'));
        }
      }
      form.markAsPristine();
    }
  }

  /** Prefill with what the public page shows today: Supabase, then i18n, then the static fallback. */
  private initialValue(field: SiteTextField, stored: string | undefined, lang: 'es' | 'en'): string {
    if (stored?.trim()) return stored;
    if (field.referenceI18nKey) return '';
    const translated = this.translations[lang][field.key];
    if (typeof translated === 'string' && translated) return translated;
    return field.fallback ?? '';
  }

  private validatorsFor(field: SiteTextField): ValidatorFn[] {
    const validators: ValidatorFn[] = [
      Validators.maxLength(field.maxLength),
      noControlCharsValidator({ allowNewlines: field.multiline }),
    ];
    if (field.kind === 'number') validators.push(Validators.pattern(/^\d+$/));
    if (field.kind === 'email') validators.push(Validators.pattern(EMAIL_PATTERN));
    return validators;
  }

  private setState(groupId: string, state: SaveState): void {
    this.saveState.update((current) => ({ ...current, [groupId]: state }));
  }

  scrollTo(groupId: string): void {
    const target = (this.host.nativeElement as HTMLElement).querySelector(`#group-${CSS.escape(groupId)}`);
    target?.scrollIntoView({ block: 'start' });
  }

  /** "EDITAR" in Estructura de portada links here with `#hero`, `#manifesto`, `#contact`. */
  private scrollToFragment(): void {
    const fragment = this.route.snapshot.fragment;
    if (fragment) queueMicrotask(() => this.scrollTo(fragment));
  }
}
