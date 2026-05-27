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
        path: 'typographie',
        loadComponent: () => import('./typographie/typographie.component').then(m => m.TypographieComponent),
        title: 'Typographie — Administration',
      },
      {
        path: 'textes',
        loadComponent: () => import('./textes/textes.component').then(m => m.TextesComponent),
        title: 'Textes — Administration',
      },
      {
        path: 'email',
        loadComponent: () => import('./mail-settings/mail-settings.component').then(m => m.MailSettingsComponent),
        title: 'Email — Administration',
      },
      {
        path: 'analytics',
        loadComponent: () => import('./analytics/analytics.component').then(m => m.AnalyticsComponent),
        title: 'Analytics — Administration',
      },
      {
        path: 'legacy',
        loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
        title: 'Administration (legacy) — Milo GUILLAUME Design',
      },
    ],
  },
];
