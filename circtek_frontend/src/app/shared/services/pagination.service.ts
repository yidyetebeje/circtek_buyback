import { Injectable, signal } from '@angular/core';

export interface PaginationPreferences {
  pageSize: number;
  defaultPageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  private readonly STORAGE_KEY = 'circtek_pagination_preferences';
  private readonly DEFAULT_PAGE_SIZE = 10;
  
  // Global pagination preferences signal
  private _preferences = signal<PaginationPreferences>({
    pageSize: this.DEFAULT_PAGE_SIZE,
    defaultPageSize: this.DEFAULT_PAGE_SIZE
  });

  constructor() {
    // Load preferences from localStorage on service initialization
    this.loadPreferences();
  }

  /**
   * Get current pagination preferences
   */
  getPreferences() {
    return this._preferences();
  }

  /**
   * Get the current preferred page size
   */
  getPageSize(): number {
    return this._preferences().pageSize;
  }

  /**
   * Set the preferred page size and persist it
   */
  setPageSize(pageSize: number): void {
    if (pageSize <= 0) {
      pageSize = this.DEFAULT_PAGE_SIZE;
    }
    
    const currentPrefs = this._preferences();
    const newPrefs = {
      ...currentPrefs,
      pageSize
    };
    
    this._preferences.set(newPrefs);
    this.savePreferences(newPrefs);
  }

  /**
   * Reset page size to default
   */
  resetPageSize(): void {
    this.setPageSize(this.DEFAULT_PAGE_SIZE);
  }

  /**
   * Get page size for a component, falling back to stored preference if URL doesn't specify
   */
  getPageSizeWithFallback(urlPageSize?: number | null): number {
    // If URL has a valid page size, use it
    if (urlPageSize && urlPageSize > 0) {
      return urlPageSize;
    }
    // Otherwise, use the stored preference
    return this.getPageSize();
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PaginationPreferences;
        // Validate the loaded data
        if (parsed.pageSize && parsed.pageSize > 0) {
          this._preferences.set({
            pageSize: parsed.pageSize,
            defaultPageSize: parsed.defaultPageSize || this.DEFAULT_PAGE_SIZE
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load pagination preferences from localStorage:', error);
      // Reset to defaults on error
      this.resetPageSize();
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(preferences: PaginationPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save pagination preferences to localStorage:', error);
    }
  }

  /**
   * Create a reactive signal for page size changes
   * Components can use this to react to page size changes
   */
  createPageSizeSignal() {
    return signal(this.getPageSize());
  }
}
