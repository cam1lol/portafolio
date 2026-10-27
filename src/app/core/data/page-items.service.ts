import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, from, map, of, switchMap } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

export interface PageItem {
  key: string;
  kind: 'section' | 'block';
  sectionKey?: string;
  blockId?: string;
  sortOrder: number;
}

/**
 * `before:`/`after:` take a section key; `after-item:` takes any `page_items.item_key`
 * (`section:<key>` or `block:<uuid>`), used by "+ DEBAJO" in the admin structure page.
 */
export type PageBlockPlacement =
  | 'keep'
  | 'start'
  | 'end'
  | `before:${string}`
  | `after:${string}`
  | `after-item:${string}`;

const HOME_SECTIONS = ['hero', 'ticker', 'manifesto', 'projects', 'clients', 'experience', 'testimonials', 'services', 'roadmap', 'comments', 'contact'];

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

  placeBlock(page: string, blockId: string, placement: PageBlockPlacement): Observable<void> {
    if (placement === 'keep') return of(undefined);

    return forkJoin({
      items: this.getPageItems(page),
      blocks: from(
        this.supabase.client.from('blocks').select('id, page, sort_order').eq('page', page).order('sort_order'),
      ),
    }).pipe(
      switchMap(({ items, blocks }) => {
        if (blocks.error) throw blocks.error;

        const ordered = [...items];
        const existingKeys = new Set(ordered.map((item) => item.key));
        if (page === 'home') {
          for (const sectionKey of HOME_SECTIONS) {
            const key = `section:${sectionKey}`;
            if (!existingKeys.has(key)) {
              ordered.push({ key, kind: 'section', sectionKey, sortOrder: ordered.length });
              existingKeys.add(key);
            }
          }
        }

        for (const row of (blocks.data ?? []) as Array<{ id: string; page: string; sort_order: number }>) {
          const key = `block:${row.id}`;
          if (!existingKeys.has(key)) {
            ordered.push({ key, kind: 'block', blockId: row.id, sortOrder: row.sort_order });
            existingKeys.add(key);
          }
        }

        const blockKey = `block:${blockId}`;
        const withoutTarget = ordered.filter((item) => item.key !== blockKey);
        let targetIndex = withoutTarget.length;
        if (placement === 'start') {
          targetIndex = 0;
        } else if (placement.startsWith('after-item:')) {
          const itemKey = placement.slice('after-item:'.length);
          const itemIndex = withoutTarget.findIndex((item) => item.key === itemKey);
          if (itemIndex >= 0) targetIndex = itemIndex + 1;
        } else if (placement !== 'end') {
          const [position, sectionKey] = placement.split(':');
          const sectionIndex = withoutTarget.findIndex(
            (item) => item.kind === 'section' && item.sectionKey === sectionKey,
          );
          if (sectionIndex >= 0) targetIndex = sectionIndex + (position === 'after' ? 1 : 0);
        }

        withoutTarget.splice(targetIndex, 0, {
          key: blockKey,
          kind: 'block',
          blockId,
          sortOrder: targetIndex,
        });
        return this.savePageOrder(page, withoutTarget);
      }),
    );
  }
}
