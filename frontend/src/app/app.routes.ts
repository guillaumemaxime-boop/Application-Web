import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'Milo GUILLAUME Design — Mobilier sculpté & expositions',
  },
  {
    path: 'mobilier',
    loadComponent: () => import('./pages/furniture-list/furniture-list.component').then(m => m.FurnitureListComponent),
    title: 'Mobilier — Milo GUILLAUME Design',
  },
  {
    path: 'mobilier/:slug',
    loadComponent: () => import('./pages/furniture-detail/furniture-detail.component').then(m => m.FurnitureDetailComponent),
  },
  {
    path: 'expositions',
    loadComponent: () => import('./pages/exhibitions-list/exhibitions-list.component').then(m => m.ExhibitionsListComponent),
    title: 'Expositions — Milo GUILLAUME Design',
  },
  {
    path: 'expositions/:slug',
    loadComponent: () => import('./pages/exhibition-detail/exhibition-detail.component').then(m => m.ExhibitionDetailComponent),
  },
  {
    path: 'studio',
    loadComponent: () => import('./pages/studio/studio.component').then(m => m.StudioComponent),
    title: 'Studio — Milo GUILLAUME Design',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Connexion — Milo GUILLAUME Design',
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    title: 'Administration — Milo GUILLAUME Design',
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
