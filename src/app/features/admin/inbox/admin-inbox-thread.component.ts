import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InboxMessage, InboxService, InboxThread, TOPIC_LABELS } from '../../../core/data/inbox.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { ToastService } from '../shared/toast.service';
import { STATUS_LABELS } from './admin-inbox-list.component';

@Component({
  selector: 'app-admin-inbox-thread',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './admin-inbox-thread.component.html',
  styleUrl: './admin-inbox-thread.component.css',
})
export class AdminInboxThreadComponent implements OnInit {
  private readonly inbox = inject(InboxService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly topicLabels = TOPIC_LABELS;
  protected readonly thread = signal<InboxThread | null>(null);
  protected readonly messages = signal<InboxMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  /** Gmail se abre con el asunto y el mensaje del visitante citado. */
  protected readonly mailto = computed(() => {
    const thread = this.thread();
    return thread ? this.inbox.replyMailto(thread, this.messages().map((message) => message.body).join('\n\n')) : '';
  });

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  ngOnInit(): void {
    this.inbox.getThread(this.id).subscribe({
      next: ({ thread, messages }) => {
        this.thread.set(thread);
        this.messages.set(messages);
        this.loading.set(false);
        if (thread.status === 'new') {
          this.inbox.markRead(thread).subscribe(() => this.thread.set({ ...thread, status: 'read' }));
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se encontró esta conversación.');
      },
    });
  }

  /** El enlace mailto abre el correo; a la vez la conversación se marca como respondida. */
  onReply(): void {
    const thread = this.thread();
    if (!thread || thread.status === 'replied') return;
    this.inbox.markReplied(thread.id).subscribe({
      next: () => this.thread.set({ ...thread, status: 'replied' }),
      error: () => this.errorMessage.set('Se abrió tu correo, pero no se pudo marcar como respondida.'),
    });
  }

  toggleArchive(): void {
    const thread = this.thread();
    if (!thread) return;
    const next = thread.status === 'archived' ? 'read' : 'archived';
    this.inbox.setStatus(thread.id, next).subscribe({
      next: () => {
        this.thread.set({ ...thread, status: next });
        this.toast.show(next === 'archived' ? 'Conversación archivada.' : 'Conversación reabierta.');
      },
      error: () => this.errorMessage.set('No se pudo cambiar el estado.'),
    });
  }

  async remove(): Promise<void> {
    const thread = this.thread();
    if (!thread) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar conversación',
      message: `Se eliminará el mensaje de "${thread.name}" del panel. El correo en Gmail no se borra.`,
    });
    if (!confirmed) return;
    this.inbox.deleteThread(thread.id).subscribe({
      next: () => {
        this.toast.show('Conversación eliminada.');
        this.router.navigate(['/admin/inbox']);
      },
      error: () => this.errorMessage.set('No se pudo eliminar la conversación.'),
    });
  }
}
