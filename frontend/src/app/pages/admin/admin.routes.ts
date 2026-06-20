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
        path: 'mediatheque',
        loadComponent: () => import('./mediatheque/mediatheque.component').then(m => m.MediathequeComponent),
        title: 'Médiathèque — Administration',
      },
      {
        path: 'mobilier',
        loadComponent: () => import('./mobilier/mobilier.component').then(m => m.MobilierComponent),
        title: 'Mobilier — Administration',
      },
      {
        path: 'expositions',
        loadComponent: () => import('./expositions/expositions.component').then(m => m.ExpositionsComponent),
        title: 'Expositions — Administration',
      },
      {
        path: 'accueil',
        loadComponent: () => import('./accueil/accueil.component').then(m => m.AccueilComponent),
        title: 'Accueil — Administration',
      },
      {
        path: 'navigation',
        loadComponent: () => import('./navigation/navigation.component').then(m => m.NavigationComponent),
        title: 'Navigation — Administration',
      },
      {
        path: 'stories',
        loadComponent: () => import('./stories/stories-admin.component').then(m => m.StoriesAdminComponent),
        title: 'Stories — Administration',
      },
      { path: 'sliders', redirectTo: 'accueil', pathMatch: 'full' },
    ],
  },
];
