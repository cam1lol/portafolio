import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

export interface PageItem {
  key: string;
  kind: 'section' | 'block';
  sectionKey?: string;
  blockId?: string;
  sortOrder: number;
}

interface PageItemRow {
  item_key: string;
  page: string;
  item_type: 'section' | 'block';
  section_key: string | null;
  block_id: string | null;
  sort_order: number;
}

@Injectable({ providedIn: 'root' })
export class PageItemsService {
  private readonly supabase = inject(SupabaseService);

  getPageItems(page: string): Observable<PageItem[]> {
    return from(
      this.supabase.client.from('page_items').select('*').eq('page', page).order('sort_order'),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load page items from Supabase', error);
          return [];
        }
        return ((data ?? []) as PageItemRow[]).map((row) => ({
          key: row.item_key,
          kind: row.item_type,
          sectionKey: row.section_key ?? undefined,
          blockId: row.block_id ?? undefined,
          sortOrder: row.sort_order,
        }));
      }),
    );
  }

  savePageOrder(page: string, items: PageItem[]): Observable<void> {
    if (items.length === 0) return of(undefined);

    const rows: PageItemRow[] = items.map((item, index) => ({
      item_key: item.key,
      page,
      item_type: item.kind,
      section_key: item.kind === 'section' ? item.sectionKey ?? null : null,
      block_id: item.kind === 'block' ? item.blockId ?? null : null,
      sort_order: index,
    }));

    return from(
      this.supabase.client.from('page_items').upsert(rows, { onConflict: 'item_key' }),
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to save page item order', error);
          throw error;
        }
      }),
    );
  }
}
