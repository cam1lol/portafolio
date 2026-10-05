import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminLoginComponent } from './login/admin-login.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminProjectsListComponent } from './projects/admin-projects-list.component';
import { AdminProjectFormComponent } from './projects/admin-project-form.component';
import { AdminExperienceListComponent } from './experience/admin-experience-list.component';
import { AdminExperienceFormComponent } from './experience/admin-experience-form.component';
import { AdminVisibilityComponent } from './visibility/admin-visibility.component';
import { AdminCommentsComponent } from './comments/admin-comments.component';
import { AdminBlocksListComponent } from './blocks/admin-blocks-list.component';
import { AdminBlockFormComponent } from './blocks/admin-block-form.component';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', component: AdminLoginComponent },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'projects', component: AdminProjectsListComponent },
      { path: 'projects/new', component: AdminProjectFormComponent },
      { path: 'projects/:id/edit', component: AdminProjectFormComponent },
      { path: 'experience', component: AdminExperienceListComponent },
      { path: 'experience/new', component: AdminExperienceFormComponent },
      { path: 'experience/:id/edit', component: AdminExperienceFormComponent },
      { path: 'visibility', component: AdminVisibilityComponent },
      { path: 'comments', component: AdminCommentsComponent },
      { path: 'blocks', component: AdminBlocksListComponent },
      { path: 'blocks/new', component: AdminBlockFormComponent },
      { path: 'blocks/:id/edit', component: AdminBlockFormComponent },
    ],
  },
];
