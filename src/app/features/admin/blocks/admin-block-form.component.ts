import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { BlocksService } from '../../../core/data/blocks.service';
import { Block } from '../../../core/data/block.model';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { BlockDispatcherComponent } from '../../../shared/blocks/block-dispatcher.component';
import { ModelUploadComponent } from '../../../shared/model-upload/model-upload.component';
import { switchMap } from 'rxjs';
import { PageBlockPlacement, PageItemsService } from '../../../core/data/page-items.service';
import { ModelAsset, ModelAssetMetadata } from '../../../core/data/model-asset.model';
import { FormStep, FormStepsComponent } from '../shared/form-steps.component';
import { FieldHintComponent } from '../shared/field-hint.component';
import { focusFirstInvalid } from '../shared/focus-first-invalid';
import { SaveShortcutDirective } from '../shared/save-shortcut.directive';

const BLOCK_TYPES: Block['type'][] = ['hero', 'text', 'card_grid', 'roadmap', 'gallery_3d'];
const MAX_ITEMS = 12;

const TYPE_LABELS: Record<Block['type'], string> = {
  hero: 'Hero',
  card_grid: 'Grid de tarjetas',
  roadmap: 'Roadmap',
  text: 'Texto',
  gallery_3d: 'Galería 3D',
};

/** Se muestra en el catálogo de tipos (paso 1) para elegir por el propósito, no por el nombre. */
const TYPE_CATALOG: Record<Block['type'], { what: string; when: string }> = {
  hero: { what: 'Etiqueta, título grande y una introducción.', when: 'Para abrir un tema nuevo o destacar un mensaje.' },
  text: { what: 'Título opcional y un párrafo de texto.', when: 'Para explicar algo con calma.' },
  card_grid: { what: 'Título y de 1 a 12 tarjetas con título, descripción y etiqueta.', when: 'Para listar beneficios, pasos o capacidades.' },
  roadmap: { what: 'Título y de 1 a 12 etapas con fecha o estado.', when: 'Para planes, hitos o una línea de tiempo.' },
  gallery_3d: { what: 'Visor 3D interactivo con un modelo GLB y su atribución.', when: 'Para mostrar un objeto 3D que el visitante puede girar.' },
};

const AFTER_ITEM_PATTERN = /^after-item:(section:[a-z_]+|block:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const GLB_PATH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$/i;

type BlockItemForm = FormGroup<{
  when: FormControl<string>;
  whenEn: FormControl<string>;
  title: FormControl<string>;
  titleEn: FormControl<string>;
  description: FormControl<string>;
  descriptionEn: FormControl<string>;
  icon: FormControl<string>;
}>;

type BlockItemValue = Record<string, unknown>;

interface BlockEditorValue {
  type: Block['type'];
  page: string;
  title: string;
  titleEn: string;
  eyebrow: string;
  eyebrowEn: string;
  lead: string;
  leadEn: string;
  body: string;
  bodyEn: string;
  description: string;
  descriptionEn: string;
  modelPath: string;
  modelAuthor: string;
  modelLicense: string;
  modelHeight: 'compact' | 'standard' | 'tall';
  autoRotate: boolean;
  zoomEnabled: boolean;
  width: 'small' | 'medium' | 'wide' | 'full';
  alignment: 'left' | 'center' | 'right';
  background: 'transparent' | 'surface';
  backgroundOpacity: number;
  borderless: boolean;
  spacing: 'compact' | 'normal' | 'spacious';
  placement: PageBlockPlacement;
  published: boolean;
  items: Array<{
    when: string;
    whenEn: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    icon: string;
  }>;
}

function textControl(maxLength: number, multiline = false, value = ''): FormControl<string> {
  return new FormControl(value, {
    nonNullable: true,
    validators: [Validators.maxLength(maxLength), noControlCharsValidator({ allowNewlines: multiline })],
  });
}

@Component({
  selector: 'app-admin-block-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BlockDispatcherComponent, ModelUploadComponent, UpperCasePipe, FormStepsComponent, FieldHintComponent, SaveShortcutDirective],
  templateUrl: './admin-block-form.component.html',
  styleUrls: ['../shared/admin-form.css', './admin-block-form.component.css'],
})
export class AdminBlockFormComponent implements OnInit {
  private readonly blocksService = inject(BlocksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pageItems = inject(PageItemsService);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly types = BLOCK_TYPES;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly typeCatalog = TYPE_CATALOG;
  protected readonly maxItems = MAX_ITEMS;
  protected readonly placements: Array<{ value: PageBlockPlacement; label: string }> = [
    { value: 'end', label: 'Al final de la página' },
    { value: 'before:hero', label: 'Antes de la portada' }, { value: 'after:hero', label: 'Después de la portada' },
    { value: 'before:ticker', label: 'Antes de la franja' }, { value: 'after:ticker', label: 'Después de la franja' },
    { value: 'before:manifesto', label: 'Antes del manifiesto' }, { value: 'after:manifesto', label: 'Después del manifiesto' },
    { value: 'before:projects', label: 'Antes de proyectos' }, { value: 'after:projects', label: 'Después de proyectos' },
    { value: 'before:experience', label: 'Antes de experiencia' }, { value: 'after:experience', label: 'Después de experiencia' },
    { value: 'before:services', label: 'Antes de servicios' }, { value: 'after:services', label: 'Después de servicios' },
    { value: 'before:roadmap', label: 'Antes del roadmap' }, { value: 'after:roadmap', label: 'Después del roadmap' },
    { value: 'before:comments', label: 'Antes de comentarios' }, { value: 'after:comments', label: 'Después de comentarios' },
    { value: 'before:contact', label: 'Antes de contacto' },
  ];

  protected readonly form = new FormGroup({
    type: new FormControl<Block['type']>('text', { nonNullable: true }),
    page: new FormControl('home', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100), noControlCharsValidator()],
    }),
    title: textControl(120),
    titleEn: textControl(120),
    eyebrow: textControl(80),
    eyebrowEn: textControl(80),
    lead: textControl(300, true),
    leadEn: textControl(300, true),
    body: textControl(4000, true),
    bodyEn: textControl(4000, true),
    description: textControl(1000, true),
    descriptionEn: textControl(1000, true),
    modelPath: new FormControl('', { nonNullable: true }),
    modelAuthor: textControl(120),
    modelLicense: textControl(160),
    modelHeight: new FormControl<'compact' | 'standard' | 'tall'>('standard', { nonNullable: true }),
    autoRotate: new FormControl(true, { nonNullable: true }),
    zoomEnabled: new FormControl(true, { nonNullable: true }),
    width: new FormControl<'small' | 'medium' | 'wide' | 'full'>('medium', { nonNullable: true }),
    alignment: new FormControl<'left' | 'center' | 'right'>('left', { nonNullable: true }),
    background: new FormControl<'transparent' | 'surface'>('transparent', { nonNullable: true }),
    backgroundOpacity: new FormControl(35, { nonNullable: true }),
    borderless: new FormControl(true, { nonNullable: true }),
    spacing: new FormControl<'compact' | 'normal' | 'spacious'>('normal', { nonNullable: true }),
    placement: new FormControl<PageBlockPlacement>('end', { nonNullable: true }),
    published: new FormControl(false, { nonNullable: true }),
    items: new FormArray<BlockItemForm>([]),
  });

  private readonly c = this.form.controls;
  protected readonly steps: FormStep[] = [
    { id: 'step-content', label: 'Contenido', controls: [this.c.title, this.c.titleEn, this.c.eyebrow, this.c.eyebrowEn, this.c.lead, this.c.leadEn, this.c.body, this.c.bodyEn, this.c.description, this.c.descriptionEn, this.c.modelAuthor, this.c.modelLicense, this.c.items] },
    { id: 'step-layout', label: 'Ubicación y apariencia', controls: [this.c.page, this.c.placement] },
    { id: 'step-publish', label: 'Publicación', controls: [this.c.published] },
  ];

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isEditMode = signal(false);
  /** Paso 1 (catálogo) hasta elegir un tipo; se salta al editar o si llega `?type=`. */
  protected readonly typeChosen = signal(false);
  protected readonly previewLang = signal<'es' | 'en'>('es');

  private blockId: string | null = null;

  get items(): FormArray<BlockItemForm> {
    return this.form.controls.items;
  }

  get usesItems(): boolean {
    return this.form.controls.type.value === 'card_grid' || this.form.controls.type.value === 'roadmap';
  }

  get usesRoadmapItems(): boolean {
    return this.form.controls.type.value === 'roadmap';
  }

  ngOnInit(): void {
    this.blockId = this.route.snapshot.paramMap.get('id');
    if (!this.blockId) {
      this.applyCreateParams();
      return;
    }

    this.isEditMode.set(true);
    this.typeChosen.set(true);
    this.blocksService.getAll().subscribe({
      next: (blocks) => {
        const block = blocks.find((candidate) => candidate.id === this.blockId);
        if (!block) {
          this.errorMessage.set('Bloque no encontrado.');
          return;
        }
        this.loadBlock(block);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el bloque.');
      },
    });
  }

  chooseType(type: Block['type']): void {
    this.form.controls.type.setValue(type);
    if ((type === 'card_grid' || type === 'roadmap') && this.items.length === 0) {
      this.items.push(this.createItem());
    }
    this.typeChosen.set(true);
    this.errorMessage.set('');
  }

  /** Solo antes del primer guardado: el tipo de un bloque guardado queda fijo. */
  changeType(): void {
    if (this.isEditMode()) return;
    this.typeChosen.set(false);
  }

  addItem(): void {
    if (this.items.length >= MAX_ITEMS) {
      return;
    }
    this.items.push(this.createItem());
    this.form.markAsDirty();
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
    this.form.markAsDirty();
  }

  previewBlock(): Block {
    const value = this.form.getRawValue();
    return {
      id: 'admin-preview',
      type: value.type,
      page: value.page,
      config: this.toConfig(value),
      sortOrder: 0,
      published: value.published,
    };
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.submitting();
  }

  submit(): void {
    this.errorMessage.set('');

    const invalidFields = this.invalidVisibleFields();
    if (invalidFields.length > 0) {
      this.errorMessage.set(
        `Revisa ${invalidFields.join(', ')}: comprueba los límites de longitud y los caracteres permitidos.`,
      );
      focusFirstInvalid(this.host.nativeElement);
      return;
    }

    const configError = this.validateConfig();
    if (configError) {
      this.errorMessage.set(configError);
      return;
    }

    const value = this.form.getRawValue();
    const page = value.page.trim();
    const config = this.toConfig(value);
    this.submitting.set(true);

    if (this.blockId) {
      // El tipo queda fijo al crearlo, así que nunca va en la actualización.
      this.blocksService
        .update(this.blockId, { page, config, published: value.published })
        .pipe(switchMap(() => this.pageItems.placeBlock(page, this.blockId!, value.placement)))
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.form.markAsPristine();
            this.toast.show('Bloque guardado.');
            this.router.navigate(['/admin/structure']);
          },
          error: () => {
            this.submitting.set(false);
            this.errorMessage.set('No se pudo guardar el bloque.');
          },
        });
      return;
    }

    this.blocksService
      .create({ type: value.type, page, config, published: value.published, sortOrder: 0 })
      .pipe(switchMap((created) => {
        this.blockId = created.id;
        this.isEditMode.set(true);
        return this.pageItems.placeBlock(page, created.id, value.placement);
      }))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.form.markAsPristine();
          this.toast.show('Bloque guardado.');
          this.router.navigate(['/admin/structure']);
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('No se pudo crear el bloque.');
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/structure']);
  }

  /** "Nuevo bloque" / "+ Debajo" en la estructura pasan `placement` (y Modelos 3D pasa `type`). */
  private applyCreateParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const type = params.get('type');
    if (type && (BLOCK_TYPES as string[]).includes(type)) {
      this.chooseType(type as Block['type']);
    }

    const placement = params.get('placement');
    if (!placement) return;
    if (this.placements.some((option) => option.value === placement)) {
      this.form.controls.placement.setValue(placement as PageBlockPlacement);
    } else if (placement === 'start' || AFTER_ITEM_PATTERN.test(placement)) {
      this.placements.unshift({ value: placement as PageBlockPlacement, label: 'Posición elegida en Estructura de portada' });
      this.form.controls.placement.setValue(placement as PageBlockPlacement);
    }
  }

  private loadBlock(block: Block): void {
    const config = block.config ?? {};
    const layout = (config['layout'] ?? {}) as Record<string, unknown>;
    const viewer = (config['viewer'] ?? {}) as Record<string, unknown>;
    const rawItems = Array.isArray(config['items']) ? config['items'] : [];

    this.form.patchValue({
      type: block.type,
      page: block.page,
      title: this.stringValue(config['title']),
      titleEn: this.stringValue(config['title_en']),
      eyebrow: this.stringValue(config['eyebrow']),
      eyebrowEn: this.stringValue(config['eyebrow_en']),
      lead: this.stringValue(config['lead']),
      leadEn: this.stringValue(config['lead_en']),
      body: this.stringValue(config['body']),
      bodyEn: this.stringValue(config['body_en']),
      description: this.stringValue(config['description']),
      descriptionEn: this.stringValue(config['description_en']),
      modelPath: this.stringValue(config['modelPath']),
      modelAuthor: this.stringValue(config['modelAuthor']),
      modelLicense: this.stringValue(config['modelLicense']),
      modelHeight: this.enumValue<BlockEditorValue['modelHeight']>(viewer['height'], ['compact', 'standard', 'tall'], 'standard'),
      autoRotate: viewer['autoRotate'] !== false,
      zoomEnabled: viewer['zoomEnabled'] !== false,
      width: this.enumValue<BlockEditorValue['width']>(layout['width'], ['small', 'medium', 'wide', 'full'], 'full'),
      alignment: this.enumValue<BlockEditorValue['alignment']>(layout['alignment'], ['left', 'center', 'right'], 'center'),
      background: this.enumValue<BlockEditorValue['background']>(layout['background'], ['transparent', 'surface'], 'transparent'),
      backgroundOpacity: typeof layout['backgroundOpacity'] === 'number' ? layout['backgroundOpacity'] : 35,
      borderless: layout['border'] !== true,
      spacing: this.enumValue<BlockEditorValue['spacing']>(layout['spacing'], ['compact', 'normal', 'spacious'], 'normal'),
      placement: 'keep',
      published: block.published,
    });

    this.items.clear();
    for (const rawItem of rawItems.slice(0, MAX_ITEMS)) {
      if (typeof rawItem === 'object' && rawItem !== null && !Array.isArray(rawItem)) {
        this.items.push(this.createItem(rawItem as BlockItemValue));
      }
    }
  }

  private createItem(item: BlockItemValue = {}): BlockItemForm {
    const value = (key: string): string => this.stringValue(item[key]);
    return new FormGroup({
      when: textControl(80, false, value('when')),
      whenEn: textControl(80, false, value('when_en')),
      title: textControl(120, false, value('title')),
      titleEn: textControl(120, false, value('title_en')),
      description: textControl(1000, true, value('description')),
      descriptionEn: textControl(1000, true, value('description_en')),
      icon: textControl(60, false, value('icon')),
    });
  }

  private validateConfig(): string | null {
    const value = this.form.getRawValue();
    const title = value.title.trim();
    const body = value.body.trim();

    if ((value.type === 'hero' || value.type === 'card_grid' || value.type === 'roadmap') && !title) {
      return 'Este bloque necesita un título en español.';
    }
    if (value.type === 'text' && !body) {
      return 'El bloque de texto necesita un texto en español.';
    }
    if (value.type === 'gallery_3d') {
      const modelPath = value.modelPath.trim();
      const hasValidModel = GLB_PATH_PATTERN.test(modelPath);
      if (modelPath && !hasValidModel) {
        return 'La ruta del modelo no es válida. Vuelve a cargar el archivo GLB.';
      }
      if (value.published && !hasValidModel) {
        return 'Carga un modelo GLB válido antes de publicar esta galería.';
      }
    }
    if (value.type === 'card_grid' || value.type === 'roadmap') {
      if (value.items.length === 0) {
        return 'Agrega al menos un elemento a este bloque.';
      }
      if (value.items.length > MAX_ITEMS) {
        return `Puedes agregar hasta ${MAX_ITEMS} elementos.`;
      }
      for (let index = 0; index < value.items.length; index += 1) {
        const item = value.items[index];
        if (!item.title.trim() || !item.description.trim()) {
          return `Completa el título y la descripción en español del elemento ${index + 1}.`;
        }
        if (value.type === 'roadmap' && !item.when.trim()) {
          return `Completa la fecha o etapa en español del elemento ${index + 1}.`;
        }
      }
    }
    return null;
  }

  private invalidVisibleFields(): string[] {
    const invalidFields: string[] = [];
    const controls = this.form.controls;
    const check = (label: string, control: { invalid: boolean; markAsTouched: () => void }): void => {
      control.markAsTouched();
      if (control.invalid) invalidFields.push(label);
    };
    const checkPair = (label: string, es: FormControl<string>, en: FormControl<string>): void => {
      check(`${label} (ES)`, es);
      check(`${label} (EN)`, en);
    };

    check('la página', controls.page);

    switch (controls.type.value) {
      case 'hero':
        checkPair('la etiqueta', controls.eyebrow, controls.eyebrowEn);
        checkPair('el título', controls.title, controls.titleEn);
        checkPair('la introducción', controls.lead, controls.leadEn);
        break;
      case 'text':
        checkPair('el título', controls.title, controls.titleEn);
        checkPair('el texto', controls.body, controls.bodyEn);
        break;
      case 'gallery_3d':
        checkPair('el título', controls.title, controls.titleEn);
        checkPair('la descripción', controls.description, controls.descriptionEn);
        check('el autor', controls.modelAuthor);
        check('la licencia', controls.modelLicense);
        break;
      case 'card_grid':
      case 'roadmap':
        checkPair('el título', controls.title, controls.titleEn);
        this.items.controls.forEach((item, index) => {
          const n = index + 1;
          if (this.usesRoadmapItems) checkPair(`la etapa ${n}`, item.controls.when, item.controls.whenEn);
          checkPair(`el título del elemento ${n}`, item.controls.title, item.controls.titleEn);
          checkPair(`la descripción del elemento ${n}`, item.controls.description, item.controls.descriptionEn);
          if (!this.usesRoadmapItems) check(`la etiqueta del elemento ${n}`, item.controls.icon);
        });
        break;
    }

    return invalidFields;
  }

  /** Las claves base llevan el español; las `_en` solo se escriben si están rellenas (ver BlockDispatcherComponent). */
  private toConfig(value: BlockEditorValue): Record<string, unknown> {
    const pair = (key: string, es: string, en: string): Record<string, string> => {
      const english = en.trim();
      return english ? { [key]: es.trim(), [`${key}_en`]: english } : { [key]: es.trim() };
    };

    const layout = {
      width: value.width,
      alignment: value.alignment,
      background: value.background,
      backgroundOpacity: Math.max(0, Math.min(100, Number(value.backgroundOpacity) || 0)),
      border: !value.borderless,
      spacing: value.spacing,
    };
    const withLayout = (config: Record<string, unknown>) => ({ ...config, layout });
    const title = pair('title', value.title, value.titleEn);

    switch (value.type) {
      case 'hero':
        return withLayout({ ...pair('eyebrow', value.eyebrow, value.eyebrowEn), ...title, ...pair('lead', value.lead, value.leadEn) });
      case 'card_grid':
        return withLayout({
          ...title,
          items: value.items.map((item) => ({
            ...pair('title', item.title, item.titleEn),
            ...pair('description', item.description, item.descriptionEn),
            ...(item.icon.trim() ? { icon: item.icon.trim() } : {}),
          })),
        });
      case 'roadmap':
        return withLayout({
          ...title,
          items: value.items.map((item) => ({
            ...pair('when', item.when, item.whenEn),
            ...pair('title', item.title, item.titleEn),
            ...pair('description', item.description, item.descriptionEn),
          })),
        });
      case 'text':
        return withLayout({ ...title, ...pair('body', value.body, value.bodyEn) });
      case 'gallery_3d':
        return withLayout({
          ...title,
          ...pair('description', value.description, value.descriptionEn),
          modelPath: value.modelPath.trim(),
          modelAuthor: value.modelAuthor.trim(),
          modelLicense: value.modelLicense.trim(),
          viewer: { height: value.modelHeight, autoRotate: value.autoRotate, zoomEnabled: value.zoomEnabled },
        });
    }
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
  }

  modelMetadata(): ModelAssetMetadata {
    const value = this.form.getRawValue();
    return { title: value.title, author: value.modelAuthor, license: value.modelLicense };
  }

  onAssetSelected(asset: ModelAsset | null): void {
    if (!asset) return;
    this.form.patchValue({
      title: this.form.controls.title.value || asset.title,
      modelAuthor: asset.author,
      modelLicense: asset.license,
    });
  }
}
