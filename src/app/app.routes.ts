import { ActivatedRouteSnapshot, Router, Routes } from '@angular/router';
import { inject } from '@angular/core';
import { PublicShellComponent } from './features/public-shell/public-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicShellComponent,
    // Shareable shortcut: /?modo=reclutador (or ?mode=recruiter) opens recruiter mode.
    canActivate: [
      (route: ActivatedRouteSnapshot) => {
        const mode = route.queryParamMap.get('modo') ?? route.queryParamMap.get('mode');
        return mode === 'reclutador' || mode === 'recruiter' ? inject(Router).parseUrl('/reclutador') : true;
      },
    ],
  },
  {
    path: 'proyectos',
    loadComponent: () => import('./features/projects-index/projects-index.component').then((m) => m.ProjectsIndexComponent),
  },
  {
    path: 'proyectos/:slug',
    loadComponent: () => import('./features/project-page/project-page.component').then((m) => m.ProjectPageComponent),
  },
  {
    path: 'reclutador',
    loadComponent: () => import('./features/recruiter/recruiter.component').then((m) => m.RecruiterComponent),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
