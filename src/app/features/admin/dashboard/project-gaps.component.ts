import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminProject, ProjectsService } from '../../../core/data/projects.service';
import { ProjectGap, projectGaps } from './project-gaps';

interface GapRow {
  project: AdminProject;
  gaps: ProjectGap[];
}

/**
 * "Pendientes por proyecto" del dashboard: lo que le falta a cada proyecto (portada, enlaces, historia,
 * ficha, resultados, inglés); cada pendiente es un enlace que abre el formulario en el paso que lo arregla.
 */
@Component({
  selector: 'app-project-gaps',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './project-gaps.component.css',
  template: `
    <section class="gaps" aria-labelledby="gaps-title">
      <div class="gaps-head">
        <h3 id="gaps-title" class="mono">PENDIENTES POR PROYECTO</h3>
        @if (projects()?.length) {
          <span class="summary mono">
            {{ rows().length ? rows().length + ' CON PENDIENTES' : 'TODO COMPLETO' }}
            @if (complete()) { · {{ complete() }} {{ complete() === 1 ? 'COMPLETO' : 'COMPLETOS' }} }
          </span>
        }
      </div>

      @if (projects() === undefined) {
        <p class="empty">Cargando proyectos…</p>
      } @else if (!projects()?.length) {
        <p class="empty">Todavía no hay proyectos, o no se pudieron cargar.</p>
      } @else {
        @for (row of rows(); track row.project.id) {
          <div class="row">
            <a class="name" [routerLink]="['/admin/projects', row.project.id, 'edit']">
              {{ row.project.name }}
              @if (!row.project.published) { <span class="draft mono">BORRADOR</span> }
            </a>
            <ul class="chips">
              @for (gap of row.gaps; track gap.id) {
                <li>
                  <a class="chip" [routerLink]="['/admin/projects', row.project.id, 'edit']" [queryParams]="{ paso: gap.step }">
                    {{ gap.label }}
                  </a>
                </li>
              }
            </ul>
            <span class="count mono" [attr.aria-label]="row.gaps.length + ' pendientes'">{{ row.gaps.length }}</span>
          </div>
        } @empty {
          <p class="empty">Todos los proyectos tienen lo esencial: portada, enlaces, historia, ficha, cifras e inglés.</p>
        }
      }
    </section>
  `,
})
export class ProjectGapsComponent {
  /** undefined mientras carga; getAll() ya convierte un fallo en una lista vacía. */
  protected readonly projects = toSignal(inject(ProjectsService).getAll());

  /** Proyectos con pendientes, los más incompletos primero (a igualdad, los publicados antes que los borradores). */
  protected readonly rows = computed<GapRow[]>(() =>
    (this.projects() ?? [])
      .map((project) => ({ project, gaps: projectGaps(project) }))
      .filter((row) => row.gaps.length)
      .sort((a, b) => b.gaps.length - a.gaps.length || Number(b.project.published) - Number(a.project.published)),
  );

  protected readonly complete = computed(() => (this.projects() ?? []).length - this.rows().length);
}
