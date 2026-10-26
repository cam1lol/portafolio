import { AfterViewInit, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { CommentRow, CommentsService } from '../../../core/data/comments.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { ToastService } from '../shared/toast.service';

type Filter = 'all' | 'pending' | 'approved';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
];

@Component({
  selector: 'app-admin-comments',
  standalone: true,
  imports: [DatePipe, UpperCasePipe],
  templateUrl: './admin-comments.component.html',
  styleUrl: './admin-comments.component.css',
})
export class AdminCommentsComponent implements AfterViewInit, OnDestroy {
  private readonly commentsService = inject(CommentsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly filters = FILTERS;
  protected readonly comments = signal<CommentRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly newIds = signal<Set<string>>(new Set());
  protected readonly filter = signal<Filter>('all');
  protected readonly selected = signal<Set<string>>(new Set());

  protected readonly visible = computed(() => {
    const filter = this.filter();
    return this.comments().filter((c) => filter === 'all' || (filter === 'approved' ? c.approved : !c.approved));
  });
  protected readonly pendingCount = computed(() => this.comments().filter((c) => !c.approved).length);
  protected readonly allVisibleSelected = computed(
    () => this.visible().length > 0 && this.visible().every((c) => this.selected().has(c.id)),
  );

  private watchSubscription: Subscription | undefined;

  ngAfterViewInit(): void {
    this.load();
    this.watchSubscription = this.commentsService.watchNew().subscribe((comment) => {
      this.comments.update((current) => [comment, ...current.filter((c) => c.id !== comment.id)]);
      this.newIds.update((current) => new Set(current).add(comment.id));
    });
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
    this.selected.set(new Set());
  }

  toggleSelected(id: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    this.selected.set(this.allVisibleSelected() ? new Set() : new Set(this.visible().map((c) => c.id)));
  }

  approve(comment: CommentRow): void {
    this.commentsService.approve(comment.id).subscribe({
      next: () => {
        this.patch([comment.id], { approved: true });
        this.toast.show('Comentario aprobado: ya se ve en el sitio.');
      },
      error: () => this.toast.show('No se pudo aprobar el comentario.', 'error'),
    });
  }

  hide(comment: CommentRow): void {
    this.commentsService.hide(comment.id).subscribe({
      next: () => {
        this.patch([comment.id], { approved: false });
        this.toast.show('Comentario oculto del sitio.');
      },
      error: () => this.toast.show('No se pudo ocultar el comentario.', 'error'),
    });
  }

  async remove(comment: CommentRow): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar comentario',
      message: `Se eliminará el comentario de "${comment.author}". Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    this.commentsService.delete(comment.id).subscribe({
      next: () => {
        this.drop([comment.id]);
        this.toast.show('Comentario eliminado.');
      },
      error: () => this.toast.show('No se pudo eliminar el comentario.', 'error'),
    });
  }

  approveSelected(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    this.commentsService.approveMany(ids).subscribe({
      next: () => {
        this.patch(ids, { approved: true });
        this.selected.set(new Set());
        this.toast.show(ids.length === 1 ? '1 comentario aprobado.' : `${ids.length} comentarios aprobados.`);
      },
      error: () => this.toast.show('No se pudieron aprobar los comentarios.', 'error'),
    });
  }

  async deleteSelected(): Promise<void> {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar comentarios',
      message: `Se eliminarán ${ids.length} comentario(s). Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    this.commentsService.deleteMany(ids).subscribe({
      next: () => {
        this.drop(ids);
        this.selected.set(new Set());
        this.toast.show(ids.length === 1 ? '1 comentario eliminado.' : `${ids.length} comentarios eliminados.`);
      },
      error: () => this.toast.show('No se pudieron eliminar los comentarios.', 'error'),
    });
  }

  isNew(id: string): boolean {
    return this.newIds().has(id);
  }

  ngOnDestroy(): void {
    this.watchSubscription?.unsubscribe();
  }

  private load(): void {
    this.loading.set(true);
    this.commentsService.getAll().subscribe((comments) => {
      this.comments.set(comments);
      this.loading.set(false);
    });
  }

  private patch(ids: string[], changes: Partial<CommentRow>): void {
    const set = new Set(ids);
    this.comments.update((current) => current.map((c) => (set.has(c.id) ? { ...c, ...changes } : c)));
    this.clearNew(ids);
  }

  private drop(ids: string[]): void {
    const set = new Set(ids);
    this.comments.update((current) => current.filter((c) => !set.has(c.id)));
    this.clearNew(ids);
  }

  private clearNew(ids: string[]): void {
    this.newIds.update((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }
}
