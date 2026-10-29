import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, viewChild, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { InboxService } from '../../core/data/inbox.service';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import { IconComponent } from '../../shared/icons/icon.component';
import { ToastComponent } from './shared/toast.component';
import { HasUnsavedChanges } from './shared/unsaved-changes.guard';

interface NavGroup {
  label: string;
  links: Array<{ path: string; label: string; icon: string; badge?: 'inbox' }>;
}

/** Agrupado por intención: un sitio claro para cada tipo de tarea. */
const NAV_GROUPS: NavGroup[] = [
  { label: 'GENERAL', links: [{ path: 'dashboard', label: 'Dashboard', icon: 'grid' }] },
  {
    label: 'CONTENIDO',
    links: [
      { path: 'projects', label: 'Proyectos', icon: 'folder' },
      { path: 'experience', label: 'Experiencia', icon: 'briefcase' },
      { path: 'services', label: 'Servicios', icon: 'tag' },
      { path: 'roadmap', label: 'Roadmap', icon: 'map' },
      { path: 'ticker', label: 'Ticker', icon: 'rows' },
      { path: 'clients', label: 'Clientes', icon: 'users' },
      { path: 'testimonials', label: 'Testimonios', icon: 'quote' },
      { path: 'lab', label: 'Laboratorio', icon: 'aperture' },
      { path: 'log', label: 'Bitácora', icon: 'activity' },
      { path: 'site-texts', label: 'Textos del sitio', icon: 'type' },
    ],
  },
  {
    label: 'PÁGINA',
    links: [
      { path: 'structure', label: 'Estructura de portada', icon: 'layout' },
      { path: 'scene', label: 'Escena', icon: 'eye' },
    ],
  },
  { label: 'BIBLIOTECA', links: [{ path: 'models', label: 'Modelos 3D', icon: 'box' }] },
  {
    label: 'COMUNIDAD',
    links: [
      { path: 'inbox', label: 'Mensajes', icon: 'mail', badge: 'inbox' },
      { path: 'comments', label: 'Comentarios', icon: 'message' },
    ],
  },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ConfirmDialogComponent, ToastComponent, IconComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly inbox = inject(InboxService);

  protected readonly navGroups = NAV_GROUPS;

  /** La página enrutada, para que cerrar o recargar la pestaña avise si hay formularios sin guardar. */
  private activePage: Partial<HasUnsavedChanges> | null = null;

  /** Las páginas con mucho que rellenar (formulario de proyectos) usan más pantalla y un menú solo de iconos. */
  protected readonly wide = signal(false);

  onActivate(page: unknown): void {
    this.activePage = page as Partial<HasUnsavedChanges>;
    this.wide.set((page as { wideLayout?: boolean } | null)?.wideLayout === true);
    // Cuando routerLinkActive ya marcó el enlace nuevo.
    setTimeout(() => this.revealActiveLink());
  }

  private readonly nav = viewChild<ElementRef<HTMLElement>>('adminNav');

  /** Móvil: el menú es una franja horizontal; se desplaza para que la sección actual quede centrada y no cortada. */
  private revealActiveLink(): void {
    const nav = this.nav()?.nativeElement;
    const active = nav?.querySelector<HTMLElement>('a.on');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
