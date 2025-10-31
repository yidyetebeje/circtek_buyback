import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '../../../core/services/currency.service';
import { ToastService } from '../../../core/services/toast.service';
import { CurrencySymbol, CurrencyState } from '../../../core/models/currency.model';

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select 
      class="select select-bordered select-sm"
      [(ngModel)]="selectedCode"
      (ngModelChange)="onCurrencyChangeModel($event)"
      [disabled]="loading()"
    >
      @for (symbol of availableSymbols(); track symbol.id) {
        <option [value]="symbol.code">
          {{ symbol.symbol }} {{ symbol.code }}
        </option>
      }
    </select>
  `,
})
export class CurrencySelectorComponent implements OnInit {
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  // State
  loading = signal(false);
  availableSymbols = signal<CurrencySymbol[]>([]);
  currentCurrency = signal<CurrencyState>({ code: 'USD', symbol: '$' });
  selectedCode = 'USD'; // Regular property for ngModel

  ngOnInit(): void {
    // Set initial currency from service
    const currentCurrency = this.currencyService.getCurrentSync();
    console.log('Currency selector initialized with:', currentCurrency);
    this.currentCurrency.set(currentCurrency);
    this.selectedCode = currentCurrency.code;
    
    // Load available symbols
    this.loadAvailableSymbols();
  }

  private loadAvailableSymbols(): void {
    this.loading.set(true);
    this.currencyService.getAvailableSymbols().subscribe({
      next: (symbols) => {
        console.log('Loaded currency symbols:', symbols);
        this.availableSymbols.set(symbols);
        
        // Re-check and set the current currency after symbols are loaded
        const currentCurrency = this.currencyService.getCurrentSync();
        console.log('After symbols loaded, current currency:', currentCurrency);
        console.log('Current selectedCode before update:', this.selectedCode);
        
        this.currentCurrency.set(currentCurrency);
        this.selectedCode = currentCurrency.code;
        
        console.log('Updated selectedCode to:', this.selectedCode);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load currency symbols:', error);
        this.toast.error('Failed to load currency options');
        this.loading.set(false);
      }
    });
  }

  onCurrencyChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newCode = target.value;
    
    console.log('Currency change event:', { newCode, currentCode: this.currentCurrency().code });
    
    if (!newCode || newCode.trim() === '') {
      console.error('Empty currency code selected');
      this.toast.error('Invalid currency selection');
      return;
    }
    
    // Validate currency code format
    const trimmedCode = newCode.trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(trimmedCode)) {
      console.error('Invalid currency code format:', newCode);
      this.toast.error('Invalid currency code format');
      return;
    }
    
    if (trimmedCode === this.currentCurrency().code) {
      return; // No change
    }

    this.loading.set(true);
    this.currencyService.setCurrency(trimmedCode).subscribe({
      next: () => {
        this.toast.success(`Currency changed to ${trimmedCode}`);
        // Reload the page to reflect currency changes throughout the app
        setTimeout(() => {
          window.location.reload();
        }, 1000); // Small delay to show the success message
      },
      error: (error) => {
        console.error('Failed to change currency:', error);
        this.toast.error('Failed to change currency');
        // Reset the select to the current currency
        this.selectedCode = this.currentCurrency().code;
        this.loading.set(false);
      }
    });
  }

  onCurrencyChangeModel(newCode: string): void {
    console.log('Currency changed via ngModel:', { newCode, currentCode: this.currentCurrency().code });
    
    if (!newCode || newCode.trim() === '') {
      console.error('Empty currency code selected');
      this.toast.error('Invalid currency selection');
      return;
    }
    
    // Validate currency code format
    const trimmedCode = newCode.trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(trimmedCode)) {
      console.error('Invalid currency code format:', newCode);
      this.toast.error('Invalid currency code format');
      return;
    }
    
    if (trimmedCode === this.currentCurrency().code) {
      return; // No change
    }

    this.loading.set(true);
    this.currencyService.setCurrency(trimmedCode).subscribe({
      next: () => {
        this.toast.success(`Currency changed to ${trimmedCode}`);
        // Reload the page to reflect currency changes throughout the app
        setTimeout(() => {
          window.location.reload();
        }, 1000); // Small delay to show the success message
      },
      error: (error) => {
        console.error('Failed to change currency:', error);
        this.toast.error('Failed to change currency');
        // Reset the select to the current currency
        this.selectedCode = this.currentCurrency().code;
        this.loading.set(false);
      }
    });
  }
}
