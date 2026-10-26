import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { BlocksService } from '../../../core/data/blocks.service';
import { Block } from '../../../core/data/block.model';
import { PageItem, PageItemsService } from '../../../core/data/page-items.service';
import { SectionVisibilityService } from '../../../core/data/section-visibility.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { ToastService } from '../shared/toast.service';
import { AdminPageHeaderComponent } from '../shared/admin-page-header.component';

interface StructureRow extends PageItem {
  label: string;
  description: string;
  block?: Block;
  /** Section visibility; `null` when the section has no row in `section_visibility` (ticker). */
  visible: boolean | null;
  /** Where EDITAR leads; `null` when the section has no editor yet. */
  editLink: string[] | null;
  editFragment?: string;
}

interface SectionDef {
  key: string;
  label: string;
  description: string;
  editLink: string[] | null;
  editFragment?: string;
}

const SECTIONS: SectionDef[] = [
  { key: 'hero', label: 'Hero', description: 'Presentación principal con el objeto 3D', editLink: ['/admin/site-texts'], editFragment: 'hero' },
  { key: 'ticker', label: 'Ticker', description: 'Franja animada de tecnologías', editLink: ['/admin/ticker'] },
  { key: 'manifesto', label: 'Manifiesto', description: 'Introducción y enfoque', editLink: ['/admin/site-texts'], editFragment: 'manifesto' },
  { key: 'projects', label: 'Proyectos', description: 'Tabs de proyectos y modal de detalle', editLink: ['/admin/projects'] },
  { key: 'experience', label: 'Experiencia', description: 'Timeline profesional', editLink: ['/admin/experience'] },
  { key: 'services', label: 'Servicios', description: 'Servicios ofrecidos y precios', editLink: ['/admin/services'] },
  { key: 'roadmap', label: 'Roadmap', description: 'Planes y próximos pasos', editLink: ['/admin/roadmap'] },
  { key: 'comments', label: 'Comentarios', description: 'Comentarios aprobados y formulario público', editLink: ['/admin/comments'] },
  { key: 'contact', label: 'Contacto', description: 'Cierre de la página y email', editLink: ['/admin/site-texts'], editFragment: 'contact' },
];

const BLOCK_LABELS: Record<Block['type'], string> = {
  hero: 'Bloque Hero',
  card_grid: 'Bloque de tarjetas',
  roadmap: 'Bloque Roadmap',
  text: 'Bloque de texto',
  gallery_3d: 'Bloque Galería 3D',
};

@Component({
  selector: 'app-admin-structure',
  standalone: true,
  imports: [AdminPageHeaderComponent, RouterLink, DragDropModule],
  templateUrl: './admin-structure.component.html',
  styleUrl: './admin-structure.component.css',
})
export class AdminStructureComponent implements OnInit {
  private readonly pageItemsService = inject(PageItemsService);
  private readonly blocksService = inject(BlocksService);
  private readonly visibilityService = inject(SectionVisibilityService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<StructureRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      layout: this.pageItemsService.getPageItems('home'),
      blocks: this.blocksService.getAll(),
      visibility: this.visibilityService.getAll(),
    }).subscribe({
      next: ({ layout, blocks, visibility }) => {
        const visibleBySection = new Map(visibility.map((row) => [row.section, row.visible]));
        this.rows.set(this.mergeLayout(layout, blocks.filter((block) => block.page === 'home'), visibleBySection));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la estructura de la portada.');
        this.loading.set(false);
      },
    });
  }

  drop(event: CdkDragDrop<StructureRow[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = [...this.rows()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.rows.set(next);
    this.flash('');
    this.saving.set(true);

    this.pageItemsService.savePageOrder('home', next).subscribe({
      next: () => {
        this.saving.set(false);
        this.flash('Orden guardado.');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar el nuevo orden. Se restauró el orden anterior.');
        this.load();
      },
    });
  }

  toggleSection(row: StructureRow): void {
    if (row.visible === null || !row.sectionKey) return;
    const nextVisible = !row.visible;
    this.patchRow(row.key, { visible: nextVisible });

    this.visibilityService.setVisible(row.sectionKey, nextVisible).subscribe({
      next: () => this.toast.show(nextVisible ? `${row.label}: visible en el sitio.` : `${row.label}: oculta del sitio.`),
      error: () => {
        this.patchRow(row.key, { visible: !nextVisible });
        this.errorMessage.set(`No se pudo cambiar la visibilidad de "${row.label}".`);
      },
    });
  }

  toggleBlock(row: StructureRow): void {
    if (!row.block) return;
    const block = row.block;
    const nextPublished = !block.published;
    this.patchRow(row.key, { block: { ...block, published: nextPublished } });

    this.blocksService.update(block.id, { published: nextPublished }).subscribe({
      next: () => this.toast.show(nextPublished ? 'Bloque publicado.' : 'Bloque en borrador.'),
      error: () => {
        this.patchRow(row.key, { block });
        this.errorMessage.set(`No se pudo actualizar "${row.description}".`);
      },
    });
  }

  async removeBlock(row: StructureRow): Promise<void> {
    if (!row.block) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar bloque',
      message: `Se eliminará "${row.description}" (${row.label}) de la portada. Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;

    this.blocksService.delete(row.block.id).subscribe({
      next: () => {
        this.rows.update((rows) => rows.filter((r) => r.key !== row.key));
        this.flash('Bloque eliminado.');
      },
      error: () => this.errorMessage.set(`No se pudo eliminar "${row.description}".`),
    });
  }

  protected position(index: number): string {
    return (index + 1).toString().padStart(2, '0');
  }

  private patchRow(key: string, patch: Partial<StructureRow>): void {
    this.rows.update((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  private flash(message: string): void {
    this.errorMessage.set('');
    if (message) this.toast.show(message);
  }

  private mergeLayout(layout: PageItem[], blocks: Block[], visibleBySection: Map<string, boolean>): StructureRow[] {
    const sectionRow = (section: SectionDef, key: string, sortOrder: number): StructureRow => ({
      key,
      kind: 'section',
      sectionKey: section.key,
      sortOrder,
      label: section.label,
      description: section.description,
      visible: visibleBySection.has(section.key) ? visibleBySection.get(section.key)! : null,
      editLink: section.editLink,
      editFragment: section.editFragment,
    });
    const blockRow = (block: Block, key: string, sortOrder: number): StructureRow => ({
      key,
      kind: 'block',
      blockId: block.id,
      sortOrder,
      label: BLOCK_LABELS[block.type],
      description: this.blockTitle(block) || 'Sin título',
      block,
      visible: null,
      editLink: ['/admin/blocks', block.id, 'edit'],
    });

    const sectionByKey = new Map(SECTIONS.map((section) => [section.key, section]));
    const blockById = new Map(blocks.map((block) => [block.id, block]));
    const ordered: StructureRow[] = [];
    const seenSections = new Set<string>();
    const seenBlocks = new Set<string>();

    for (const item of [...layout].sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (item.kind === 'section' && item.sectionKey) {
        const section = sectionByKey.get(item.sectionKey);
        if (section && !seenSections.has(section.key)) {
          ordered.push(sectionRow(section, item.key, item.sortOrder));
          seenSections.add(section.key);
        }
      } else if (item.kind === 'block' && item.blockId) {
        const block = blockById.get(item.blockId);
        if (block && !seenBlocks.has(block.id)) {
          ordered.push(blockRow(block, item.key, item.sortOrder));
          seenBlocks.add(block.id);
        }
      }
    }

    // Same fallback as the public page: content missing from page_items goes last.
    for (const section of SECTIONS) {
      if (!seenSections.has(section.key)) ordered.push(sectionRow(section, `section:${section.key}`, ordered.length));
    }
    for (const block of blocks) {
      if (!seenBlocks.has(block.id)) ordered.push(blockRow(block, `block:${block.id}`, ordered.length));
    }
    return ordered;
  }

  private blockTitle(block: Block): string {
    const title = block.config['title'];
    return typeof title === 'string' ? title.trim() : '';
  }
}
