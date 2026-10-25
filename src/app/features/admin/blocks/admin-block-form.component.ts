import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BlocksService } from '../../../core/data/blocks.service';
import { Block } from '../../../core/data/block.model';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { BlockDispatcherComponent } from '../../../shared/blocks/block-dispatcher.component';
import { ModelUploadComponent } from '../../../shared/model-upload/model-upload.component';
import { switchMap } from 'rxjs';
import { PageBlockPlacement, PageItemsService } from '../../../core/data/page-items.service';
import { ModelAsset, ModelAssetMetadata } from '../../../core/data/model-asset.model';

const BLOCK_TYPES: Block['type'][] = ['hero', 'card_grid', 'roadmap', 'text', 'gallery_3d'];
const MAX_ITEMS = 12;

const TYPE_LABELS: Record<Block['type'], string> = {
  hero: 'Hero',
  card_grid: 'Grid de tarjetas',
  roadmap: 'Roadmap',
  text: 'Texto',
  gallery_3d: 'Galería 3D',
};

const AFTER_ITEM_PATTERN = /^after-item:(section:[a-z_]+|block:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const GLB_PATH_PATTERN =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$/i;

type BlockItemForm = FormGroup<{
  when: FormControl<string>;
  title: FormControl<string>;
  description: FormControl<string>;
  icon: FormControl<string>;
}>;

interface BlockItemValue {
  when?: string;
  title?: string;
  description?: string;
  icon?: string;
}

interface BlockEditorValue {
  type: Block['type'];
  page: string;
  title: string;
  eyebrow: string;
  lead: string;
  body: string;
  description: string;
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
  items: Array<{ when: string; title: string; description: string; icon: string }>;
}

@Component({
  selector: 'app-admin-block-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BlockDispatcherComponent, ModelUploadComponent],
  templateUrl: './admin-block-form.component.html',
  styleUrl: './admin-block-form.component.css',
})
export class AdminBlockFormComponent implements OnInit {
  private readonly blocksService = inject(BlocksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pageItems = inject(PageItemsService);

  protected readonly types = BLOCK_TYPES;
  protected readonly typeLabels = TYPE_LABELS;
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
    { value: 'before:contact', label: 'Antes de contacto' },
  ];

  protected readonly form = new FormGroup({
    type: new FormControl<Block['type']>('text', { nonNullable: true }),
    page: new FormControl('home', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100), noControlCharsValidator()],
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(120), noControlCharsValidator()],
    }),
    eyebrow: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(80), noControlCharsValidator()],
    }),
    lead: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300), noControlCharsValidator()],
    }),
    body: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(4000), noControlCharsValidator()],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000), noControlCharsValidator()],
    }),
    modelPath: new FormControl('', { nonNullable: true }),
    modelAuthor: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120), noControlCharsValidator()] }),
    modelLicense: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(160), noControlCharsValidator()] }),
    modelHeight: new FormControl<'compact' | 'standard' | 'tall'>('standard', { nonNullable: true }),
    autoRotate: new FormControl(true, { nonNullable: true }), zoomEnabled: new FormControl(true, { nonNullable: true }),
    width: new FormControl<'small' | 'medium' | 'wide' | 'full'>('medium', { nonNullable: true }),
    alignment: new FormControl<'left' | 'center' | 'right'>('left', { nonNullable: true }),
    background: new FormControl<'transparent' | 'surface'>('transparent', { nonNullable: true }),
    backgroundOpacity: new FormControl(35, { nonNullable: true }), borderless: new FormControl(true, { nonNullable: true }),
    spacing: new FormControl<'compact' | 'normal' | 'spacious'>('normal', { nonNullable: true }),
    placement: new FormControl<PageBlockPlacement>('end', { nonNullable: true }),
    published: new FormControl(false, { nonNullable: true }),
    items: new FormArray<BlockItemForm>([]),
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isEditMode = signal(false);

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

  addItem(): void {
    if (this.items.length >= MAX_ITEMS) {
      return;
    }
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
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

  submit(): void {
    this.errorMessage.set('');

    const invalidFields = this.invalidVisibleFields();
    if (invalidFields.length > 0) {
      this.errorMessage.set(
        `Revisa ${invalidFields.join(', ')}: comprueba los límites de longitud y los caracteres permitidos.`,
      );
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
      this.blocksService
        .update(this.blockId, { type: value.type, page, config, published: value.published })
        .pipe(switchMap(() => this.pageItems.placeBlock(page, this.blockId!, value.placement)))
        .subscribe({
          next: () => {
            this.submitting.set(false);
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

  /** "Nuevo bloque" / "+ Debajo" in the structure page pass `placement` (and Modelos 3D passes `type`). */
  private applyCreateParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const type = params.get('type');
    if (type && (BLOCK_TYPES as string[]).includes(type)) {
      this.form.controls.type.setValue(type as Block['type']);
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
      eyebrow: this.stringValue(config['eyebrow']),
      lead: this.stringValue(config['lead']),
      body: this.stringValue(config['body']),
      description: this.stringValue(config['description']),
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
    return new FormGroup({
      when: new FormControl(this.stringValue(item.when), {
        nonNullable: true,
        validators: [Validators.maxLength(80), noControlCharsValidator()],
      }),
      title: new FormControl(this.stringValue(item.title), {
        nonNullable: true,
        validators: [Validators.maxLength(120), noControlCharsValidator()],
      }),
      description: new FormControl(this.stringValue(item.description), {
        nonNullable: true,
        validators: [Validators.maxLength(1000), noControlCharsValidator()],
      }),
      icon: new FormControl(this.stringValue(item.icon), {
        nonNullable: true,
        validators: [Validators.maxLength(60), noControlCharsValidator()],
      }),
    });
  }

  private validateConfig(): string | null {
    const value = this.form.getRawValue();
    const title = value.title.trim();
    const body = value.body.trim();

    if ((value.type === 'hero' || value.type === 'card_grid' || value.type === 'roadmap') && !title) {
      return 'Este bloque necesita un título.';
    }
    if (value.type === 'text' && !body) {
      return 'El bloque de texto necesita un cuerpo.';
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
          return `Completa el título y la descripción del elemento ${index + 1}.`;
        }
        if (value.type === 'roadmap' && !item.when.trim()) {
          return `Completa la fecha o etapa del elemento ${index + 1}.`;
        }
      }
    }
    return null;
  }

  private invalidVisibleFields(): string[] {
    const invalidFields: string[] = [];
    const check = (label: string, control: { invalid: boolean; markAsTouched: () => void }): void => {
      control.markAsTouched();
      if (control.invalid) invalidFields.push(label);
    };

    check('la página', this.form.controls.page);

    switch (this.form.controls.type.value) {
      case 'hero':
        check('la etiqueta', this.form.controls.eyebrow);
        check('el título', this.form.controls.title);
        check('la introducción', this.form.controls.lead);
        break;
      case 'text':
        check('el título', this.form.controls.title);
        check('el texto', this.form.controls.body);
        break;
      case 'gallery_3d':
        check('el título', this.form.controls.title);
        check('la descripción', this.form.controls.description);
        check('el autor', this.form.controls.modelAuthor);
        check('la licencia', this.form.controls.modelLicense);
        break;
      case 'card_grid':
      case 'roadmap':
        check('el título', this.form.controls.title);
        this.items.markAllAsTouched();
        this.items.controls.forEach((item, index) => {
          if (this.usesRoadmapItems) check(`la etapa ${index + 1}`, item.controls.when);
          check(`el título del elemento ${index + 1}`, item.controls.title);
          check(`la descripción del elemento ${index + 1}`, item.controls.description);
          if (!this.usesRoadmapItems) check(`la etiqueta del elemento ${index + 1}`, item.controls.icon);
        });
        break;
    }

    return invalidFields;
  }

  private toConfig(value: BlockEditorValue): Record<string, unknown> {
    const title = value.title.trim();
    const eyebrow = value.eyebrow.trim();
    const lead = value.lead.trim();
    const body = value.body.trim();
    const description = value.description.trim();

    const layout = {
      width: value.width,
      alignment: value.alignment,
      background: value.background,
      backgroundOpacity: Math.max(0, Math.min(100, Number(value.backgroundOpacity) || 0)),
      border: !value.borderless,
      spacing: value.spacing,
    };
    const withLayout = (config: Record<string, unknown>) => ({ ...config, layout });
    switch (value.type) {
      case 'hero':
        return withLayout({ eyebrow, title, lead });
      case 'card_grid':
        return withLayout({
          title,
          items: value.items.map((item) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            ...(item.icon.trim() ? { icon: item.icon.trim() } : {}),
          })),
        });
      case 'roadmap':
        return withLayout({
          title,
          items: value.items.map((item) => ({
            when: item.when.trim(),
            title: item.title.trim(),
            description: item.description.trim(),
          })),
        });
      case 'text':
        return withLayout({ title, body });
      case 'gallery_3d':
        return withLayout({
          title, description, modelPath: value.modelPath.trim(),
          modelAuthor: value.modelAuthor.trim(), modelLicense: value.modelLicense.trim(),
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
