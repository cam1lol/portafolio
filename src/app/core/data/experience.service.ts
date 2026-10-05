import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { Experience } from './experience.model';

interface SubprojectRow {
  name: string;
  desc_es: string;
  desc_en: string;
}

/**
 * Row shape returned by the Supabase `experience` table (snake_case),
 * restricted to the columns this app actually consumes.
 */
interface ExperienceRow {
  id: string;
  company: string;
  role_es: string;
  role_en: string;
  period_es: string;
  period_en: string;
  tag_es: string;
  tag_en: string;
  is_current: boolean;
  summary_es: string;
  summary_en: string;
  points_es: string[];
  points_en: string[];
  stack: string[];
  subprojects: SubprojectRow[] | null;
  published: boolean;
  sort_order: number;
}

/**
 * Admin-facing shape: `Experience` plus the two admin-only columns
 * (`published`, `sortOrder`) that the public `getPublished()` path doesn't
 * need and intentionally leaves unmapped.
 */
export interface AdminExperience extends Experience {
  published: boolean;
  sortOrder: number;
}

/** Payload accepted by `create`/`update` — camelCase, mapped to snake_case before hitting Supabase. */
export type ExperienceInput = Omit<AdminExperience, 'id' | 'sortOrder'>;

@Injectable({ providedIn: 'root' })
export class ExperienceService {
  private readonly supabase = inject(SupabaseService);

  getPublished(): Observable<Experience[]> {
    return from(
      this.supabase.client
        .from('experience')
        .select('*')
        .eq('published', true)
        .order('sort_order'),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load experience from Supabase', error);
          return [];
        }
        return ((data ?? []) as ExperienceRow[]).map((row) => this.toExperience(row));
      }),
    );
  }

  /** Admin listing: every row (published or not), ordered by `sort_order`. */
  getAll(): Observable<AdminExperience[]> {
    return from(this.supabase.client.from('experience').select('*').order('sort_order')).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load experience (admin) from Supabase', error);
          return [];
        }
        return ((data ?? []) as ExperienceRow[]).map((row) => this.toAdminExperience(row));
      }),
    );
  }

  getById(id: string): Observable<AdminExperience | null> {
    return from(this.supabase.client.from('experience').select('*').eq('id', id).maybeSingle()).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load experience by id from Supabase', error);
          return null;
        }
        return data ? this.toAdminExperience(data as ExperienceRow) : null;
      }),
    );
  }

  create(input: ExperienceInput): Observable<AdminExperience | null> {
    return from(
      this.supabase.client.from('experience').insert(this.toRow(input)).select('*').single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to create experience', error);
          return null;
        }
        return this.toAdminExperience(data as ExperienceRow);
      }),
    );
  }

  update(id: string, partial: Partial<ExperienceInput>): Observable<AdminExperience | null> {
    return from(
      this.supabase.client
        .from('experience')
        .update(this.toRow(partial))
        .eq('id', id)
        .select('*')
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to update experience', error);
          return null;
        }
        return this.toAdminExperience(data as ExperienceRow);
      }),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.supabase.client.from('experience').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to delete experience', error);
        }
      }),
    );
  }

  /**
   * Persists a new ordering after a drag&drop reorder: writes `sort_order`
   * (0-based, by array position) for every id in `orderedIds`.
   */
  reorder(orderedIds: string[]): Observable<void> {
    const updates = orderedIds.map((id, index) =>
      this.supabase.client.from('experience').update({ sort_order: index }).eq('id', id),
    );
    return from(Promise.all(updates)).pipe(
      map((results) => {
        const failed = results.find((r) => r.error);
        if (failed?.error) {
          console.error('Failed to reorder experience', failed.error);
        }
      }),
    );
  }

  private toExperience(row: ExperienceRow): Experience {
    return {
      id: row.id,
      company: row.company,
      roleEs: row.role_es,
      roleEn: row.role_en,
      periodEs: row.period_es,
      periodEn: row.period_en,
      tagEs: row.tag_es,
      tagEn: row.tag_en,
      isCurrent: row.is_current,
      summaryEs: row.summary_es,
      summaryEn: row.summary_en,
      pointsEs: row.points_es ?? [],
      pointsEn: row.points_en ?? [],
      stack: row.stack ?? [],
      subprojects: row.subprojects?.map((sub) => ({
        name: sub.name,
        descEs: sub.desc_es,
        descEn: sub.desc_en,
      })),
    };
  }

  private toAdminExperience(row: ExperienceRow): AdminExperience {
    return {
      ...this.toExperience(row),
      published: row.published,
      sortOrder: row.sort_order,
    };
  }

  /** Maps a camelCase admin payload (full or partial) to a snake_case row patch. */
  private toRow(input: Partial<ExperienceInput>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (input.company !== undefined) row['company'] = input.company;
    if (input.roleEs !== undefined) row['role_es'] = input.roleEs;
    if (input.roleEn !== undefined) row['role_en'] = input.roleEn;
    if (input.periodEs !== undefined) row['period_es'] = input.periodEs;
    if (input.periodEn !== undefined) row['period_en'] = input.periodEn;
    if (input.tagEs !== undefined) row['tag_es'] = input.tagEs;
    if (input.tagEn !== undefined) row['tag_en'] = input.tagEn;
    if (input.isCurrent !== undefined) row['is_current'] = input.isCurrent;
    if (input.summaryEs !== undefined) row['summary_es'] = input.summaryEs;
    if (input.summaryEn !== undefined) row['summary_en'] = input.summaryEn;
    if (input.pointsEs !== undefined) row['points_es'] = input.pointsEs;
    if (input.pointsEn !== undefined) row['points_en'] = input.pointsEn;
    if (input.stack !== undefined) row['stack'] = input.stack;
    if (input.published !== undefined) row['published'] = input.published;
    if (input.subprojects !== undefined) {
      row['subprojects'] = input.subprojects
        ? input.subprojects.map((sub) => ({
            name: sub.name,
            desc_es: sub.descEs,
            desc_en: sub.descEn,
          }))
        : null;
    }
    return row;
  }
}
