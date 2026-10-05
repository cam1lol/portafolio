import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

interface SectionVisibilityRow {
  section: string;
  visible: boolean;
}

/** Fixed display order for the 7 known sections — the table has no order column. */
const SECTION_ORDER = [
  'hero',
  'manifesto',
  'projects',
  'experience',
  'services',
  'roadmap',
  'contact',
] as const;

@Injectable({ providedIn: 'root' })
export class SectionVisibilityService {
  private readonly supabase = inject(SupabaseService);

  getVisibility(): Observable<Record<string, boolean>> {
    return from(this.supabase.client.from('section_visibility').select('*')).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load section visibility from Supabase', error);
          return {};
        }
        const rows = (data ?? []) as SectionVisibilityRow[];
        return rows.reduce<Record<string, boolean>>((map, row) => {
          map[row.section] = row.visible;
          return map;
        }, {});
      }),
    );
  }

  /** Admin: fetches all 7 rows, sorted by the fixed `SECTION_ORDER` (table has no order column). */
  getAll(): Observable<SectionVisibilityRow[]> {
    return from(this.supabase.client.from('section_visibility').select('*')).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load section visibility rows from Supabase', error);
          return [];
        }
        const rows = (data ?? []) as SectionVisibilityRow[];
        return [...rows].sort(
          (a, b) => SECTION_ORDER.indexOf(a.section as (typeof SECTION_ORDER)[number]) -
            SECTION_ORDER.indexOf(b.section as (typeof SECTION_ORDER)[number]),
        );
      }),
    );
  }

  /** Admin: toggles a single section's visibility. Requires `is_admin()` per RLS. */
  setVisible(section: string, visible: boolean): Observable<void> {
    return from(
      this.supabase.client.from('section_visibility').update({ visible }).eq('section', section),
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to update section visibility in Supabase', error);
          throw error;
        }
      }),
    );
  }
}
