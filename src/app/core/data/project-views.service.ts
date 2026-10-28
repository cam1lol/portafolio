import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

/** One project page view (migration 0014): no personal data, only what was read and for how long. */
export interface ProjectView {
  slug: string;
  lang: 'es' | 'en';
  /** How far down the page the visitor got, 0-100. */
  depth: number;
  seconds: number;
  created_at?: string;
}

export interface ProjectStats {
  slug: string;
  views: number;
  avgDepth: number;
  avgSeconds: number;
  /** Share of views that reached the end of the case study (depth >= 90). */
  readToEnd: number;
  enShare: number;
}

/** Views shorter than this are bounces (a misclick, the back button): not counted. */
const MIN_SECONDS = 2;

@Injectable({ providedIn: 'root' })
export class ProjectViewsService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /**
   * Records a view when the visitor leaves the page. Uses fetch with keepalive so it is still sent
   * while the tab closes; the admin's own visits (logged in) are not counted.
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
    }).catch(() => undefined); // analytics never break the page (table missing, offline...)
  }

  /** Admin: views of the last `days` days. */
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

/** Per-project summary, most viewed first. */
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
