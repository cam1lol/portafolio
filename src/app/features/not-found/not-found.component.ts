import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProjectsService } from '../../core/data/projects.service';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { OPEN_PALETTE_EVENT } from '../../shared/command-palette/command-palette.component';

interface Suggestion {
  link: string;
  label: string;
  /** Clave de traducción para las páginas del sitio; los proyectos muestran su nombre. */
  labelKey?: string;
}

/** Distancia de edición entre dos textos cortos (erratas en una URL). */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = next;
    }
  }
  return row[b.length];
}

const slugify = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Cualquier URL que el sitio no conoce ("SEÑAL PERDIDA"): muestra la dirección que falló, sugiere las
 * páginas y proyectos más parecidos (erratas) y ofrece la portada, los proyectos y la búsqueda.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, ScrambleDirective],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  private readonly transloco = inject(TranslocoService);
  protected readonly path = decodeURI(inject(Router).url.split(/[?#]/)[0]);
  private readonly projects = toSignal(inject(ProjectsService).getPublished(), { initialValue: [] });
  protected readonly heading = toSignal(this.transloco.selectTranslate('nf_title'), { initialValue: '' });

  /** Hasta tres páginas o proyectos cuya dirección se parece a la escrita. */
  protected readonly suggestions = computed<Suggestion[]>(() => {
    const typed = slugify(this.path.split('/').filter(Boolean).pop() ?? '');
    if (!typed) return [];
    const pages: Suggestion[] = [
      { link: '/proyectos', label: '', labelKey: 'ft_projects' },
      { link: '/reclutador', label: '', labelKey: 'cmd_recruiter' },
      { link: '/politicas', label: '', labelKey: 'pol_title' },
    ];
    const candidates = [...pages, ...this.projects().map((p) => ({ link: `/proyectos/${p.slug}`, label: p.name }))];
    return candidates
      .map((c) => {
        const slug = slugify(c.link.split('/').pop() ?? '');
        const score = slug.includes(typed) || typed.includes(slug) ? 0 : distance(typed, slug);
        return { ...c, score };
      })
      .filter((c) => c.score <= Math.max(2, Math.floor(typed.length / 3)))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  });

  constructor() {
    const title = inject(Title);
    effect(() => title.setTitle(this.heading() ? `404 · ${this.heading()} · Camilo Ayala` : '404 · Camilo Ayala'));

    // Los buscadores no deben indexar una dirección que no existe.
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => meta.removeTag("name='robots'"));
  }

  protected openSearch(): void {
    window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
  }
}
