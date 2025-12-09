import { Routes } from '@angular/router';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { repairGuard } from './core/guards/repair.guard';
import { repairReasonGuard } from './core/guards/repair-reason.guard';
import { stockGuard } from './core/guards/stock.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },

  {
    path: 'dashboard',
    canMatch: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },

  // Example page route (lazy-loaded component)
  {
    path: 'example',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./pages/example/example.component').then((m) => m.ExampleComponent),
  },

  // Diagnostics page route (lazy-loaded component)
  {
    path: 'diagnostics',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./pages/diagnostics/diagnostics.component').then((m) => m.DiagnosticsComponent),
  },
  {
    path: 'diagnostics/report/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./pages/diagnostics/diagnostic-report.component').then((m) => m.DiagnosticReportComponent),
  },

  // Management page route (lazy-loaded component)
  {
    path: 'management',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/management.component').then((m) => m.ManagementComponent),
  },

  // User form routes
  {
    path: 'management/users/add',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: 'management/users/edit/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/user-form/user-form.component').then((m) => m.UserFormComponent),
  },

  // Warehouse form routes
  {
    path: 'management/warehouses/add',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/warehouse-form/warehouse-form.component').then((m) => m.WarehouseFormComponent),
  },
  {
    path: 'management/warehouses/edit/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/warehouse-form/warehouse-form.component').then((m) => m.WarehouseFormComponent),
  },

  // WiFi Profile form routes
  {
    path: 'management/wifi-profiles/add',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/wifi-profile-form/wifi-profile-form.component').then((m) => m.WiFiProfileFormComponent),
  },
  {
    path: 'management/wifi-profiles/edit/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/wifi-profile-form/wifi-profile-form.component').then((m) => m.WiFiProfileFormComponent),
  },

  // Label Template form routes
  {
    path: 'management/label-templates/add',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/label-template-form/label-template-form.component').then((m) => m.LabelTemplateFormComponent),
  },
  {
    path: 'management/label-templates/edit/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/label-template-form/label-template-form.component').then((m) => m.LabelTemplateFormComponent),
  },

  // Workflow form routes
  {
    path: 'management/workflows/add',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/workflow-form/workflow-form.component').then((m) => m.WorkflowFormComponent),
  },
  {
    path: 'management/workflows/edit/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/management/workflow-form/workflow-form.component').then((m) => m.WorkflowFormComponent),
  },

  // Tenant form routes (super_admin only; component self-guards)
  {
    path: 'management/tenants/add',
    canMatch: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./pages/management/tenant-form/tenant-form.component').then((m) => m.TenantFormComponent),
  },
  {
    path: 'management/tenants/edit/:id',
    canMatch: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./pages/management/tenant-form/tenant-form.component').then((m) => m.TenantFormComponent),
  },

  // Stock Management page route (lazy-loaded component)
  {
    path: 'stock-management',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/stock-management/stock-management.component').then((m) => m.StockManagementComponent),
  },

  // Stock In page route (lazy-loaded component)
  {
    path: 'stock-in',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/stock-in/stock-in.component').then((m) => m.StockInComponent),
  },

  // Repair Management page route (lazy-loaded component)
  {
    path: 'repair',
    canMatch: [authGuard, repairGuard],
    loadComponent: () =>
      import('./pages/repair/repair.component').then((m) => m.RepairComponent),
  },

  // Purchase form routes
  {
    path: 'stock-management/purchases/add',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/purchase-form/purchase-form.component').then((m) => m.PurchaseFormComponent),
  },

  // Transfer form routes
  {
    path: 'stock-management/transfers/add',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/transfer-form/transfer-form.component').then((m) => m.TransferFormComponent),
  },
  // Purchase receiving route (new implementation)
  {
    path: 'stock-management/purchases/receive',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/product-receive/product-receive.component').then((m) => m.ProductReceiveComponent),
  },

  // Purchase detail routes
  {
    path: 'stock-management/purchases/:id',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/purchase-detail/purchase-detail.component').then((m) => m.PurchaseDetailComponent),
  },



  // Transfer completion routes
  {
    path: 'stock-management/transfers/:id/complete',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/transfer-completion/transfer-completion.component').then((m) => m.TransferCompletionComponent),
  },

  // Repair form routes
  {
    path: 'repair/repairs/add',
    canMatch: [authGuard, repairGuard],
    loadComponent: () =>
      import('./pages/repair-form/repair-form.component').then((m) => m.RepairFormComponent),
  },

  // Repair detail routes
  {
    path: 'repair/repairs/:id',
    canMatch: [authGuard, repairGuard],
    loadComponent: () =>
      import('./pages/repair-detail/repair-detail.component').then((m) => m.RepairDetailComponent),
  },

  // Repairs Analytics page route
  {
    path: 'repair/analytics',
    canMatch: [authGuard, repairGuard],
    loadComponent: () =>
      import('./pages/repairs-analytics/repairs-analytics.component').then((m) => m.RepairsAnalyticsComponent),
  },

  // Device History page route
  {
    path: 'device-history',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./pages/device-history/device-history.component').then((m) => m.DeviceHistoryComponent),
  },

  // Repair Reasons form routes (admin/super-admin/repair-manager)
  {
    path: 'repair/repair-reasons/add',
    canMatch: [authGuard, repairReasonGuard],
    loadComponent: () =>
      import('./pages/repair-reasons-form/repair-reasons-form.component').then((m) => m.RepairReasonsFormComponent),
  },
  {
    path: 'repair/repair-reasons/:id/edit',
    canMatch: [authGuard, repairReasonGuard],
    loadComponent: () =>
      import('./pages/repair-reasons-form/repair-reasons-form.component').then((m) => m.RepairReasonsFormComponent),
  },

  // SKU Specs form routes
  {
    path: 'stock-management/sku-specs/add',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/sku-specs-form/sku-specs-form.component').then((m) => m.SkuSpecsFormComponent),
  },
  {
    path: 'stock-management/sku-specs/:id/edit',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/sku-specs-form/sku-specs-form.component').then((m) => m.SkuSpecsFormComponent),
  },

  // SKU Mapping form routes
  {
    path: 'stock-management/sku-mappings/add',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/stock-management/sku-mapping-form/sku-mapping-form.component').then((m) => m.SkuMappingFormComponent),
  },
  {
    path: 'stock-management/sku-mappings/:id/edit',
    canMatch: [authGuard, stockGuard],
    loadComponent: () =>
      import('./pages/stock-management/sku-mapping-form/sku-mapping-form.component').then((m) => m.SkuMappingFormComponent),
  },

  // Dead IMEI form routes
  {
    path: 'repair/dead-imei/add',
    canMatch: [authGuard, repairGuard],
    loadComponent: () =>
      import('./pages/stock-management/dead-imei-form/dead-imei-form.component').then((m) => m.DeadIMEIFormComponent),
  },

  // Workflow Editor routes
  {
    path: 'workflow-editor',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/workflow-editor/workflow-editor.component').then((m) => m.WorkflowEditorComponent),
  },
  {
    path: 'workflow-editor/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/workflow-editor/workflow-editor.component').then((m) => m.WorkflowEditorComponent),
  },

  // Document Editor routes
  {
    path: 'labels',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },
  {
    path: 'label',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },
  {
    path: 'labels/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },
  {
    path: 'label/:id',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/document-editor/document-editor.component').then((m) => m.default),
  },

  // Licensing routes
  {
    path: 'licensing',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/licensing/licensing.component').then((m) => m.LicensingComponent),
  },
  {
    path: 'licensing/request',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/licensing/request-licenses/request-licenses.component').then((m) => m.RequestLicensesComponent),
  },
  {
    path: 'licensing/quick-grant',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/licensing/quick-grant/quick-grant.component').then((m) => m.QuickGrantComponent),
  },

  // Diagnostic Questions routes
  {
    path: 'questions/new',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/diagnostic-questions/question-set-form/question-set-form.component').then((m) => m.QuestionSetFormComponent),
  },
  {
    path: 'questions/:id/edit',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/diagnostic-questions/question-set-form/question-set-form.component').then((m) => m.QuestionSetFormComponent),
  },

  // Fallback
  { path: '**', redirectTo: 'login' },
];
