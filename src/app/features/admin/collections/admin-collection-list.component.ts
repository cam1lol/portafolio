import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CollectionRow, CollectionsService } from '../../../core/data/collections.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { COLLECTIONS, CollectionConfig } from './collection.config';
import { AdminPageHeaderComponent } from '../shared/admin-page-header.component';

/** Una sola pantalla de lista para todas las colecciones simples (Servicios, Roadmap, Ticker...), según `data.collection`. */
@Component({
  selector: 'app-admin-collection-list',
  standalone: true,
  imports: [AdminPageHeaderComponent, RouterLink, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './admin-collection-list.component.html',
  styleUrl: './admin-collection-list.component.css',
})
export class AdminCollectionListComponent implements OnInit {
  private readonly collections = inject(CollectionsService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly config: CollectionConfig = COLLECTIONS[inject(ActivatedRoute).snapshot.data['collection']];
  protected readonly rows = signal<CollectionRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected title(row: CollectionRow): string {
    return String(row[this.config.listTitle] ?? '') || 'Sin título';
  }

  protected detail(row: CollectionRow): string {
    return this.config.listDetail ? String(row[this.config.listDetail] ?? '') : '';
  }

  drop(event: CdkDragDrop<CollectionRow[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.rows()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.rows.set(reordered);

    this.collections.reorder(this.config.table, reordered.map((row) => row.id)).subscribe({
      error: () => {
        this.errorMessage.set('No se pudo guardar el nuevo orden.');
        this.load();
      },
    });
  }

  togglePublished(row: CollectionRow): void {
    const published = !row.published;
    this.patch(row.id, { published });
    this.collections.update(this.config.table, row.id, { published }).subscribe({
      next: () => this.toast.show(published ? 'Publicado en el sitio.' : 'Oculto del sitio.'),
      error: () => {
        this.patch(row.id, { published: !published });
        this.errorMessage.set(`No se pudo actualizar "${this.title(row)}".`);
      },
    });
  }

  async remove(row: CollectionRow): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: `Eliminar ${this.config.singular}`,
      message: `Se eliminará "${this.title(row)}" de ${this.config.title}. Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;

    this.collections.delete(this.config.table, row.id).subscribe({
      next: () => {
        this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
        this.toast.show('Elemento eliminado.');
      },
      error: () => this.errorMessage.set(`No se pudo eliminar "${this.title(row)}".`),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.collections.getAll(this.config.table).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          `No se pudo cargar ${this.config.title}. Si es la primera vez, aplica la migración ${this.config.migration ?? '0005_site_content.sql'} en Supabase.`,
        );
        this.loading.set(false);
      },
    });
  }

  private patch(id: string, values: Partial<CollectionRow>): void {
    this.rows.update((rows) => rows.map((r) => (r.id === id ? ({ ...r, ...values } as CollectionRow) : r)));
  }
}
