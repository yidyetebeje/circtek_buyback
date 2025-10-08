import { Routes } from '@angular/router';
import { LicensingComponent } from './licensing.component';
import { LicenseBalancesComponent } from './license-balances/license-balances.component';
import { LicenseLedgerComponent } from './license-ledger/license-ledger.component';
import { LicenseTypesComponent } from './license-types/license-types.component';
import { UsageReportsComponent } from './usage-reports/usage-reports.component';

export const licensingRoutes: Routes = [
  {
    path: '',
    component: LicensingComponent,
    children: [
      {
        path: '',
        redirectTo: 'balances',
        pathMatch: 'full',
      },
      {
        path: 'balances',
        component: LicenseBalancesComponent,
      },
      {
        path: 'history',
        component: LicenseLedgerComponent,
      },
      {
        path: 'types',
        component: LicenseTypesComponent,
      },
      {
        path: 'reports',
        component: UsageReportsComponent,
      },
    ],
  },
];
