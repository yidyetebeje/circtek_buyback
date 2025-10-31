import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject, takeUntil, catchError, tap, map } from 'rxjs';
import { ApiService } from './api.service';
import { CurrencyState, CurrencySymbol, CurrencyResolved } from '../models/currency.model';

@Injectable({
  providedIn: 'root'
})
export class CurrencyService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroy$ = new Subject<void>();

  // Local storage keys
  private readonly CURRENCY_CODE_KEY = 'ct_currency_code';
  private readonly CURRENCY_SYMBOL_KEY = 'ct_currency_symbol';

  // Default fallback currency
  private readonly DEFAULT_CURRENCY: CurrencyState = {
    code: 'USD',
    symbol: '$'
  };

  // Currency state management
  private readonly currencySubject = new BehaviorSubject<CurrencyState>(this.DEFAULT_CURRENCY);
  public readonly current$ = this.currencySubject.asObservable();

  // Available symbols cache
  private availableSymbols: CurrencySymbol[] = [];
  private symbolsLoaded = false;

  constructor() {
    this.initializeCurrency();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize currency from localStorage and then server
   */
  private initializeCurrency(): void {
    // Start with localStorage values
    const localCurrency = this.getFromLocalStorage();
    console.log('Currency service loading from localStorage:', localCurrency);
    if (localCurrency) {
      this.currencySubject.next(localCurrency);
    }

    // Then fetch from server and update if available
    this.fetchServerPreference();
  }

  /**
   * Get currency from localStorage
   */
  private getFromLocalStorage(): CurrencyState | null {
    try {
      const code = localStorage.getItem(this.CURRENCY_CODE_KEY);
      const symbol = localStorage.getItem(this.CURRENCY_SYMBOL_KEY);
      
      if (code && symbol) {
        return { code, symbol };
      }
    } catch (error) {
      console.warn('Failed to read currency from localStorage:', error);
    }
    
    return null;
  }

  /**
   * Save currency to localStorage
   */
  private saveToLocalStorage(currency: CurrencyState): void {
    try {
      localStorage.setItem(this.CURRENCY_CODE_KEY, currency.code);
      localStorage.setItem(this.CURRENCY_SYMBOL_KEY, currency.symbol);
    } catch (error) {
      console.warn('Failed to save currency to localStorage:', error);
    }
  }

  /**
   * Fetch user preference from server
   */
  private fetchServerPreference(): void {
    this.api.getCurrencyPreference()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.warn('Failed to fetch currency preference from server:', error);
          return of(null);
        })
      )
      .subscribe((response) => {
        console.log('Server currency preference response:', response);
        if (response?.data) {
          const serverCurrency: CurrencyState = {
            code: response.data.code,
            symbol: response.data.symbol
          };
          
          console.log('Updating currency from server:', serverCurrency);
          this.currencySubject.next(serverCurrency);
          this.saveToLocalStorage(serverCurrency);
        } else {
          console.log('No server currency preference found, keeping current');
        }
      });
  }

  /**
   * Get current currency synchronously
   */
  getCurrentSync(): CurrencyState {
    return this.currencySubject.value;
  }

  /**
   * Get current symbol synchronously
   */
  getSymbolSync(): string {
    return this.currencySubject.value.symbol;
  }

  /**
   * Get current code synchronously
   */
  getCodeSync(): string {
    return this.currencySubject.value.code;
  }

  /**
   * Set user currency preference
   */
  setCurrency(code: string): Observable<boolean> {
    // Add validation and debugging
    if (!code || code.trim() === '') {
      console.error('Invalid currency code provided:', code);
      throw new Error('Currency code cannot be empty');
    }
    
    const trimmedCode = code.trim().toUpperCase();
    
    // Validate currency code format (2-10 uppercase letters)
    if (!/^[A-Z]{2,10}$/.test(trimmedCode)) {
      console.error('Invalid currency code format:', code);
      throw new Error('Currency code must be 2-10 uppercase letters');
    }
    
    const payload = { code: trimmedCode };
    console.log('Setting currency with payload:', payload);
    
    return this.api.setCurrencyPreference(payload)
      .pipe(
        tap((response) => {
          if (response?.data) {
            const newCurrency: CurrencyState = {
              code: response.data.code,
              symbol: response.data.symbol
            };
            
            this.currencySubject.next(newCurrency);
            this.saveToLocalStorage(newCurrency);
          }
        }),
        map(() => true), // Convert to boolean
        catchError((error) => {
          console.error('Failed to set currency preference:', {
            error,
            payload,
            originalCode: code,
            trimmedCode,
            errorMessage: error?.error?.message || error?.message
          });
          throw error;
        })
      );
  }

  /**
   * Get available currency symbols for the tenant
   */
  getAvailableSymbols(forceRefresh = false): Observable<CurrencySymbol[]> {
    if (this.symbolsLoaded && !forceRefresh) {
      return of(this.availableSymbols);
    }

    return this.api.getCurrencySymbols()
      .pipe(
        map((response) => {
          if (response?.data) {
            const symbols = response.data.filter(symbol => symbol.is_active);
            this.availableSymbols = symbols;
            this.symbolsLoaded = true;
            return symbols;
          }
          return [];
        }),
        catchError((error) => {
          console.error('Failed to load available currency symbols:', error);
          return of([]);
        })
      );
  }

  /**
   * Format currency amount with current symbol
   */
  formatAmount(amount: number, options: { decimals?: number; space?: boolean } = {}): string {
    const { decimals = 2, space = false } = options;
    const symbol = this.getSymbolSync();
    const n = isFinite(amount) ? amount : 0;
    const formatted = n.toFixed(decimals);
    
    return space ? `${symbol} ${formatted}` : `${symbol}${formatted}`;
  }

  /**
   * Check if a currency code is valid for the current tenant
   */
  isValidCurrencyCode(code: string): boolean {
    return this.availableSymbols.some(symbol => 
      symbol.code === code && symbol.is_active
    );
  }

  /**
   * Get currency symbol by code
   */
  getSymbolByCode(code: string): string {
    const currency = this.availableSymbols.find(symbol => symbol.code === code);
    return currency?.symbol || this.DEFAULT_CURRENCY.symbol;
  }

  /**
   * Clear cached symbols (useful when switching tenants)
   */
  clearCache(): void {
    this.availableSymbols = [];
    this.symbolsLoaded = false;
  }

  /**
   * Reset to default currency
   */
  resetToDefault(): void {
    this.currencySubject.next(this.DEFAULT_CURRENCY);
    this.saveToLocalStorage(this.DEFAULT_CURRENCY);
  }
}