import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AdminProject, ProjectsService } from '../../../core/data/projects.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { IconComponent } from '../../../shared/icons/icon.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header.component';

@Component({
  selector: 'app-admin-projects-list',
  standalone: true,
  imports: [AdminPageHeaderComponent, IconComponent, RouterLink, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './admin-projects-list.component.html',
  styleUrl: './admin-projects-list.component.css',
})
export class AdminProjectsListComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly statusLabels: Record<AdminProject['status'], string> = { live: 'EN VIVO', wip: 'EN PROGRESO', archive: 'ARCHIVADO' };
  protected readonly rows = signal<AdminProject[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.projectsService.getAll().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los proyectos.');
        this.loading.set(false);
      },
    });
  }

  drop(event: CdkDragDrop<AdminProject[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const reordered = [...this.rows()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.rows.set(reordered);

    this.projectsService.reorder(reordered.map((row) => row.id)).subscribe({
      error: () => {
        this.errorMessage.set('No se pudo guardar el nuevo orden.');
        this.load();
      },
    });
  }

  togglePublished(row: AdminProject): void {
    const nextPublished = !row.published;
    this.rows.update((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, published: nextPublished } : r)),
    );

    this.projectsService.update(row.id, { published: nextPublished }).subscribe({
      next: () => this.toast.show(nextPublished ? 'Publicado en el sitio.' : 'Oculto del sitio.'),
      error: () => {
        this.rows.update((rows) =>
          rows.map((r) => (r.id === row.id ? { ...r, published: !nextPublished } : r)),
        );
        this.errorMessage.set(`No se pudo actualizar "${row.name}".`);
      },
    });
  }

  async remove(row: AdminProject): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar proyecto',
      message: `Se eliminará el proyecto "${row.name}" con sus textos en ES/EN. Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    this.projectsService.delete(row.id).subscribe({
      next: () => {
        this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
        this.toast.show('Proyecto eliminado.');
      },
      error: () => {
        this.errorMessage.set(`No se pudo borrar "${row.name}".`);
      },
    });
  }
}
