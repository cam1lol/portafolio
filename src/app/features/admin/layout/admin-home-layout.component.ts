import { Component, OnInit, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { BlocksService } from '../../../core/data/blocks.service';
import { Block } from '../../../core/data/block.model';
import { PageItem, PageItemsService } from '../../../core/data/page-items.service';

interface LayoutRow extends PageItem {
  label: string;
  description: string;
  status?: string;
}

const SECTIONS = [
  { key: 'hero', label: 'Hero', description: 'Presentación principal' },
  { key: 'ticker', label: 'Ticker', description: 'Franja de texto animada' },
  { key: 'manifesto', label: 'Manifiesto', description: 'Introducción y enfoque' },
  { key: 'projects', label: 'Proyectos', description: 'Portafolio de proyectos' },
  { key: 'experience', label: 'Experiencia', description: 'Trayectoria profesional' },
  { key: 'services', label: 'Servicios', description: 'Servicios ofrecidos' },
  { key: 'roadmap', label: 'Roadmap', description: 'Planes y próximos pasos' },
  { key: 'contact', label: 'Contacto', description: 'Formulario y datos de contacto' },
] as const;

const BLOCK_LABELS: Record<Block['type'], string> = {
  hero: 'Bloque Hero',
  card_grid: 'Bloque Grid de cards',
  roadmap: 'Bloque Roadmap',
  text: 'Bloque de texto',
  gallery_3d: 'Bloque Galería 3D',
};

@Component({
  selector: 'app-admin-home-layout',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './admin-home-layout.component.html',
  styleUrl: './admin-home-layout.component.css',
})
export class AdminHomeLayoutComponent implements OnInit {
  private readonly pageItemsService = inject(PageItemsService);
  private readonly blocksService = inject(BlocksService);

  protected readonly rows = signal<LayoutRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  ngOnInit(): void {
    forkJoin({ layout: this.pageItemsService.getPageItems('home'), blocks: this.blocksService.getAll() }).subscribe({
      next: ({ layout, blocks }) => {
        this.rows.set(this.mergeLayout(layout, blocks.filter((block) => block.page === 'home')));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el orden de la portada.');
        this.loading.set(false);
      },
    });
  }

  drop(event: CdkDragDrop<LayoutRow[]>): void {
    const next = [...this.rows()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.rows.set(next);
    this.dirty.set(true);
    this.successMessage.set('');
  }

  save(): void {
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.pageItemsService.savePageOrder('home', this.rows()).subscribe({
      next: () => {
        this.rows.update((rows) => rows.map((row, index) => ({ ...row, sortOrder: index })));
        this.dirty.set(false);
        this.saving.set(false);
        this.successMessage.set('El nuevo orden de la portada quedó guardado.');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar. Comprueba que aplicaste la migración de elementos de página en Supabase y que tu sesión tiene permisos de administrador.');
      },
    });
  }

  private mergeLayout(layout: PageItem[], blocks: Block[]): LayoutRow[] {
    const sectionByKey = new Map<string, LayoutRow>(
      SECTIONS.map((section): [string, LayoutRow] => [
        section.key,
        {
          key: `section:${section.key}`,
          kind: 'section',
          sectionKey: section.key,
          sortOrder: 0,
          label: section.label,
          description: section.description,
        },
      ]),
    );
    const blockById = new Map(blocks.map((block) => [block.id, block]));
    const ordered: LayoutRow[] = [];
    const seenSections = new Set<string>();
    const seenBlocks = new Set<string>();

    for (const item of [...layout].sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (item.kind === 'section' && item.sectionKey) {
        const row = sectionByKey.get(item.sectionKey);
        if (row && !seenSections.has(item.sectionKey)) {
          ordered.push({ ...row, key: item.key, sortOrder: item.sortOrder });
          seenSections.add(item.sectionKey);
        }
      } else if (item.kind === 'block' && item.blockId) {
        const block = blockById.get(item.blockId);
        if (block && !seenBlocks.has(block.id)) {
          ordered.push({
            key: item.key,
            kind: 'block',
            blockId: block.id,
            sortOrder: item.sortOrder,
            label: BLOCK_LABELS[block.type],
            description: this.blockTitle(block) || `Bloque en la página ${block.page}`,
            status: block.published ? 'Publicado' : 'Borrador',
          });
          seenBlocks.add(block.id);
        }
      }
    }

    for (const section of SECTIONS) {
      if (!seenSections.has(section.key)) {
        const row = sectionByKey.get(section.key)!;
        ordered.push({ ...row, sortOrder: ordered.length });
      }
    }
    for (const block of blocks) {
      if (!seenBlocks.has(block.id)) {
        ordered.push({
          key: `block:${block.id}`,
          kind: 'block',
          blockId: block.id,
          sortOrder: ordered.length,
          label: BLOCK_LABELS[block.type],
          description: this.blockTitle(block) || `Bloque en la página ${block.page}`,
          status: block.published ? 'Publicado' : 'Borrador',
        });
      }
    }
    return ordered;
  }

  private blockTitle(block: Block): string {
    const title = block.config['title'];
    return typeof title === 'string' ? title : '';
  }
}
