import { Routes } from '@angular/router';
import { PublicShellComponent } from './features/public-shell/public-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicShellComponent,
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
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
