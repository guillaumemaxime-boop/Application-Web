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
    loadComponent: () => import('./pages/catalog/catalog.component').then(m => m.CatalogComponent),
    title: 'Mobilier — Milo GUILLAUME Design',
  },
  {
    path: 'mobilier/:slug',
    loadComponent: () => import('./pages/furniture-detail/furniture-detail.component').then(m => m.FurnitureDetailComponent),
  },
  {
    path: 'expositions',
    loadComponent: () => import('./pages/expositions-list/expositions-list.component').then(m => m.ExpositionsListComponent),
    title: 'Expositions — Milo GUILLAUME Design',
  },
  {
    path: 'expositions/:slug',
    loadComponent: () => import('./pages/exhibition-detail/exhibition-detail.component').then(m => m.ExhibitionDetailComponent),
  },
  {
    path: 'creations',
    loadComponent: () => import('./pages/creations/creations.component').then(m => m.CreationsComponent),
    title: 'Créations — Milo GUILLAUME Design',
  },
  {
    path: 'studio',
    loadComponent: () => import('./pages/studio/studio.component').then(m => m.StudioComponent),
    title: 'Studio — Milo GUILLAUME Design',
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent),
    title: 'Contact — Milo GUILLAUME Design',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Connexion — Milo GUILLAUME Design',
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.routes').then(m => m.adminRoutes),
    title: 'Administration — Milo GUILLAUME Design',
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
