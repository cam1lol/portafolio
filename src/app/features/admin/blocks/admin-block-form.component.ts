import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BlocksService } from '../../../core/data/blocks.service';
import { Block } from '../../../core/data/block.model';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';

const BLOCK_TYPES: Block['type'][] = ['hero', 'card_grid', 'roadmap', 'text', 'gallery_3d'];

const TYPE_LABELS: Record<Block['type'], string> = {
  hero: 'Hero',
  card_grid: 'Grid de cards',
  roadmap: 'Roadmap',
  text: 'Texto',
  gallery_3d: 'Galería 3D',
};


const CONFIG_PLACEHOLDERS: Record<Block['type'], string> = {
  hero: JSON.stringify(
    { eyebrow: 'Eyebrow opcional', title: 'Título destacado', lead: 'Texto introductorio opcional' },
    null,
    2,
  ),
  card_grid: JSON.stringify(
    {
      title: 'Título opcional',
      items: [{ title: 'Card 1', description: 'Descripción', icon: 'icono-opcional' }],
    },
    null,
    2,
  ),
  roadmap: JSON.stringify(
    {
      title: 'Título opcional',
      items: [{ when: '2026 Q1', title: 'Hito', description: 'Descripción' }],
    },
    null,
    2,
  ),
  text: JSON.stringify({ title: 'Título opcional', body: 'Cuerpo del bloque de texto' }, null, 2),
  gallery_3d: JSON.stringify(
    { title: 'Título opcional', description: 'Descripción de la galería (placeholder, sin geometría 3D)' },
    null,
    2,
  ),
};

@Component({
  selector: 'app-admin-block-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-block-form.component.html',
  styleUrl: './admin-block-form.component.css',
})
export class AdminBlockFormComponent implements OnInit {
  private readonly blocksService = inject(BlocksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly types = BLOCK_TYPES;
  protected readonly typeLabels = TYPE_LABELS;

  protected readonly form = new FormGroup({
    type: new FormControl<Block['type']>('text', { nonNullable: true, validators: [Validators.required] }),
    page: new FormControl('home', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100), noControlCharsValidator()],
    }),
    config: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    published: new FormControl(false, { nonNullable: true }),
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isEditMode = signal(false);

  private blockId: string | null = null;

  get configPlaceholder(): string {
    return CONFIG_PLACEHOLDERS[this.form.controls.type.value];
  }

  ngOnInit(): void {
    this.blockId = this.route.snapshot.paramMap.get('id');
    if (!this.blockId) {
      return;
    }

    this.isEditMode.set(true);
    this.blocksService.getAll().subscribe({
      next: (blocks) => {
        const block = blocks.find((b) => b.id === this.blockId);
        if (!block) {
          this.errorMessage.set('Bloque no encontrado.');
          return;
        }
        this.form.setValue({
          type: block.type,
          page: block.page,
          config: JSON.stringify(block.config, null, 2),
          published: block.published,
        });
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el bloque.');
      },
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.controls.config.value.trim();
    let config: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('El config debe ser un objeto JSON.');
      }
      config = parsed as Record<string, unknown>;
    } catch {
      this.errorMessage.set('El config no es JSON válido. Revisa la sintaxis.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const page = value.page.trim();

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
}
