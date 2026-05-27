import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Tableau de bord — Administration',
      },
      {
        path: 'email',
        loadComponent: () => import('./mail-settings/mail-settings.component').then(m => m.MailSettingsComponent),
        title: 'Email — Administration',
      },
      {
        path: 'legacy',
        loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
        title: 'Administration (legacy) — Milo GUILLAUME Design',
      },
    ],
  },
];
