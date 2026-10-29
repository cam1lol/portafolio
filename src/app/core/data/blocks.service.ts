import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, from, map, of } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { Block } from './block.model';

/** Forma de las filas de la tabla `blocks` (snake_case). */
interface BlockRow {
  id: string;
  type: Block['type'];
  page: string;
  config: Record<string, unknown>;
  sort_order: number;
  published: boolean;
}

@Injectable({ providedIn: 'root' })
export class BlocksService {
  private readonly supabase = inject(SupabaseService);

  /** Lectura pública: solo los bloques publicados de una página, en orden. */
  getPublished(page: string): Observable<Block[]> {
    return from(
      this.supabase.client
        .from('blocks')
        .select('*')
        .eq('page', page)
        .eq('published', true)
        .order('sort_order'),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load published blocks from Supabase', error);
          return [];
        }
        return ((data ?? []) as BlockRow[]).map((row) => this.toBlock(row));
      }),
    );
  }

  /** Lectura del admin: todos los bloques, publicados o no. */
  getAll(): Observable<Block[]> {
    return from(this.supabase.client.from('blocks').select('*').order('sort_order')).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load blocks from Supabase', error);
          return [];
        }
        return ((data ?? []) as BlockRow[]).map((row) => this.toBlock(row));
      }),
    );
  }

  create(block: Omit<Block, 'id'>): Observable<Block> {
    return from(
      this.supabase.client
        .from('blocks')
        .insert({
          type: block.type,
          page: block.page,
          config: block.config,
          sort_order: block.sortOrder,
          published: block.published,
        })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) {
          throw error ?? new Error('Failed to create block');
        }
        return this.toBlock(data as BlockRow);
      }),
    );
  }

  update(id: string, partial: Partial<Block>): Observable<void> {
    const patch: Partial<BlockRow> = {};
    if (partial.type !== undefined) patch.type = partial.type;
    if (partial.page !== undefined) patch.page = partial.page;
    if (partial.config !== undefined) patch.config = partial.config;
    if (partial.sortOrder !== undefined) patch.sort_order = partial.sortOrder;
    if (partial.published !== undefined) patch.published = partial.published;

    return from(this.supabase.client.from('blocks').update(patch).eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to update block', error);
          throw error;
        }
      }),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.supabase.client.from('blocks').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to delete block', error);
          throw error;
        }
      }),
    );
  }

  /** Guarda un orden nuevo actualizando `sort_order` en lote. */
  reorder(ids: string[]): Observable<void[]> {
    if (ids.length === 0) {
      return of([]);
    }
    const updates = ids.map((id, index) =>
      from(this.supabase.client.from('blocks').update({ sort_order: index }).eq('id', id)).pipe(
        map(({ error }) => {
          if (error) {
            console.error('Failed to reorder block', error);
            throw error;
          }
        }),
      ),
    );
    return forkJoin(updates);
  }

  private toBlock(row: BlockRow): Block {
    return {
      id: row.id,
      type: row.type,
      page: row.page,
      config: row.config ?? {},
      sortOrder: row.sort_order,
      published: row.published,
    };
  }
}
