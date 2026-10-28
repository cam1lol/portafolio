import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, from, map, of, switchMap } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

/** Simple ordered lists editable from the admin (migrations 0005, 0012 and 0014). */
export type CollectionTable = 'services' | 'roadmap_items' | 'ticker_items' | 'clients' | 'testimonials' | 'lab_items' | 'log_entries';

/** Rows keep Supabase's snake_case column names; field names in the admin config match them 1:1. */
export interface CollectionRow {
  id: string;
  sort_order: number;
  published: boolean;
  [column: string]: string | number | boolean;
}

export type CollectionValues = Record<string, string | boolean>;

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Public read of published rows. Emits `null` when the query fails (e.g. migration 0005
   * not applied yet) so sections can keep their built-in content instead of rendering empty.
   */
  getPublished(table: CollectionTable): Observable<CollectionRow[] | null> {
    return from(
      this.supabase.client.from(table).select('*').eq('published', true).order('sort_order'),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error(`Failed to load ${table} from Supabase`, error);
          return null;
        }
        return (data ?? []) as CollectionRow[];
      }),
    );
  }

  getAll(table: CollectionTable): Observable<CollectionRow[]> {
    return from(this.supabase.client.from(table).select('*').order('sort_order')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as CollectionRow[];
      }),
    );
  }

  getById(table: CollectionTable, id: string): Observable<CollectionRow | null> {
    return from(this.supabase.client.from(table).select('*').eq('id', id).maybeSingle()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as CollectionRow | null) ?? null;
      }),
    );
  }

  /** New rows go to the end of the list. */
  create(table: CollectionTable, values: CollectionValues): Observable<void> {
    return from(
      this.supabase.client.from(table).select('sort_order').order('sort_order', { ascending: false }).limit(1),
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        const last = (data?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1;
        return from(this.supabase.client.from(table).insert({ ...values, sort_order: last + 1 }));
      }),
      map(({ error }) => {
        if (error) {
          console.error(`Failed to create ${table} row`, error);
          throw error;
        }
      }),
    );
  }

  update(table: CollectionTable, id: string, values: CollectionValues): Observable<void> {
    return from(this.supabase.client.from(table).update(values).eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error(`Failed to update ${table} row`, error);
          throw error;
        }
      }),
    );
  }

  delete(table: CollectionTable, id: string): Observable<void> {
    return from(this.supabase.client.from(table).delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error(`Failed to delete ${table} row`, error);
          throw error;
        }
      }),
    );
  }

  reorder(table: CollectionTable, ids: string[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    return forkJoin(
      ids.map((id, index) =>
        from(this.supabase.client.from(table).update({ sort_order: index }).eq('id', id)).pipe(
          map(({ error }) => {
            if (error) throw error;
          }),
        ),
      ),
    ).pipe(map(() => undefined));
  }
}
