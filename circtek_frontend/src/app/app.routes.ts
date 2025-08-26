import { Routes } from '@angular/router';

export const routes: Routes = [
  // Default redirect to example page
  { path: '', pathMatch: 'full', redirectTo: 'example' },

  // Example page route (lazy-loaded component)
  {
    path: 'example',
    loadComponent: () =>
      import('./pages/example/example.component').then((m) => m.ExampleComponent),
  },

  // Fallback
  { path: '**', redirectTo: 'example' },
];
