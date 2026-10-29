import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

/** Forma de la tabla `site_content` de Supabase (migración 0005). */
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

  /** Mapa compartido que lee `SiteTextPipe`. Vacío hasta que carga o si la tabla aún no existe. */
  readonly content = signal<Record<string, SiteContentValue>>({});

  /** Carga los textos públicos una vez por sesión; mientras tanto se usa el i18n. */
  ensureLoaded(): void {
    if (this.loadStarted) return;
    this.loadStarted = true;
    this.getAll().subscribe({
      next: (rows) => this.content.set(this.toMap(rows)),
      error: (error) => console.error('Failed to load site content from Supabase', error),
    });
  }

  /**
   * Valor en un idioma, con el español como respaldo. Para claves que nunca están en el i18n (URLs del
   * CV, disponibilidad): se lee dentro de un computed() para que siga al idioma y al contenido cargado.
   */
  valueFor(key: string, lang: string): string {
    const row = this.content()[key];
    if (!row) return '';
    return ((lang === 'en' ? row.en : row.es) || row.es || '').trim();
  }

  getAll(): Observable<SiteContentRow[]> {
    return from(this.supabase.client.from('site_content').select('key, value_es, value_en')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as SiteContentRow[];
      }),
    );
  }

  /** Admin: guarda (upsert) las claves dadas (requiere `is_admin()`) y refresca el mapa compartido. */
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
