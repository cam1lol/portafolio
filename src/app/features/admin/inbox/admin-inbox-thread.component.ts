import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InboxMessage, InboxService, InboxThread } from '../../../core/data/inbox.service';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { STATUS_LABELS } from './admin-inbox-list.component';

const SOURCE_LABELS: Record<InboxMessage['source'], string> = { form: 'FORMULARIO', panel: 'PANEL', gmail: 'GMAIL' };

@Component({
  selector: 'app-admin-inbox-thread',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe, ReactiveFormsModule],
  templateUrl: './admin-inbox-thread.component.html',
  styleUrl: './admin-inbox-thread.component.css',
})
export class AdminInboxThreadComponent implements OnInit {
  private readonly inbox = inject(InboxService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly sourceLabels = SOURCE_LABELS;
  protected readonly thread = signal<InboxThread | null>(null);
  protected readonly messages = signal<InboxMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');

  protected readonly reply = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(10000), noControlCharsValidator({ allowNewlines: true })],
  });

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  ngOnInit(): void {
    this.load(true);
    this.inbox
      .watchThread(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        this.messages.update((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
        this.load(false);
      });
  }

  send(): void {
    const thread = this.thread();
    const body = this.reply.value.trim();
    this.reply.markAsTouched();
    if (!thread || !body || this.reply.invalid || this.sending()) return;

    this.sending.set(true);
    this.errorMessage.set('');
    this.inbox.reply(thread.id, body).subscribe({
      next: () => {
        this.sending.set(false);
        this.reply.reset();
        this.notice.set('Respuesta enviada desde tu Gmail.');
        this.load(false);
      },
      error: () => {
        this.sending.set(false);
        this.errorMessage.set('No se pudo enviar la respuesta por Gmail. El texto sigue en la caja; revisa la conexión con Gmail e inténtalo de nuevo.');
      },
    });
  }

  toggleArchive(): void {
    const thread = this.thread();
    if (!thread) return;
    const next = thread.status === 'archived' ? 'read' : 'archived';
    this.inbox.setStatus(thread.id, next).subscribe({
      next: () => this.thread.set({ ...thread, status: next }),
      error: () => this.errorMessage.set('No se pudo cambiar el estado.'),
    });
  }

  async remove(): Promise<void> {
    const thread = this.thread();
    if (!thread) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar conversación',
      message: `Se eliminará la conversación con "${thread.name}" del panel. En Gmail no se borra nada.`,
    });
    if (!confirmed) return;
    this.inbox.deleteThread(thread.id).subscribe({
      next: () => this.router.navigate(['/admin/inbox']),
      error: () => this.errorMessage.set('No se pudo eliminar la conversación.'),
    });
  }

  /** `markAsRead` only on the first load, so a reply arriving while open keeps it "new" until reopened. */
  private load(markAsRead: boolean): void {
    this.inbox.getThread(this.id).subscribe({
      next: ({ thread, messages }) => {
        this.thread.set(thread);
        this.messages.set(messages);
        this.loading.set(false);
        if (markAsRead && thread.status === 'new') {
          this.inbox.markRead(thread).subscribe(() => this.thread.set({ ...thread, status: 'read' }));
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se encontró esta conversación.');
      },
    });
  }
}
