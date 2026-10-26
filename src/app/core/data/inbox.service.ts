import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, from, map, of, tap } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

export type InboxStatus = 'new' | 'read' | 'replied' | 'archived';

export interface InboxThread {
  id: string;
  name: string;
  email: string;
  subject: string;
  lang: 'es' | 'en';
  status: InboxStatus;
  syncError: string | null;
  createdAt: string;
  lastMessageAt: string;
  preview: string;
}

export interface InboxMessage {
  id: string;
  direction: 'in' | 'out';
  body: string;
  source: 'form' | 'panel' | 'gmail';
  createdAt: string;
}

export interface SyncState {
  lastSyncAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

interface ThreadRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  lang: 'es' | 'en';
  status: InboxStatus;
  sync_error: string | null;
  created_at: string;
  last_message_at: string;
  contact_messages?: Array<{ body: string; created_at: string }>;
}

interface MessageRow {
  id: string;
  direction: 'in' | 'out';
  body: string;
  source: 'form' | 'panel' | 'gmail';
  created_at: string;
}

const PREVIEW_LENGTH = 140;
const THREAD_COLUMNS = 'id, name, email, subject, lang, status, sync_error, created_at, last_message_at';

/**
 * Admin side of the contact inbox. Reads go straight to the RLS-protected tables;
 * replies go through the `contact-reply` Edge Function, which talks to Gmail.
 */
@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly supabase = inject(SupabaseService);
  private unreadChannel: RealtimeChannel | null = null;

  /** Conversations in `new`, shown as a badge in the admin menu. */
  readonly unreadCount = signal(0);

  listThreads(status: InboxStatus | 'all'): Observable<InboxThread[]> {
    let query = this.supabase.client
      .from('contact_threads')
      .select(`${THREAD_COLUMNS}, contact_messages(body, created_at)`)
      .order('last_message_at', { ascending: false });
    if (status !== 'all') query = query.eq('status', status);

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return ((data ?? []) as ThreadRow[]).map((row) => this.toThread(row));
      }),
    );
  }

  getThread(id: string): Observable<{ thread: InboxThread; messages: InboxMessage[] }> {
    return forkJoin({
      thread: from(this.supabase.client.from('contact_threads').select(THREAD_COLUMNS).eq('id', id).maybeSingle()),
      messages: from(
        this.supabase.client
          .from('contact_messages')
          .select('id, direction, body, source, created_at')
          .eq('thread_id', id)
          .order('created_at', { ascending: true }),
      ),
    }).pipe(
      map(({ thread, messages }) => {
        if (thread.error) throw thread.error;
        if (messages.error) throw messages.error;
        if (!thread.data) throw new Error('Conversation not found');
        return {
          thread: this.toThread(thread.data as ThreadRow),
          messages: ((messages.data ?? []) as MessageRow[]).map((row) => this.toMessage(row)),
        };
      }),
    );
  }

  /** Opening a new conversation marks it read; any other status is left alone. */
  markRead(thread: InboxThread): Observable<void> {
    if (thread.status !== 'new') return of(undefined);
    return this.write(
      this.supabase.client.from('contact_threads').update({ status: 'read' }).eq('id', thread.id).eq('status', 'new'),
    ).pipe(tap(() => this.refreshUnread()));
  }

  setStatus(id: string, status: 'archived' | 'read'): Observable<void> {
    return this.write(this.supabase.client.from('contact_threads').update({ status }).eq('id', id)).pipe(
      tap(() => this.refreshUnread()),
    );
  }

  deleteThread(id: string): Observable<void> {
    return this.write(this.supabase.client.from('contact_threads').delete().eq('id', id)).pipe(tap(() => this.refreshUnread()));
  }

  /** Sends through Gmail; the stored message arrives through `watchThread`. */
  reply(threadId: string, body: string): Observable<void> {
    return from(this.supabase.client.functions.invoke('contact-reply', { body: { threadId, body } })).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  syncState(): Observable<SyncState> {
    return from(
      this.supabase.client.from('contact_sync_state').select('last_sync_at, last_error, last_error_at').eq('id', 1).maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const row = data as { last_sync_at: string | null; last_error: string | null; last_error_at: string | null } | null;
        return { lastSyncAt: row?.last_sync_at ?? null, lastError: row?.last_error ?? null, lastErrorAt: row?.last_error_at ?? null };
      }),
    );
  }

  /** New messages of one conversation (panel replies and Gmail sync) in real time. */
  watchThread(id: string): Observable<InboxMessage> {
    return new Observable<InboxMessage>((subscriber) => {
      const channel = this.supabase.client
        .channel(`contact-thread-${id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'contact_messages', filter: `thread_id=eq.${id}` },
          (payload) => subscriber.next(this.toMessage(payload.new as MessageRow)),
        )
        .subscribe();
      return () => {
        this.supabase.client.removeChannel(channel);
      };
    });
  }

  /** Called by the admin layout: loads the badge and keeps it current. */
  startUnreadWatch(): void {
    this.refreshUnread();
    if (this.unreadChannel) return;
    this.unreadChannel = this.supabase.client
      .channel('contact-threads-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_threads' }, () => this.refreshUnread())
      .subscribe();
  }

  stopUnreadWatch(): void {
    if (!this.unreadChannel) return;
    this.supabase.client.removeChannel(this.unreadChannel);
    this.unreadChannel = null;
  }

  refreshUnread(): void {
    this.supabase.client
      .from('contact_threads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count, error }) => {
        if (!error) this.unreadCount.set(count ?? 0);
      });
  }

  private write(query: PromiseLike<{ error: unknown }>): Observable<void> {
    return from(query).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  private toThread(row: ThreadRow): InboxThread {
    const latest = [...(row.contact_messages ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      lang: row.lang,
      status: row.status,
      syncError: row.sync_error,
      createdAt: row.created_at,
      lastMessageAt: row.last_message_at,
      preview: (latest?.body ?? '').replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LENGTH),
    };
  }

  private toMessage(row: MessageRow): InboxMessage {
    return { id: row.id, direction: row.direction, body: row.body, source: row.source, createdAt: row.created_at };
  }
}
