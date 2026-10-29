import { Injectable, inject } from '@angular/core';
import { Observable, from, map, shareReplay, tap } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { Project } from './project.model';
import { ProjectDetails, detailsFromRow, detailsToRow } from './project-details';

const DETAIL_KEYS: (keyof ProjectDetails)[] = ['featured', 'facts', 'story', 'results', 'screens', 'gallery', 'improvements', 'docs', 'versions', 'videos', 'chapters', 'mediaFocus', 'sectionOrder', 'storyLayout', 'resultsStyle', 'mobileVideo', 'mobileImages', 'hotspots'];

/**
 * Forma de las filas de `projects` (snake_case), limitada a las columnas que usa la app. Sigue la misma
 * separación fila/servicio que `experience.service.ts`: `sort_order` y `published` son solo del admin
 * (`AdminProject`); el resto tiene su equivalente en `Project`.
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
  slug: string;
  preview_video: string | null;
  demo_video_url: string | null;
  case_study_es: string | null;
  case_study_en: string | null;
  published: boolean;
  sort_order: number;
  /** Columnas jsonb de detalle (0010), las lee `detailsFromRow`. */
  featured?: boolean;
  facts?: unknown;
  results?: unknown;
  screens?: unknown;
  gallery?: unknown;
  improvements?: unknown;
  docs?: unknown;
  versions?: unknown;
  videos?: unknown;
  /** Capítulos del caso de estudio (0013). */
  chapters?: unknown;
}

/**
 * Forma del admin: `Project` más las dos columnas solo del admin (`published`, `sortOrder`), que la
 * lectura pública `getPublished()` no necesita y deja fuera.
 */
export interface AdminProject extends Project {
  published: boolean;
  sortOrder: number;
}

/** Lo que aceptan `create`/`update`: camelCase, se pasa a snake_case antes de ir a Supabase. */
export type ProjectInput = Omit<AdminProject, 'id' | 'sortOrder'>;

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Caché de la lista pública durante la sesión: portada, /proyectos y cada página de proyecto comparten
   * una sola petición, así una página de proyecto se pinta al instante (dentro de la transición de
   * apertura). Cualquier escritura del admin la vacía.
   */
  private published$: Observable<Project[]> | null = null;

  /** Lectura del sitio público: solo `published=true`, en orden. */
  getPublished(): Observable<Project[]> {
    return (this.published$ ??= from(
      this.supabase.client
        .from('projects')
        .select('*')
        .eq('published', true)
        .order('sort_order'),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load projects from Supabase', error);
          this.published$ = null; // reintenta en la siguiente lectura en vez de guardar el fallo en caché
          return [];
        }
        return ((data ?? []) as ProjectRow[]).map((row) => this.toProject(row));
      }),
      shareReplay(1),
    ));
  }

  private clearCache(): void {
    this.published$ = null;
  }

  /**
   * Enlace privado de borrador (/proyectos/<slug>?preview=<token>, migración 0014): devuelve el proyecto
   * aunque no esté publicado, solo si el token coincide. Null si no (o si falta la función).
   */
  getPreview(slug: string, token: string): Observable<Project | null> {
    return from(this.supabase.client.rpc('project_preview', { p_slug: slug, p_token: token })).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to load project preview', error);
          return null;
        }
        const row = (data as ProjectRow[] | null)?.[0];
        return row ? this.toProject(row) : null;
      }),
    );
  }

  /** Admin: el token secreto del enlace privado de un proyecto (migración 0014); null antes de la migración. */
  getPreviewToken(id: string): Observable<string | null> {
    return from(this.supabase.client.from('projects').select('preview_token').eq('id', id).maybeSingle()).pipe(
      map(({ data, error }) => (error || !data ? null : String((data as { preview_token?: string }).preview_token ?? '') || null)),
    );
  }

  /** Admin: un token nuevo, para que los enlaces compartidos antes dejen de funcionar. */
  regeneratePreviewToken(id: string): Observable<string | null> {
    const token = crypto.randomUUID();
    return from(this.supabase.client.from('projects').update({ preview_token: token }).eq('id', id)).pipe(
      map(({ error }) => (error ? null : token)),
    );
  }

  /** Listado del admin: todas las filas (publicadas o no), por `sort_order`. */
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
      tap(() => this.clearCache()),
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
      tap(() => this.clearCache()),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.supabase.client.from('projects').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to delete project', error);
        }
      }),
      tap(() => this.clearCache()),
    );
  }

  /**
   * Guarda el orden tras arrastrar: escribe `sort_order` (desde 0, según la posición) para cada id de `orderedIds`.
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
      tap(() => this.clearCache()),
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
      slug: row.slug,
      previewVideo: row.preview_video ?? undefined,
      demoVideoUrl: row.demo_video_url ?? undefined,
      caseStudyEs: row.case_study_es ?? '',
      caseStudyEn: row.case_study_en ?? '',
      ...detailsFromRow(row as unknown as Record<string, unknown>),
    };
  }

  private toAdminProject(row: ProjectRow): AdminProject {
    return {
      ...this.toProject(row),
      published: row.published,
      sortOrder: row.sort_order,
    };
  }

  /** Pasa un payload del admin en camelCase (completo o parcial) a un parche de fila en snake_case. */
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
    if (input.slug !== undefined) row['slug'] = input.slug;
    if (input.previewVideo !== undefined) row['preview_video'] = input.previewVideo || null;
    if (input.demoVideoUrl !== undefined) row['demo_video_url'] = input.demoVideoUrl || null;
    if (input.caseStudyEs !== undefined) row['case_study_es'] = input.caseStudyEs;
    if (input.caseStudyEn !== undefined) row['case_study_en'] = input.caseStudyEn;
    // Las columnas de detalle se escriben juntas (el formulario las manda todas); también sirve un cambio suelto de destacado.
    if (DETAIL_KEYS.every((key) => input[key] !== undefined)) Object.assign(row, detailsToRow(input as ProjectDetails));
    else if (input.featured !== undefined) row['featured'] = input.featured;
    return row;
  }
}
