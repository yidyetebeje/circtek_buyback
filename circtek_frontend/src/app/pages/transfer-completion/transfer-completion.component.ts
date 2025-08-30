import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { TransferWithDetails } from '../../core/models/transfer';

@Component({
  selector: 'app-transfer-completion',
  imports: [CommonModule, GenericFormPageComponent],
  templateUrl: './transfer-completion.component.html',
  styleUrls: ['./transfer-completion.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferCompletionComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // State
  transfer = signal<TransferWithDetails | null>(null);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  error = signal<string>('');

  // Computed
  title = computed(() => {
    const t = this.transfer();
    return t ? `Complete Transfer #${t.id}` : 'Complete Transfer';
  });

  transferId = computed(() => {
    const t = this.transfer();
    return t?.id || 0;
  });

  canComplete = computed(() => {
    const t = this.transfer();
    return t && !t.is_completed;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTransfer(parseInt(id));
    } else {
      this.error.set('Transfer ID is required');
      this.loading.set(false);
    }
  }

  private loadTransfer(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getTransfer(id).subscribe({
      next: (response) => {
        if (response.status === 200 && response.data) {
          this.transfer.set(response.data);
          
          // Check if already completed
          if (response.data.is_completed) {
            this.error.set('This transfer has already been completed');
          }
        } else {
          this.error.set(response.message || 'Failed to load transfer');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load transfer');
        this.loading.set(false);
        console.error('Load transfer error:', error);
      }
    });
  }

  onSubmit(): void {
    if (!this.canComplete() || this.submitting()) return;

    this.submitting.set(true);
    this.error.set('');

    this.api.completeTransfer(this.transferId()).subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'transfers' } 
          });
        } else {
          this.error.set(response.message || 'Failed to complete transfer');
        }
        this.submitting.set(false);
      },
      error: (error) => {
        this.error.set('Failed to complete transfer');
        this.submitting.set(false);
        console.error('Complete transfer error:', error);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'transfers' } 
    });
  }

  getTotalQuantity(): number {
    const t = this.transfer();
    return t?.items.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
  }

  getDeviceItems(): any[] {
    const t = this.transfer();
    return t?.items.filter(item => !item.is_part) || [];
  }

  getPartItems(): any[] {
    const t = this.transfer();
    return t?.items.filter(item => item.is_part) || [];
  }
}
