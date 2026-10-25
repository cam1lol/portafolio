import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Row shape of the `comments` table. RLS: `anon` can `insert` (lands with
 * `approved=false`) and `select` only rows where `approved=true`;
 * authenticated admins (`is_admin()`) can read/update/delete everything.
 */
export interface CommentRow {
  id: string;
  author: string;
  lang: string;
  body: string;
  approved: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly supabase = inject(SupabaseService);

  /** Admin listing: pending comments first, newest first within each group. */
  getAll(): Observable<CommentRow[]> {
    return from(
      this.supabase.client
        .from('comments')
        .select('*')
        .order('approved', { ascending: true })
        .order('created_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load comments from Supabase', error);
          return [];
        }
        return (data ?? []) as CommentRow[];
      }),
    );
  }

  /** Public read: RLS only returns approved rows; newest first. */
  getApproved(limit = 30): Observable<CommentRow[] | null> {
    return from(
      this.supabase.client
        .from('comments')
        .select('id, author, lang, body, approved, created_at')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(limit),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load approved comments', error);
          return null;
        }
        return (data ?? []) as CommentRow[];
      }),
    );
  }

  /**
   * Public submit. Only `author`, `lang` and `body` are granted to anon (migration 0002), and the
   * row always lands pending. No `.select()`: anon cannot read its own pending row back.
   */
  submit(author: string, body: string, lang: 'es' | 'en'): Observable<void> {
    return from(this.supabase.client.from('comments').insert({ author, body, lang })).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to submit comment', error);
          throw error;
        }
      }),
    );
  }

  approve(id: string): Observable<void> {
    return from(this.supabase.client.from('comments').update({ approved: true }).eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to approve comment', error);
        }
      }),
    );
  }

  hide(id: string): Observable<void> {
    return from(this.supabase.client.from('comments').update({ approved: false }).eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to hide comment', error);
        }
      }),
    );
  }

  /** Permanent delete, separate from `hide` (which only flips `approved`). */
  delete(id: string): Observable<void> {
    return from(this.supabase.client.from('comments').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to delete comment', error);
        }
      }),
    );
  }

  /**
   * Subscribes to Supabase Realtime for new rows inserted into `comments`.
   * Emits `payload.new` on every INSERT. The returned Observable cleans up
   * the channel (via `supabase.client.removeChannel`) on unsubscribe.
   */
  watchNew(): Observable<CommentRow> {
    return new Observable<CommentRow>((subscriber) => {
      const channel: RealtimeChannel = this.supabase.client
        .channel('comments-inserts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'comments' },
          (payload) => {
            subscriber.next(payload.new as CommentRow);
          },
        )
        .subscribe();

      return () => {
        this.supabase.client.removeChannel(channel);
      };
    });
  }
}
