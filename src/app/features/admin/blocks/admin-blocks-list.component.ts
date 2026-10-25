import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { BlocksService } from '../../../core/data/blocks.service';
import { Block } from '../../../core/data/block.model';

const TYPE_LABELS: Record<Block['type'], string> = {
  hero: 'Hero',
  card_grid: 'Grid de cards',
  roadmap: 'Roadmap',
  text: 'Texto',
  gallery_3d: 'Galería 3D',
};

@Component({
  selector: 'app-admin-blocks-list',
  standalone: true,
  imports: [RouterLink, DragDropModule],
  templateUrl: './admin-blocks-list.component.html',
  styleUrl: './admin-blocks-list.component.css',
})
export class AdminBlocksListComponent implements OnInit {
  private readonly blocksService = inject(BlocksService);

  protected readonly blocks = signal<Block[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly search = signal('');
  protected readonly typeFilter = signal('all');
  protected readonly statusFilter = signal('all');

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly types = Object.keys(TYPE_LABELS) as Block['type'][];
  protected readonly filteredBlocks = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.blocks().filter((block) => {
      const title = typeof block.config['title'] === 'string' ? block.config['title'] : '';
      const matchesSearch = !query || `${title} ${block.page} ${this.typeLabels[block.type]}`.toLocaleLowerCase().includes(query);
      const matchesType = this.typeFilter() === 'all' || block.type === this.typeFilter();
      const matchesStatus = this.statusFilter() === 'all' || (this.statusFilter() === 'published' ? block.published : !block.published);
      return matchesSearch && matchesType && matchesStatus;
    });
  });
  protected readonly hasActiveFilters = computed(() =>
    !!this.search().trim() || this.typeFilter() !== 'all' || this.statusFilter() !== 'all',
  );

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setTypeFilter(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }

  setStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  clearFilters(): void {
    this.search.set('');
    this.typeFilter.set('all');
    this.statusFilter.set('all');
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.blocksService.getAll().subscribe({
      next: (blocks) => {
        this.blocks.set(blocks);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los bloques.');
        this.loading.set(false);
      },
    });
  }

  drop(event: CdkDragDrop<Block[]>): void {
    const next = [...this.blocks()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.blocks.set(next);

    this.blocksService.reorder(next.map((block) => block.id)).subscribe({
      error: () => {
        this.errorMessage.set('No se pudo guardar el nuevo orden.');
        this.load();
      },
    });
  }

  togglePublished(block: Block): void {
    const nextPublished = !block.published;
    this.blocks.update((blocks) =>
      blocks.map((b) => (b.id === block.id ? { ...b, published: nextPublished } : b)),
    );

    this.blocksService.update(block.id, { published: nextPublished }).subscribe({
      error: () => {
        this.blocks.update((blocks) =>
          blocks.map((b) => (b.id === block.id ? { ...b, published: !nextPublished } : b)),
        );
        this.errorMessage.set('No se pudo actualizar el bloque.');
      },
    });
  }

  remove(block: Block): void {
    if (!confirm(`¿Borrar el bloque "${this.typeLabels[block.type]}" (${block.page})? Esta acción es irreversible.`)) {
      return;
    }

    this.blocksService.delete(block.id).subscribe({
      next: () => {
        this.blocks.update((blocks) => blocks.filter((b) => b.id !== block.id));
      },
      error: () => {
        this.errorMessage.set('No se pudo borrar el bloque.');
      },
    });
  }
}
