import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminLoginComponent } from './login/admin-login.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminProjectsListComponent } from './projects/admin-projects-list.component';
import { AdminProjectFormComponent } from './projects/admin-project-form.component';
import { AdminExperienceListComponent } from './experience/admin-experience-list.component';
import { AdminExperienceFormComponent } from './experience/admin-experience-form.component';
import { AdminCommentsComponent } from './comments/admin-comments.component';
import { AdminInboxListComponent } from './inbox/admin-inbox-list.component';
import { AdminInboxThreadComponent } from './inbox/admin-inbox-thread.component';
import { AdminBlockFormComponent } from './blocks/admin-block-form.component';
import { AdminStructureComponent } from './structure/admin-structure.component';
import { AdminCollectionListComponent } from './collections/admin-collection-list.component';
import { AdminCollectionFormComponent } from './collections/admin-collection-form.component';
import { AdminSiteTextsComponent } from './site-texts/admin-site-texts.component';
import { unsavedChangesGuard } from './shared/unsaved-changes.guard';

/** List + create + edit routes for one simple collection (see collections/collection.config.ts). */
function collectionRoutes(collection: string): Routes {
  return [
    { path: collection, component: AdminCollectionListComponent, data: { collection } },
    { path: `${collection}/new`, component: AdminCollectionFormComponent, data: { collection }, canDeactivate: [unsavedChangesGuard] },
    { path: `${collection}/:id/edit`, component: AdminCollectionFormComponent, data: { collection }, canDeactivate: [unsavedChangesGuard] },
  ];
}
import { AdminModelsComponent } from './models/admin-models.component';

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
      { path: 'projects/new', component: AdminProjectFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'projects/:id/edit', component: AdminProjectFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'experience', component: AdminExperienceListComponent },
      { path: 'experience/new', component: AdminExperienceFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'experience/:id/edit', component: AdminExperienceFormComponent, canDeactivate: [unsavedChangesGuard] },
      ...collectionRoutes('services'),
      ...collectionRoutes('roadmap'),
      ...collectionRoutes('ticker'),
      ...collectionRoutes('clients'),
      ...collectionRoutes('testimonials'),
      { path: 'site-texts', component: AdminSiteTextsComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'structure', component: AdminStructureComponent },
      // Visibility, home order and the blocks list now live together in "structure".
      { path: 'visibility', redirectTo: 'structure', pathMatch: 'full' },
      { path: 'layout', redirectTo: 'structure', pathMatch: 'full' },
      { path: 'blocks', redirectTo: 'structure', pathMatch: 'full' },
      { path: 'inbox', component: AdminInboxListComponent },
      { path: 'inbox/:id', component: AdminInboxThreadComponent },
      { path: 'comments', component: AdminCommentsComponent },
      { path: 'blocks/new', component: AdminBlockFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'blocks/:id/edit', component: AdminBlockFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'models', component: AdminModelsComponent },
    ],
  },
];
