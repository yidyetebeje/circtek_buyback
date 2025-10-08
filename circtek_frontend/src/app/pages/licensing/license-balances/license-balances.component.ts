import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ColumnDef } from '@tanstack/angular-table';
import { GenericPageComponent } from '../../../shared/components/generic-page/generic-page.component';
import { CommonModule } from '@angular/common';
import { LicensingService, LicenseBalance } from '../../../services/licensing.service';

@Component({
  selector: 'app-license-balances',
  imports: [CommonModule, GenericPageComponent],
  templateUrl: './license-balances.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseBalancesComponent {
  private readonly licensingService = inject(LicensingService);

  protected readonly loading = signal(false);
  protected readonly balances = signal<LicenseBalance[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly totalValue = computed(() => {
    return this.balances().reduce((sum, b) => {
      return sum + (b.balance * Number(b.price));
    }, 0);
  });

  protected readonly totalLicenses = computed(() => {
    return this.balances().reduce((sum, b) => sum + b.balance, 0);
  });

  protected readonly columns: ColumnDef<LicenseBalance>[] = [
    {
      accessorKey: 'license_type_name',
      header: 'License Type',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'product_category',
      header: 'Category',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'test_type',
      header: 'Test Type',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: (info) => {
        const balance = Number(info.getValue());
        return balance;
      },
      meta: {
        cellClass: (row: LicenseBalance) => {
          if (row.balance <= 0) return 'text-error font-semibold';
          if (row.balance < 10) return 'text-warning font-semibold';
          return 'text-success font-semibold';
        },
      },
    },
    {
      accessorKey: 'price',
      header: 'Unit Price',
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
    },
    {
      id: 'total_value',
      header: 'Total Value',
      cell: (info) => {
        const row = info.row.original as LicenseBalance;
        const value = row.balance * Number(row.price);
        return `$${value.toFixed(2)}`;
      },
    },
  ];

  constructor() {
    this.loadBalances();
  }

  protected loadBalances(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.licensingService.getBalances().subscribe({
      next: (response) => {
        this.balances.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading balances:', error);
        this.errorMessage.set('Failed to load license balances');
        this.loading.set(false);
      },
    });
  }
}
