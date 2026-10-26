import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InboxService, InboxStatus, InboxThread, SyncState } from '../../../core/data/inbox.service';

type Filter = InboxStatus | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'read', label: 'Leídos' },
  { value: 'replied', label: 'Respondidos' },
  { value: 'archived', label: 'Archivados' },
];

export const STATUS_LABELS: Record<InboxStatus, string> = {
  new: 'NUEVO',
  read: 'LEÍDO',
  replied: 'RESPONDIDO',
  archived: 'ARCHIVADO',
};

@Component({
  selector: 'app-admin-inbox-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './admin-inbox-list.component.html',
  styleUrl: './admin-inbox-list.component.css',
})
export class AdminInboxListComponent implements OnInit {
  private readonly inbox = inject(InboxService);

  protected readonly filters = FILTERS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly filter = signal<Filter>('all');
  protected readonly threads = signal<InboxThread[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly sync = signal<SyncState | null>(null);

  ngOnInit(): void {
    this.load();
    this.inbox.syncState().subscribe({ next: (state) => this.sync.set(state), error: () => this.sync.set(null) });
  }

  setFilter(value: Filter): void {
    this.filter.set(value);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.inbox.listThreads(this.filter()).subscribe({
      next: (threads) => {
        this.threads.set(threads);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los mensajes. Si es la primera vez, aplica la migración 0007_contact_inbox.sql en Supabase.');
        this.loading.set(false);
      },
    });
  }
}
