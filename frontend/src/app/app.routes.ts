import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'Atelier Lumen — Mobilier sculpté & expositions',
  },
  {
    path: 'mobilier',
    loadComponent: () => import('./pages/furniture-list/furniture-list.component').then(m => m.FurnitureListComponent),
    title: 'Mobilier — Atelier Lumen',
  },
  {
    path: 'mobilier/:slug',
    loadComponent: () => import('./pages/furniture-detail/furniture-detail.component').then(m => m.FurnitureDetailComponent),
  },
  {
    path: 'expositions',
    loadComponent: () => import('./pages/exhibitions-list/exhibitions-list.component').then(m => m.ExhibitionsListComponent),
    title: 'Expositions — Atelier Lumen',
  },
  {
    path: 'expositions/:slug',
    loadComponent: () => import('./pages/exhibition-detail/exhibition-detail.component').then(m => m.ExhibitionDetailComponent),
  },
  {
    path: 'studio',
    loadComponent: () => import('./pages/studio/studio.component').then(m => m.StudioComponent),
    title: 'Studio — Atelier Lumen',
  },
  { path: '**', redirectTo: '' },
];
