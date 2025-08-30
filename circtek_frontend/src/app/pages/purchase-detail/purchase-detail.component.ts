import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { PurchaseWithItemsAndReceived } from '../../core/models/purchase';

@Component({
  selector: 'app-purchase-detail',
  imports: [CommonModule],
  templateUrl: './purchase-detail.component.html',
  styleUrls: ['./purchase-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // State
  purchase = signal<PurchaseWithItemsAndReceived | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');
  showDocuments = signal<boolean>(false);

  // Computed
  title = computed(() => {
    const p = this.purchase();
    return p ? `Purchase Order - ${p.purchase.purchase_order_no}` : 'Purchase Order Details';
  });

  progressPercentage = computed(() => {
    const p = this.purchase();
    if (!p || p.total_items === 0) return 0;
    return Math.round((p.total_received / p.total_items) * 100);
  });

  availableDocuments = computed(() => {
    const p = this.purchase();
    if (!p) return [];
    
    const docs = [];
    if (p.purchase.invoice) docs.push({ name: 'Invoice', url: p.purchase.invoice, type: 'invoice' });
    if (p.purchase.transport_doc) docs.push({ name: 'Transport Document', url: p.purchase.transport_doc, type: 'transport' });
    if (p.purchase.receiving_picture) docs.push({ name: 'Receiving Picture', url: p.purchase.receiving_picture, type: 'image' });
    if (p.purchase.order_confirmation_doc) docs.push({ name: 'Order Confirmation', url: p.purchase.order_confirmation_doc, type: 'confirmation' });
    
    return docs;
  });

  // Table configuration
  tableData = computed(() => {
    const p = this.purchase();
    if (!p) return [];
    
    return p.items.map(item => ({
      id: item.id,
      sku: item.sku,
      ordered_quantity: item.quantity,
      received_quantity: item.received_quantity,
      remaining_quantity: item.remaining_quantity,
      unit_price: `$${item.price.toFixed(2)}`,
      total_price: `$${(item.quantity * item.price).toFixed(2)}`,
      type: item.is_part ? 'Part' : 'Device',
      status: item.remaining_quantity === 0 ? 'Complete' : 
              item.received_quantity > 0 ? 'Partial' : 'Pending'
    }));
  });

  tableColumns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'ordered_quantity', label: 'Ordered', sortable: true },
    { key: 'received_quantity', label: 'Received', sortable: true },
    { key: 'remaining_quantity', label: 'Remaining', sortable: true },
    { key: 'unit_price', label: 'Unit Price', sortable: false },
    { key: 'total_price', label: 'Total Price', sortable: false },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'status', label: 'Status', sortable: true }
  ];

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPurchase(parseInt(id));
    } else {
      this.error.set('Purchase ID is required');
      this.loading.set(false);
    }
  }

  private loadPurchase(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getPurchase(id).subscribe({
      next: (response) => {
        if (response.status === 200 && response.data) {
          this.purchase.set(response.data);
        } else {
          this.error.set(response.message || 'Failed to load purchase');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load purchase');
        this.loading.set(false);
        console.error('Load purchase error:', error);
      }
    });
  }

  // Document handling methods
  toggleDocuments(): void {
    this.showDocuments.update(show => !show);
  }

  viewDocument(doc: any): void {
    window.open(doc.url, '_blank');
  }

  // Navigation methods
  navigateToReceiving(): void {
    const purchaseId = this.purchase()?.purchase.id;
    if (purchaseId) {
      this.router.navigate(['/stock-management/receive-items'], { 
        queryParams: { purchaseId } 
      });
    }
  }

  navigateBack(): void {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'purchases' } 
    });
  }

  // Table action handlers
  onRowAction(action: string, row: any): void {
    // Handle row actions if needed
  }

  // Custom cell rendering
  renderCell(column: string, value: any, row: any): string {
    switch (column) {
      case 'status':
        return `<span class="badge ${this.getStatusBadgeClass(value)}">${value}</span>`;
      case 'type':
        return `<span class="badge ${row.type === 'Part' ? 'badge-secondary' : 'badge-accent'}">${value}</span>`;
      default:
        return value?.toString() || '';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Complete': return 'badge-success';
      case 'Partial': return 'badge-warning';
      case 'Pending': return 'badge-ghost';
      default: return 'badge-ghost';
    }
  }
}
