import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

/** Una visita a la página de un proyecto (migración 0014): sin datos personales, solo qué se leyó y cuánto tiempo. */
export interface ProjectView {
  slug: string;
  lang: 'es' | 'en';
  /** Hasta dónde bajó el visitante, 0-100. */
  depth: number;
  seconds: number;
  created_at?: string;
}

export interface ProjectStats {
  slug: string;
  views: number;
  avgDepth: number;
  avgSeconds: number;
  /** Parte de las visitas que llegaron al final del caso de estudio (profundidad >= 90). */
  readToEnd: number;
  enShare: number;
}

/** Las visitas más cortas que esto son rebotes (un clic por error, el botón atrás): no cuentan. */
const MIN_SECONDS = 2;

@Injectable({ providedIn: 'root' })
export class ProjectViewsService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /**
   * Registra la visita cuando el visitante sale de la página. Usa fetch con keepalive para que se envíe
   * aunque se cierre la pestaña; las visitas del propio admin (con sesión) no cuentan.
   */
  record(view: ProjectView): void {
    if (this.auth.session() || view.seconds < MIN_SECONDS) return;
    const body = JSON.stringify({
      slug: view.slug,
      lang: view.lang,
      depth: Math.max(0, Math.min(100, Math.round(view.depth))),
      seconds: Math.max(0, Math.min(86400, Math.round(view.seconds))),
    });
    fetch(`${environment.supabaseUrl}/rest/v1/project_views`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: environment.supabasePublishableKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body,
    }).catch(() => undefined); // las estadísticas nunca rompen la página (tabla ausente, sin conexión...)
  }

  /** Admin: visitas de los últimos `days` días. */
  recent(days = 30): Observable<ProjectView[]> {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    return from(
      this.supabase.client.from('project_views').select('slug, lang, depth, seconds, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(10000),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as ProjectView[];
      }),
    );
  }
}

/** Resumen por proyecto, los más vistos primero. */
export function summarizeViews(views: ProjectView[]): ProjectStats[] {
  const groups = new Map<string, ProjectView[]>();
  for (const view of views) (groups.get(view.slug) ?? groups.set(view.slug, []).get(view.slug)!).push(view);
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return [...groups.entries()]
    .map(([slug, list]) => ({
      slug,
      views: list.length,
      avgDepth: Math.round(avg(list.map((v) => v.depth))),
      avgSeconds: Math.round(avg(list.map((v) => v.seconds))),
      readToEnd: Math.round((list.filter((v) => v.depth >= 90).length / list.length) * 100),
      enShare: Math.round((list.filter((v) => v.lang === 'en').length / list.length) * 100),
    }))
    .sort((a, b) => b.views - a.views || b.avgDepth - a.avgDepth);
}
