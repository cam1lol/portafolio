import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { InboxService } from '../../core/data/inbox.service';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import { ToastComponent } from './shared/toast.component';
import { HasUnsavedChanges } from './shared/unsaved-changes.guard';

interface NavGroup {
  label: string;
  links: Array<{ path: string; label: string; badge?: 'inbox' }>;
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
  {
    label: 'COMUNIDAD',
    links: [
      { path: 'inbox', label: 'Mensajes', badge: 'inbox' },
      { path: 'comments', label: 'Comentarios' },
    ],
  },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ConfirmDialogComponent, ToastComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly inbox = inject(InboxService);

  protected readonly navGroups = NAV_GROUPS;

  /** The routed page, so closing or reloading the tab can warn about unsaved forms. */
  private activePage: Partial<HasUnsavedChanges> | null = null;

  onActivate(page: unknown): void {
    this.activePage = page as Partial<HasUnsavedChanges>;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.activePage?.hasUnsavedChanges?.()) event.preventDefault();
  }

  ngOnInit(): void {
    this.inbox.startUnreadWatch();
  }

  ngOnDestroy(): void {
    this.inbox.stopUnreadWatch();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/admin/login'),
      error: () => this.router.navigateByUrl('/admin/login'),
    });
  }
}
