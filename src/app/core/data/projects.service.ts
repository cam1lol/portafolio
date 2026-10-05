import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { Project } from './project.model';

/**
 * Row shape returned by the Supabase `projects` table (snake_case),
 * restricted to the columns this app actually consumes. Mirrors the
 * `experience` table's row/service split (`experience.service.ts`):
 * `preview_image`/`repo_url`/`live_url` now have an equivalent in `Project`
 * (admin-editable, optional for the public model), while `sort_order` and
 * `published` stay admin-only via `AdminProject`.
 */
interface ProjectRow {
  id: string;
  name: string;
  type: Project['type'];
  kind: Project['kind'];
  device: Project['device'] | null;
  status: Project['status'];
  icon: string;
  type_label: string;
  summary_es: string;
  summary_en: string;
  long_es: string;
  long_en: string;
  highlights_es: string[];
  highlights_en: string[];
  stack: string[];
  preview_image: string | null;
  repo_url: string | null;
  live_url: string | null;
  published: boolean;
  sort_order: number;
}

/**
 * Admin-facing shape: `Project` plus the two admin-only columns
 * (`published`, `sortOrder`) that the public `getPublished()` path doesn't
 * need and intentionally leaves unmapped.
 */
export interface AdminProject extends Project {
  published: boolean;
  sortOrder: number;
}

/** Payload accepted by `create`/`update` — camelCase, mapped to snake_case before hitting Supabase. */
export type ProjectInput = Omit<AdminProject, 'id' | 'sortOrder'>;

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly supabase = inject(SupabaseService);

  /** Public site read: only `published=true`, ordered for display. */
  getPublished(): Observable<Project[]> {
    return from(
      this.supabase.client
        .from('projects')
        .select('*')
        .eq('published', true)
        .order('sort_order'),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load projects from Supabase', error);
          return [];
        }
        return ((data ?? []) as ProjectRow[]).map((row) => this.toProject(row));
      }),
    );
  }

  /** Admin listing: every row (published or not), ordered by `sort_order`. */
  getAll(): Observable<AdminProject[]> {
    return from(this.supabase.client.from('projects').select('*').order('sort_order')).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load projects (admin) from Supabase', error);
          return [];
        }
        return ((data ?? []) as ProjectRow[]).map((row) => this.toAdminProject(row));
      }),
    );
  }

  getById(id: string): Observable<AdminProject | null> {
    return from(this.supabase.client.from('projects').select('*').eq('id', id).maybeSingle()).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load project by id from Supabase', error);
          return null;
        }
        return data ? this.toAdminProject(data as ProjectRow) : null;
      }),
    );
  }

  create(input: ProjectInput): Observable<AdminProject | null> {
    return from(
      this.supabase.client.from('projects').insert(this.toRow(input)).select('*').single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to create project', error);
          return null;
        }
        return this.toAdminProject(data as ProjectRow);
      }),
    );
  }

  update(id: string, partial: Partial<ProjectInput>): Observable<AdminProject | null> {
    return from(
      this.supabase.client
        .from('projects')
        .update(this.toRow(partial))
        .eq('id', id)
        .select('*')
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to update project', error);
          return null;
        }
        return this.toAdminProject(data as ProjectRow);
      }),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.supabase.client.from('projects').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to delete project', error);
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
      this.supabase.client.from('projects').update({ sort_order: index }).eq('id', id),
    );
    return from(Promise.all(updates)).pipe(
      map((results) => {
        const failed = results.find((r) => r.error);
        if (failed?.error) {
          console.error('Failed to reorder projects', failed.error);
        }
      }),
    );
  }

  private toProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      kind: row.kind,
      device: row.device ?? undefined,
      status: row.status,
      icon: row.icon,
      typeLabel: row.type_label,
      summaryEs: row.summary_es,
      summaryEn: row.summary_en,
      longEs: row.long_es,
      longEn: row.long_en,
      highlightsEs: row.highlights_es ?? [],
      highlightsEn: row.highlights_en ?? [],
      stack: row.stack ?? [],
      previewImage: row.preview_image ?? undefined,
      repoUrl: row.repo_url ?? undefined,
      liveUrl: row.live_url ?? undefined,
    };
  }

  private toAdminProject(row: ProjectRow): AdminProject {
    return {
      ...this.toProject(row),
      published: row.published,
      sortOrder: row.sort_order,
    };
  }

  /** Maps a camelCase admin payload (full or partial) to a snake_case row patch. */
  private toRow(input: Partial<ProjectInput>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row['name'] = input.name;
    if (input.type !== undefined) row['type'] = input.type;
    if (input.kind !== undefined) row['kind'] = input.kind;
    if (input.device !== undefined) row['device'] = input.device;
    if (input.status !== undefined) row['status'] = input.status;
    if (input.icon !== undefined) row['icon'] = input.icon;
    if (input.typeLabel !== undefined) row['type_label'] = input.typeLabel;
    if (input.summaryEs !== undefined) row['summary_es'] = input.summaryEs;
    if (input.summaryEn !== undefined) row['summary_en'] = input.summaryEn;
    if (input.longEs !== undefined) row['long_es'] = input.longEs;
    if (input.longEn !== undefined) row['long_en'] = input.longEn;
    if (input.highlightsEs !== undefined) row['highlights_es'] = input.highlightsEs;
    if (input.highlightsEn !== undefined) row['highlights_en'] = input.highlightsEn;
    if (input.stack !== undefined) row['stack'] = input.stack;
    if (input.previewImage !== undefined) row['preview_image'] = input.previewImage;
    if (input.repoUrl !== undefined) row['repo_url'] = input.repoUrl;
    if (input.liveUrl !== undefined) row['live_url'] = input.liveUrl;
    if (input.published !== undefined) row['published'] = input.published;
    return row;
  }
}
