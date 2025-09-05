import { Routes } from '@angular/router';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
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
  {
    path: 'diagnostics/report/:id',
    loadComponent: () =>
      import('./pages/diagnostics/diagnostic-report.component').then((m) => m.DiagnosticReportComponent),
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

  // Label Template form routes
  {
    path: 'management/label-templates/add',
    loadComponent: () =>
      import('./pages/management/label-template-form/label-template-form.component').then((m) => m.LabelTemplateFormComponent),
  },
  {
    path: 'management/label-templates/edit/:id',
    loadComponent: () =>
      import('./pages/management/label-template-form/label-template-form.component').then((m) => m.LabelTemplateFormComponent),
  },

  // Workflow form routes
  {
    path: 'management/workflows/add',
    loadComponent: () =>
      import('./pages/management/workflow-form/workflow-form.component').then((m) => m.WorkflowFormComponent),
  },
  {
    path: 'management/workflows/edit/:id',
    loadComponent: () =>
      import('./pages/management/workflow-form/workflow-form.component').then((m) => m.WorkflowFormComponent),
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
  // Purchase receiving route (new implementation)
  {
    path: 'stock-management/purchases/receive',
    loadComponent: () =>
      import('./pages/product-receive/product-receive.component').then((m) => m.ProductReceiveComponent),
  },

  // Purchase detail routes
  {
    path: 'stock-management/purchases/:id',
    loadComponent: () =>
      import('./pages/purchase-detail/purchase-detail.component').then((m) => m.PurchaseDetailComponent),
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

  // Repair detail routes
  {
    path: 'stock-management/repairs/:id',
    loadComponent: () =>
      import('./pages/repair-detail/repair-detail.component').then((m) => m.RepairDetailComponent),
  },


  // Device History page route
  {
    path: 'device-history',
    loadComponent: () =>
      import('./pages/device-history/device-history.component').then((m) => m.DeviceHistoryComponent),
  },

  // Repair Reasons form routes
  {
    path: 'stock-management/repair-reasons/add',
    loadComponent: () =>
      import('./pages/repair-reasons-form/repair-reasons-form.component').then((m) => m.RepairReasonsFormComponent),
  },
  {
    path: 'stock-management/repair-reasons/:id/edit',
    loadComponent: () =>
      import('./pages/repair-reasons-form/repair-reasons-form.component').then((m) => m.RepairReasonsFormComponent),
  },

  // SKU Specs form routes
  {
    path: 'stock-management/sku-specs/add',
    loadComponent: () =>
      import('./pages/sku-specs-form/sku-specs-form.component').then((m) => m.SkuSpecsFormComponent),
  },
  {
    path: 'stock-management/sku-specs/:id/edit',
    loadComponent: () =>
      import('./pages/sku-specs-form/sku-specs-form.component').then((m) => m.SkuSpecsFormComponent),
  },

  // Dead IMEI form routes
  {
    path: 'stock-management/dead-imei/add',
    loadComponent: () =>
      import('./pages/stock-management/dead-imei-form/dead-imei-form.component').then((m) => m.DeadIMEIFormComponent),
  },

  // Workflow Editor routes
  {
    path: 'workflow-editor',
    loadComponent: () =>
      import('./pages/workflow-editor/workflow-editor.component').then((m) => m.WorkflowEditorComponent),
  },
  {
    path: 'workflow-editor/:id',
    loadComponent: () =>
      import('./pages/workflow-editor/workflow-editor.component').then((m) => m.WorkflowEditorComponent),
  },

  // Document Editor routes
  {
    path: 'labels',
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },
  {
    path: 'label',
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },
  {
    path: 'labels/:id',
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },
  {
    path: 'label/:id',
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },

  // Fallback
  { path: '**', redirectTo: 'login' },
];
