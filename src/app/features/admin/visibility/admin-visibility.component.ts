import { Component, OnInit, inject, signal } from '@angular/core';
import { SectionVisibilityService } from '../../../core/data/section-visibility.service';

interface VisibilityRow {
  section: string;
  label: string;
  visible: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  manifesto: 'Manifiesto',
  projects: 'Proyectos',
  experience: 'Experiencia',
  services: 'Servicios',
  roadmap: 'Roadmap',
  contact: 'Contacto',
};


@Component({
  selector: 'app-admin-visibility',
  standalone: true,
  templateUrl: './admin-visibility.component.html',
  styleUrl: './admin-visibility.component.css',
})
export class AdminVisibilityComponent implements OnInit {
  private readonly visibilityService = inject(SectionVisibilityService);

  readonly rows = signal<VisibilityRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.visibilityService.getAll().subscribe({
      next: (data) => {
        this.rows.set(
          data.map((row) => ({
            section: row.section,
            label: SECTION_LABELS[row.section] ?? row.section,
            visible: row.visible,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la visibilidad de secciones.');
        this.loading.set(false);
      },
    });
  }

  toggle(row: VisibilityRow): void {
    const nextVisible = !row.visible;
    this.rows.update((rows) =>
      rows.map((r) => (r.section === row.section ? { ...r, visible: nextVisible } : r)),
    );

    this.visibilityService.setVisible(row.section, nextVisible).subscribe({
      error: () => {
        // Revierte en caso de fallo (p. ej. RLS rechaza por falta de sesión admin).
        this.rows.update((rows) =>
          rows.map((r) => (r.section === row.section ? { ...r, visible: !nextVisible } : r)),
        );
        this.errorMessage.set(`No se pudo actualizar "${row.label}".`);
      },
    });
  }
}
