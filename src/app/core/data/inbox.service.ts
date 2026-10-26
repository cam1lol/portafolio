import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, from, map, of, tap } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { ContactTopic } from './contact.service';

export type InboxStatus = 'new' | 'read' | 'replied' | 'archived';

export interface InboxThread {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  lang: 'es' | 'en';
  status: InboxStatus;
  createdAt: string;
  lastMessageAt: string;
  preview: string;
}

export interface InboxMessage {
  id: string;
  body: string;
  createdAt: string;
}

export const TOPIC_LABELS: Record<ContactTopic, string> = { project: 'Proyecto', job: 'Oferta de trabajo', other: 'Otra cosa' };

interface ThreadRow {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  lang: 'es' | 'en';
  status: InboxStatus;
  created_at: string;
  last_message_at: string;
  contact_messages?: Array<{ body: string; created_at: string }>;
}

const PREVIEW_LENGTH = 140;
const THREAD_COLUMNS = 'id, name, email, topic, lang, status, created_at, last_message_at';

/**
 * Admin side of the contact inbox (v2). Messages arrive by email through Web3Forms and are
 * kept here as a backup; Camilo answers from Gmail and tracks the status in the panel.
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
        this.supabase.client.from('contact_messages').select('id, body, created_at').eq('thread_id', id).order('created_at', { ascending: true }),
      ),
    }).pipe(
      map(({ thread, messages }) => {
        if (thread.error) throw thread.error;
        if (messages.error) throw messages.error;
        if (!thread.data) throw new Error('Conversation not found');
        return {
          thread: this.toThread(thread.data as ThreadRow),
          messages: ((messages.data ?? []) as Array<{ id: string; body: string; created_at: string }>).map((row) => ({
            id: row.id,
            body: row.body,
            createdAt: row.created_at,
          })),
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

  markReplied(id: string): Observable<void> {
    return this.setStatus(id, 'replied');
  }

  setStatus(id: string, status: Exclude<InboxStatus, 'new'>): Observable<void> {
    return this.write(this.supabase.client.from('contact_threads').update({ status }).eq('id', id)).pipe(
      tap(() => this.refreshUnread()),
    );
  }

  deleteThread(id: string): Observable<void> {
    return this.write(this.supabase.client.from('contact_threads').delete().eq('id', id)).pipe(tap(() => this.refreshUnread()));
  }

  /** `mailto:` that opens Camilo's mail client with the subject and the visitor's message quoted. */
  replyMailto(thread: InboxThread, message: string): string {
    const quoted = message
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    const params = new URLSearchParams({
      subject: `Re: ${TOPIC_LABELS[thread.topic]} · Camilo Ayala`,
      body: `Hola ${thread.name},\n\n\n\n--\nCamilo Ayala\n\n${quoted}`,
    });
    // URLSearchParams encodes spaces as "+", which mail clients show literally.
    return `mailto:${thread.email}?${params.toString().replace(/\+/g, '%20')}`;
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
      topic: row.topic,
      lang: row.lang,
      status: row.status,
      createdAt: row.created_at,
      lastMessageAt: row.last_message_at,
      preview: (latest?.body ?? '').replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LENGTH),
    };
  }
}
