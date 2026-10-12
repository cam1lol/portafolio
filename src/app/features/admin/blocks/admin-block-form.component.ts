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

const BLOCK_TYPES: Block['type'][] = ['hero', 'card_grid', 'roadmap', 'text', 'gallery_3d'];
const MAX_ITEMS = 12;

const TYPE_LABELS: Record<Block['type'], string> = {
  hero: 'Hero',
  card_grid: 'Grid de tarjetas',
  roadmap: 'Roadmap',
  text: 'Texto',
  gallery_3d: 'Galería 3D (texto)',
};

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
  published: boolean;
  items: Array<{ when: string; title: string; description: string; icon: string }>;
}

@Component({
  selector: 'app-admin-block-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BlockDispatcherComponent],
  templateUrl: './admin-block-form.component.html',
  styleUrl: './admin-block-form.component.css',
})
export class AdminBlockFormComponent implements OnInit {
  private readonly blocksService = inject(BlocksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly types = BLOCK_TYPES;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly maxItems = MAX_ITEMS;

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
    this.form.markAllAsTouched();
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.errorMessage.set('Revisa los campos marcados y sus límites de longitud.');
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
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.router.navigate(['/admin/blocks']);
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
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigate(['/admin/blocks']);
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('No se pudo crear el bloque.');
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/blocks']);
  }

  private loadBlock(block: Block): void {
    const config = block.config ?? {};
    const rawItems = Array.isArray(config['items']) ? config['items'] : [];

    this.form.patchValue({
      type: block.type,
      page: block.page,
      title: this.stringValue(config['title']),
      eyebrow: this.stringValue(config['eyebrow']),
      lead: this.stringValue(config['lead']),
      body: this.stringValue(config['body']),
      description: this.stringValue(config['description']),
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

  private toConfig(value: BlockEditorValue): Record<string, unknown> {
    const title = value.title.trim();
    const eyebrow = value.eyebrow.trim();
    const lead = value.lead.trim();
    const body = value.body.trim();
    const description = value.description.trim();

    switch (value.type) {
      case 'hero':
        return { eyebrow, title, lead };
      case 'card_grid':
        return {
          title,
          items: value.items.map((item) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            ...(item.icon.trim() ? { icon: item.icon.trim() } : {}),
          })),
        };
      case 'roadmap':
        return {
          title,
          items: value.items.map((item) => ({
            when: item.when.trim(),
            title: item.title.trim(),
            description: item.description.trim(),
          })),
        };
      case 'text':
        return { title, body };
      case 'gallery_3d':
        return { title, description };
    }
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
