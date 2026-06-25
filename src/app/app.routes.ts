import { Routes } from '@angular/router';
import { PublicShellComponent } from './features/public-shell/public-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicShellComponent,
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
