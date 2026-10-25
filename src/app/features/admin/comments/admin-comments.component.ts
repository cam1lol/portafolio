import { AfterViewInit, Component, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { CommentRow, CommentsService } from '../../../core/data/comments.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';

@Component({
  selector: 'app-admin-comments',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-comments.component.html',
  styleUrl: './admin-comments.component.css',
})
export class AdminCommentsComponent implements AfterViewInit, OnDestroy {
  private readonly commentsService = inject(CommentsService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly comments = signal<CommentRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly newIds = signal<Set<string>>(new Set());

  private watchSubscription: Subscription | undefined;

  ngAfterViewInit(): void {
    this.load();
    this.watchSubscription = this.commentsService.watchNew().subscribe((comment) => {
      this.comments.update((current) => [comment, ...current.filter((c) => c.id !== comment.id)]);
      this.newIds.update((current) => new Set(current).add(comment.id));
    });
  }

  private load(): void {
    this.loading.set(true);
    this.commentsService.getAll().subscribe((comments) => {
      this.comments.set(comments);
      this.loading.set(false);
    });
  }

  approve(comment: CommentRow): void {
    this.commentsService.approve(comment.id).subscribe(() => {
      this.comments.update((current) =>
        current.map((c) => (c.id === comment.id ? { ...c, approved: true } : c)),
      );
      this.clearNew(comment.id);
    });
  }

  hide(comment: CommentRow): void {
    this.commentsService.hide(comment.id).subscribe(() => {
      this.comments.update((current) =>
        current.map((c) => (c.id === comment.id ? { ...c, approved: false } : c)),
      );
      this.clearNew(comment.id);
    });
  }

  async remove(comment: CommentRow): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar comentario',
      message: `Se eliminará el comentario de "${comment.author}". Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    this.commentsService.delete(comment.id).subscribe(() => {
      this.comments.update((current) => current.filter((c) => c.id !== comment.id));
      this.clearNew(comment.id);
    });
  }

  isNew(id: string): boolean {
    return this.newIds().has(id);
  }

  private clearNew(id: string): void {
    this.newIds.update((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  ngOnDestroy(): void {
    this.watchSubscription?.unsubscribe();
  }
}
