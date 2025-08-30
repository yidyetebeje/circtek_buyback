import { Routes } from '@angular/router';
import { superAdminGuard } from './core/guards/super-admin.guard';

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

  // User form routes
  {
    path: 'management/users/add',
    loadComponent: () =>
      import('./pages/management/user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: 'management/users/edit/:id',
    loadComponent: () =>
      import('./pages/management/user-form/user-form.component').then((m) => m.UserFormComponent),
  },

  // Warehouse form routes
  {
    path: 'management/warehouses/add',
    loadComponent: () =>
      import('./pages/management/warehouse-form/warehouse-form.component').then((m) => m.WarehouseFormComponent),
  },
  {
    path: 'management/warehouses/edit/:id',
    loadComponent: () =>
      import('./pages/management/warehouse-form/warehouse-form.component').then((m) => m.WarehouseFormComponent),
  },

  // WiFi Profile form routes
  {
    path: 'management/wifi-profiles/add',
    loadComponent: () =>
      import('./pages/management/wifi-profile-form/wifi-profile-form.component').then((m) => m.WiFiProfileFormComponent),
  },
  {
    path: 'management/wifi-profiles/edit/:id',
    loadComponent: () =>
      import('./pages/management/wifi-profile-form/wifi-profile-form.component').then((m) => m.WiFiProfileFormComponent),
  },

  // Tenant form routes (super_admin only; component self-guards)
  {
    path: 'management/tenants/add',
    canMatch: [superAdminGuard],
    loadComponent: () =>
      import('./pages/management/tenant-form/tenant-form.component').then((m) => m.TenantFormComponent),
  },
  {
    path: 'management/tenants/edit/:id',
    canMatch: [superAdminGuard],
    loadComponent: () =>
      import('./pages/management/tenant-form/tenant-form.component').then((m) => m.TenantFormComponent),
  },

  // Stock Management page route (lazy-loaded component)
  {
    path: 'stock-management',
    loadComponent: () =>
      import('./pages/stock-management/stock-management.component').then((m) => m.StockManagementComponent),
  },

  // Purchase form routes
  {
    path: 'stock-management/purchases/add',
    loadComponent: () =>
      import('./pages/purchase-form/purchase-form.component').then((m) => m.PurchaseFormComponent),
  },

  // Transfer form routes
  {
    path: 'stock-management/transfers/add',
    loadComponent: () =>
      import('./pages/transfer-form/transfer-form.component').then((m) => m.TransferFormComponent),
  },

  // Purchase detail routes
  {
    path: 'stock-management/purchases/:id',
    loadComponent: () =>
      import('./pages/purchase-detail/purchase-detail.component').then((m) => m.PurchaseDetailComponent),
  },

  // Purchase receiving routes
  {
    path: 'stock-management/purchases/:id/receive',
    loadComponent: () =>
      import('./pages/purchase-receiving/purchase-receiving.component').then((m) => m.PurchaseReceivingComponent),
  },

  // Receive items routes
  {
    path: 'stock-management/receive-items',
    loadComponent: () =>
      import('./pages/receive-items/receive-items.component').then((m) => m.ReceiveItemsComponent),
  },

  // Transfer completion routes
  {
    path: 'stock-management/transfers/:id/complete',
    loadComponent: () =>
      import('./pages/transfer-completion/transfer-completion.component').then((m) => m.TransferCompletionComponent),
  },

  // Repair form routes
  {
    path: 'stock-management/repairs/add',
    loadComponent: () =>
      import('./pages/repair-form/repair-form.component').then((m) => m.RepairFormComponent),
  },

  // Repair consume parts routes
  {
    path: 'stock-management/repairs/:id/consume',
    loadComponent: () =>
      import('./pages/repair-consume/repair-consume.component').then((m) => m.RepairConsumeComponent),
  },

  // Fallback
  { path: '**', redirectTo: 'login' },
];
