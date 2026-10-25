import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';

interface NavGroup {
  label: string;
  links: Array<{ path: string; label: string }>;
}

/** Grouped by intent: one obvious place for each kind of task. */
const NAV_GROUPS: NavGroup[] = [
  { label: 'GENERAL', links: [{ path: 'dashboard', label: 'Dashboard' }] },
  {
    label: 'CONTENIDO',
    links: [
      { path: 'projects', label: 'Proyectos' },
      { path: 'experience', label: 'Experiencia' },
      { path: 'services', label: 'Servicios' },
      { path: 'roadmap', label: 'Roadmap' },
      { path: 'ticker', label: 'Ticker' },
      { path: 'site-texts', label: 'Textos del sitio' },
    ],
  },
  { label: 'PÁGINA', links: [{ path: 'structure', label: 'Estructura de portada' }] },
  { label: 'BIBLIOTECA', links: [{ path: 'models', label: 'Modelos 3D' }] },
  { label: 'COMUNIDAD', links: [{ path: 'comments', label: 'Comentarios' }] },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ConfirmDialogComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navGroups = NAV_GROUPS;

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/admin/login'),
      error: () => this.router.navigateByUrl('/admin/login'),
    });
  }
}
