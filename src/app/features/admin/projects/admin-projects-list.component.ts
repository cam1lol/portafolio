import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AdminProject, ProjectsService } from '../../../core/data/projects.service';

@Component({
  selector: 'app-admin-projects-list',
  standalone: true,
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './admin-projects-list.component.html',
  styleUrl: './admin-projects-list.component.css',
})
export class AdminProjectsListComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);

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
      error: () => {
        this.rows.update((rows) =>
          rows.map((r) => (r.id === row.id ? { ...r, published: !nextPublished } : r)),
        );
        this.errorMessage.set(`No se pudo actualizar "${row.name}".`);
      },
    });
  }

  remove(row: AdminProject): void {
    if (!confirm(`¿Borrar el proyecto "${row.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.projectsService.delete(row.id).subscribe({
      next: () => {
        this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
      },
      error: () => {
        this.errorMessage.set(`No se pudo borrar "${row.name}".`);
      },
    });
  }
}
