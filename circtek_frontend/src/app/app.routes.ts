import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },

  // Example page route (lazy-loaded component)
  {
    path: 'example',
    loadComponent: () =>
      import('./pages/example/example.component').then((m) => m.ExampleComponent),
  },

  // Diagnostics page route (lazy-loaded component)
  {
    path: 'diagnostics',
    loadComponent: () =>
      import('./pages/diagnostics/diagnostics.component').then((m) => m.DiagnosticsComponent),
  },

  // Management page route (lazy-loaded component)
  {
    path: 'management',
    loadComponent: () =>
      import('./pages/management/management.component').then((m) => m.ManagementComponent),
  },

  // Fallback
  { path: '**', redirectTo: 'login' },
];
