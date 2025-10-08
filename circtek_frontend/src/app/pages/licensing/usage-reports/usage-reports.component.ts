import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColumnDef } from '@tanstack/angular-table';
import { GenericPageComponent, TextFacet } from '../../../shared/components/generic-page/generic-page.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Download } from 'lucide-angular';
import { LicensingService, UsageReportEntry } from '../../../services/licensing.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-usage-reports',
  imports: [CommonModule, GenericPageComponent, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './usage-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsageReportsComponent {
  private readonly licensingService = inject(LicensingService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly Download = Download;
  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);
  protected readonly reportData = signal<UsageReportEntry[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isSuperAdmin = computed(() => 
    this.authService.currentUser()?.role_name === 'super_admin'
  );

  // Default to current month
  private readonly today = new Date();
  private readonly firstDayOfMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  private readonly lastDayOfMonth = new Date(this.today.getFullYear(), this.today.getMonth() + 1, 0);

  protected readonly filterForm: FormGroup = this.fb.group({
    start_date: [this.formatDate(this.firstDayOfMonth), [Validators.required]],
    end_date: [this.formatDate(this.lastDayOfMonth), [Validators.required]],
  });

  protected readonly totalRevenue = computed(() => {
    return this.reportData().reduce((sum, entry) => sum + Number(entry.total_price), 0);
  });

  protected readonly totalTests = computed(() => {
    return this.reportData().reduce((sum, entry) => sum + entry.quantity_used, 0);
  });

  protected readonly facets = computed((): TextFacet[] => [
    {
      key: 'start_date',
      label: 'Start Date',
      type: 'text',
      inputType: 'date',
    },
    {
      key: 'end_date',
      label: 'End Date',
      type: 'text',
      inputType: 'date',
    },
  ]);

  protected readonly columns: ColumnDef<UsageReportEntry>[] = [
    {
      accessorKey: 'tenant_name',
      header: 'Tenant',
      cell: (info) => info.getValue(),
    },
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
      accessorKey: 'quantity_used',
      header: 'Quantity',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'unit_price',
      header: 'Unit Price',
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
    },
    {
      accessorKey: 'total_price',
      header: 'Total',
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
      meta: {
        cellClass: () => 'font-semibold text-accent',
      },
    },
  ];

  constructor() {
    if (this.isSuperAdmin()) {
      this.loadReport();
    }
  }

  protected loadReport(): void {
    if (!this.isSuperAdmin()) {
      this.errorMessage.set('Only superadmins can view usage reports');
      return;
    }

    const startDate = this.filterForm.value.start_date;
    const endDate = this.filterForm.value.end_date;

    if (!startDate || !endDate) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.licensingService.getUsageReport(startDate, endDate).subscribe({
      next: (response) => {
        this.reportData.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading usage report:', error);
        this.errorMessage.set('Failed to load usage report');
        this.loading.set(false);
      },
    });
  }

  protected handleFiltersChange(filters: { search: string; facets: Record<string, string> }): void {
    const startDate = filters.facets['start_date'];
    const endDate = filters.facets['end_date'];

    if (startDate && endDate) {
      this.filterForm.patchValue({
        start_date: startDate,
        end_date: endDate,
      });
      this.loadReport();
    }
  }

  protected exportReport(): void {
    if (!this.isSuperAdmin()) {
      return;
    }

    const startDate = this.filterForm.value.start_date;
    const endDate = this.filterForm.value.end_date;

    if (!startDate || !endDate) {
      this.errorMessage.set('Please select date range');
      return;
    }

    this.exporting.set(true);

    this.licensingService.exportUsageReport(startDate, endDate).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `license_usage_${startDate}_${endDate}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: (error) => {
        console.error('Error exporting report:', error);
        this.errorMessage.set('Failed to export report');
        this.exporting.set(false);
      },
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
