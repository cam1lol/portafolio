import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AdminExperience, ExperienceService } from '../../../core/data/experience.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';

@Component({
  selector: 'app-admin-experience-list',
  standalone: true,
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './admin-experience-list.component.html',
  styleUrl: './admin-experience-list.component.css',
})
export class AdminExperienceListComponent implements OnInit {
  private readonly experienceService = inject(ExperienceService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly rows = signal<AdminExperience[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.experienceService.getAll().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la experiencia.');
        this.loading.set(false);
      },
    });
  }

  drop(event: CdkDragDrop<AdminExperience[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const reordered = [...this.rows()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.rows.set(reordered);

    this.experienceService.reorder(reordered.map((row) => row.id)).subscribe({
      error: () => {
        this.errorMessage.set('No se pudo guardar el nuevo orden.');
        this.load();
      },
    });
  }

  togglePublished(row: AdminExperience): void {
    const nextPublished = !row.published;
    this.rows.update((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, published: nextPublished } : r)),
    );

    this.experienceService.update(row.id, { published: nextPublished }).subscribe({
      next: () => this.toast.show(nextPublished ? 'Publicado en el sitio.' : 'Oculto del sitio.'),
      error: () => {
        this.rows.update((rows) =>
          rows.map((r) => (r.id === row.id ? { ...r, published: !nextPublished } : r)),
        );
        this.errorMessage.set(`No se pudo actualizar "${row.company}".`);
      },
    });
  }

  async remove(row: AdminExperience): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar experiencia',
      message: `Se eliminará la experiencia en "${row.company}" con sus logros y subproyectos. Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    this.experienceService.delete(row.id).subscribe({
      next: () => {
        this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
        this.toast.show('Experiencia eliminada.');
      },
      error: () => {
        this.errorMessage.set(`No se pudo borrar "${row.company}".`);
      },
    });
  }
}
