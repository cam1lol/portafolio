import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ProjectStats, ProjectViewsService, summarizeViews } from '../../../core/data/project-views.service';
import { ProjectsService } from '../../../core/data/projects.service';

/**
 * Dashboard: which projects get opened and how far their case study is read (last 30 days,
 * migration 0014). Your own visits while logged in are not counted.
 */
@Component({
  selector: 'app-project-stats',
  standalone: true,
  template: `
    <section class="stats-panel" aria-labelledby="project-stats-title">
      <div class="head">
        <h2 id="project-stats-title" class="mono">LECTURA POR PROYECTO <span class="muted">· 30 DÍAS</span></h2>
        @if (!loading() && !error()) { <span class="total mono">{{ total() }} {{ total() === 1 ? 'LECTURA' : 'LECTURAS' }}</span> }
      </div>
      @if (loading()) {
        <p class="empty">Cargando…</p>
      } @else if (error()) {
        <p class="empty">Las lecturas por proyecto aparecen cuando apliques la migración 0014 en Supabase.</p>
      } @else if (!rows().length) {
        <p class="empty">Aún no hay lecturas registradas. Se cuentan las visitas de más de 2 segundos a la página de un proyecto (las tuyas con sesión iniciada no cuentan).</p>
      } @else {
        <div class="table" role="table" aria-label="Lectura por proyecto">
          <div class="row header mono" role="row">
            <span role="columnheader">PROYECTO</span>
            <span role="columnheader">LECTURAS</span>
            <span role="columnheader">HASTA DÓNDE LEEN</span>
            <span role="columnheader">TIEMPO MEDIO</span>
            <span role="columnheader">LLEGAN AL FINAL</span>
            <span role="columnheader">EN INGLÉS</span>
          </div>
          @for (row of rows(); track row.slug) {
            <div class="row" role="row">
              <span class="name" role="cell">{{ names()[row.slug] || row.slug }}</span>
              <span class="mono" role="cell">{{ row.views }}</span>
              <span class="depth" role="cell" [attr.aria-label]="row.avgDepth + ' %'">
                <span class="bar"><span class="fill" [style.transform]="'scaleX(' + row.avgDepth / 100 + ')'"></span></span>
                <span class="mono">{{ row.avgDepth }} %</span>
              </span>
              <span class="mono" role="cell">{{ duration(row.avgSeconds) }}</span>
              <span class="mono" role="cell">{{ row.readToEnd }} %</span>
              <span class="mono" role="cell">{{ row.enShare }} %</span>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .stats-panel { margin-top: 18px; padding: 18px 20px; border: 1px solid var(--line); border-radius: var(--r); background: var(--graphite); }
    .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    h2 { margin: 0; color: var(--ember); font-size: 11px; letter-spacing: .12em; }
    .muted { color: var(--steel); }
    .total { color: var(--bone-dim); font-size: 11px; letter-spacing: .08em; }
    .empty { margin: 0; color: var(--steel); font-size: 13px; line-height: 1.5; }
    .table { display: grid; }
    .row { display: grid; grid-template-columns: minmax(0, 2fr) 70px minmax(0, 1.6fr) 90px 90px 80px; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
    .row.header { padding-top: 0; color: var(--steel); font-size: 9px; letter-spacing: .1em; }
    .name { overflow: hidden; color: var(--bone); text-overflow: ellipsis; white-space: nowrap; }
    .depth { display: flex; align-items: center; gap: 10px; }
    .bar { flex: 1; height: 4px; overflow: hidden; border-radius: 2px; background: var(--line); }
    .fill { display: block; height: 100%; background: var(--ember); transform-origin: left; }
    .mono { font-size: 12px; }
    @media (max-width: 900px) {
      .row { grid-template-columns: minmax(0, 1fr) 60px minmax(0, 1fr); }
      .row > :nth-child(n + 4) { display: none; }
    }
  `,
})
export class ProjectStatsComponent implements OnInit {
  private readonly views = inject(ProjectViewsService);
  private readonly projects = inject(ProjectsService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly rows = signal<ProjectStats[]>([]);
  protected readonly names = signal<Record<string, string>>({});
  protected readonly total = computed(() => this.rows().reduce((sum, row) => sum + row.views, 0));

  ngOnInit(): void {
    forkJoin({ views: this.views.recent(30), projects: this.projects.getAll() }).subscribe({
      next: ({ views, projects }) => {
        this.rows.set(summarizeViews(views));
        this.names.set(Object.fromEntries(projects.map((p) => [p.slug, p.name])));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected duration(seconds: number): string {
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ${String(seconds % 60).padStart(2, '0')} s`;
  }
}
