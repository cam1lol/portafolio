import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

/** Row shape of the Supabase `site_content` table (migration 0005). */
export interface SiteContentRow {
  key: string;
  value_es: string;
  value_en: string;
}

export interface SiteContentValue {
  es: string;
  en: string;
}

@Injectable({ providedIn: 'root' })
export class SiteContentService {
  private readonly supabase = inject(SupabaseService);
  private loadStarted = false;

  /** Shared map read by `SiteTextPipe`. Empty until loaded or if the table does not exist yet. */
  readonly content = signal<Record<string, SiteContentValue>>({});

  /** Loads the public texts once per app session; callers fall back to i18n meanwhile. */
  ensureLoaded(): void {
    if (this.loadStarted) return;
    this.loadStarted = true;
    this.getAll().subscribe({
      next: (rows) => this.content.set(this.toMap(rows)),
      error: (error) => console.error('Failed to load site content from Supabase', error),
    });
  }

  getAll(): Observable<SiteContentRow[]> {
    return from(this.supabase.client.from('site_content').select('key, value_es, value_en')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as SiteContentRow[];
      }),
    );
  }

  /** Admin: upserts the given keys (requires `is_admin()`) and refreshes the shared map. */
  saveMany(rows: SiteContentRow[]): Observable<void> {
    const payload = rows.map((row) => ({ ...row, updated_at: new Date().toISOString() }));
    return from(this.supabase.client.from('site_content').upsert(payload, { onConflict: 'key' })).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to save site content', error);
          throw error;
        }
        this.content.update((current) => ({ ...current, ...this.toMap(rows) }));
      }),
    );
  }

  private toMap(rows: SiteContentRow[]): Record<string, SiteContentValue> {
    return rows.reduce<Record<string, SiteContentValue>>((acc, row) => {
      acc[row.key] = { es: row.value_es ?? '', en: row.value_en ?? '' };
      return acc;
    }, {});
  }
}
