import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Forma de la tabla `comments`. RLS: `anon` puede insertar (entra con `approved=false`) y leer solo
 * las aprobadas; los admins (`is_admin()`) leen, actualizan y borran todo.
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

  /** Listado del admin: primero los pendientes y, dentro de cada grupo, los más nuevos. */
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

  /** Lectura pública: RLS solo devuelve las aprobadas; las más nuevas primero. */
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
   * Envío público. Anon solo tiene permiso sobre `author`, `lang` y `body` (migración 0002) y la fila
   * siempre entra pendiente. Sin `.select()`: anon no puede leer su propia fila pendiente.
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
          throw error;
        }
      }),
    );
  }

  hide(id: string): Observable<void> {
    return from(this.supabase.client.from('comments').update({ approved: false }).eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to hide comment', error);
          throw error;
        }
      }),
    );
  }

  /** Aprobación en lote desde la pantalla de moderación. */
  approveMany(ids: string[]): Observable<void> {
    return from(this.supabase.client.from('comments').update({ approved: true }).in('id', ids)).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  deleteMany(ids: string[]): Observable<void> {
    return from(this.supabase.client.from('comments').delete().in('id', ids)).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  /** Borrado definitivo, distinto de `hide` (que solo cambia `approved`). */
  delete(id: string): Observable<void> {
    return from(this.supabase.client.from('comments').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to delete comment', error);
          throw error;
        }
      }),
    );
  }

  /**
   * Se suscribe a Supabase Realtime y emite `payload.new` en cada INSERT de `comments`. Al
   * desuscribirse, el Observable cierra el canal (`supabase.client.removeChannel`).
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
