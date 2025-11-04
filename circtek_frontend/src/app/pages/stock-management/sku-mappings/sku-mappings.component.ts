import { ChangeDetectionStrategy, Component, computed, inject, signal, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { ColumnDef } from '@tanstack/angular-table';
import { ToastrService } from 'ngx-toastr';

import { GenericPageComponent, type GenericTab } from '../../../shared/components/generic-page/generic-page.component';
import { GenericModalComponent, type ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';
import { SkuMapping } from '../../../core/models/sku-mapping';
import { SKU_PROPERTY_LABELS } from '../../../core/constants/sku-property-options';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-sku-mappings',
  imports: [CommonModule, GenericPageComponent, GenericModalComponent],
  templateUrl: './sku-mappings.component.html',
  styleUrl: './sku-mappings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkuMappingsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  // Inputs for tab navigation
  tabs = input<GenericTab[]>([]);
  activeTab = input<string>('sku-mappings');
  tabChange = output<string | null>();

  // State
  loading = signal<boolean>(false);
  data = signal<SkuMapping[]>([]);
  total = signal<number>(0);
  
  // Delete confirmation state
  deleteConfirmOpen = signal<boolean>(false);
  deletingMapping = signal<SkuMapping | null>(null);

  // Page configuration
  title = 'SKU Mapping Manager';
  subtitle = 'Configure dynamic SKU mapping rules based on device properties';
  
  primaryAction = computed(() => ({
    label: 'Add New Mapping'
  }));

  // Table configuration
  columns = computed<ColumnDef<SkuMapping>[]>(() => [
    {
      header: 'Conditions',
      id: 'conditions',
      enableSorting: false,
      accessorFn: (row: SkuMapping) => {
        if (!row.conditions || typeof row.conditions !== 'object') {
          return 'N/A';
        }
        
        const conditions = Object.entries(row.conditions)
          .filter(([, value]) => value != null && value !== '')
          .sort(([keyA], [keyB]) => {
            const labelA = SKU_PROPERTY_LABELS[keyA as keyof typeof SKU_PROPERTY_LABELS] || keyA;
            const labelB = SKU_PROPERTY_LABELS[keyB as keyof typeof SKU_PROPERTY_LABELS] || keyB;
            return labelA.localeCompare(labelB);
          })
          .map(([key, value]) => {
            const label = SKU_PROPERTY_LABELS[key as keyof typeof SKU_PROPERTY_LABELS] || key;
            return `${label}: ${value}`;
          });
        
        return conditions.length > 0 ? conditions.join(' • ') : 'N/A';
      },
      meta: {
        cellClass: () => 'max-w-md',
        truncateText: true,
        truncateMaxWidth: '400px'
      }
    } as any,
    {
      header: 'Resulting SKU',
      accessorKey: 'sku',
      meta: {
        cellClass: () => 'font-mono'
      }
    } as any,
    {
      header: 'Actions',
      id: 'actions',
      enableSorting: false,
      meta: {
        actions: [
          { key: 'edit', label: 'Edit', class: 'text-primary' },
          { key: 'delete', label: 'Delete', class: 'text-error' }
        ],
        cellClass: () => 'text-right'
      }
    } as any,
  ]);

  // Delete confirmation modal actions
  deleteModalActions = computed<ModalAction[]>(() => [
    { label: 'Cancel', variant: 'ghost', action: 'cancel' },
    { label: 'Delete', variant: 'error', action: 'delete', loading: this.loading() }
  ]);

  constructor() {
    // Load initial data
    effect(() => {
      this.loadData();
    }, { allowSignalWrites: true });
  }

  private async loadData() {
    this.loading.set(true);
    try {
      const params = new HttpParams()
        .set('limit', '1000'); // For now, load all mappings

      const response = await this.api.getSkuMappings(params).toPromise();
      if (response) {
        this.data.set(response.data || []);
        this.total.set(response.meta?.total || response.data?.length || 0);
      }
    } catch (error) {
      console.error('Failed to load SKU mappings:', error);
      // TODO: Show error toast
    } finally {
      this.loading.set(false);
    }
  }


  // Event handlers
  onPrimaryActionClick() {
    this.router.navigate(['/stock-management/sku-mappings/add']);
  }

  onCellAction(event: { action: string; row: SkuMapping }) {
    const { action, row } = event;
    
    switch (action) {
      case 'edit':
        this.router.navigate(['/stock-management/sku-mappings', row.id, 'edit']);
        break;
      case 'delete':
        this.deletingMapping.set(row);
        this.deleteConfirmOpen.set(true);
        break;
    }
  }


  // Delete confirmation handlers
  onDeleteModalAction(action: string) {
    switch (action) {
      case 'cancel':
        this.deleteConfirmOpen.set(false);
        this.deletingMapping.set(null);
        break;
      case 'delete':
        const mapping = this.deletingMapping();
        if (mapping) {
          this.performDelete(mapping);
        }
        break;
    }
  }

  private async performDelete(mapping: SkuMapping) {
    try {
      const response = await this.api.deleteSkuMapping(mapping.id).toPromise();
      
      if (response && response.status && response.status >= 200 && response.status < 300) {
        // Success
        this.deleteConfirmOpen.set(false);
        this.deletingMapping.set(null);
        await this.loadData(); // Refresh the list
        this.toastr.success('SKU mapping deleted successfully');
      } else {
        throw new Error(response?.message || 'Failed to delete mapping');
      }
    } catch (error: any) {
      console.error('Failed to delete mapping:', error);
      this.toastr.error('Failed to delete SKU mapping');
    }
  }

  // Helper method to render conditions for display
  renderConditions(conditions: Partial<Record<string, string>>): string {
    return Object.entries(conditions)
      .filter(([, value]) => value != null)
      .sort(([keyA], [keyB]) => {
        const labelA = SKU_PROPERTY_LABELS[keyA as keyof typeof SKU_PROPERTY_LABELS];
        const labelB = SKU_PROPERTY_LABELS[keyB as keyof typeof SKU_PROPERTY_LABELS];
        return labelA.localeCompare(labelB);
      })
      .map(([key, value]) => {
        const label = SKU_PROPERTY_LABELS[key as keyof typeof SKU_PROPERTY_LABELS];
        return `${label}: ${value}`;
      })
      .join(' • ');
  }
}