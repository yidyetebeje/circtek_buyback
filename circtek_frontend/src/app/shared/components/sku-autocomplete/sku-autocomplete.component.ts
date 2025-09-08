import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LucideAngularModule, Search, Plus } from 'lucide-angular';

export interface SkuOption {
  sku: string;
  model_name: string | null;
  is_part: boolean | null;
}

@Component({
  selector: 'app-sku-autocomplete',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './sku-autocomplete.component.html',
  styleUrls: ['./sku-autocomplete.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkuAutocompleteComponent {
  private readonly api = inject(ApiService);

  // Inputs
  value = input<string>('');
  placeholder = input<string>('Search or enter SKU...');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  isPart = input<boolean | undefined>();

  // Outputs
  valueChange = output<string>();
  skuSelected = output<SkuOption>();
  createNew = output<string>();

  // State
  searchControl = new FormControl('');
  options = signal<SkuOption[]>([]);
  loading = signal<boolean>(false);
  showDropdown = signal<boolean>(false);
  error = signal<string | null>(null);
  highlightedIndex = signal<number>(-1);
  activeOptionId = computed(() => {
    const index = this.highlightedIndex();
    return index >= 0 ? `sku-option-${index}` : null;
  });

  // Icons
  protected readonly SearchIcon = Search;
  protected readonly PlusIcon = Plus;

  // Computed
  filteredOptions = computed(() => {
    const query = this.searchControl.value?.toLowerCase() || '';
    return this.options().filter(option => 
      option.sku.toLowerCase().includes(query) || 
      (option.model_name?.toLowerCase() || '').includes(query)
    );
  });

  hasResults = computed(() => this.filteredOptions().length > 0);
  showCreateOption = computed(() => {
    const query = (this.searchControl.value?.trim() || '').toLowerCase();
    const hasExactSku = this.filteredOptions().some(option => option.sku.toLowerCase() === query);
    return query.length > 0 && !this.loading() && !hasExactSku;
  });

  constructor() {
    // Set initial value
    effect(() => {
      const initialValue = this.value();
      if (initialValue && initialValue !== this.searchControl.value) {
        this.searchControl.setValue(initialValue, { emitEvent: false });
      }
    });

    // Setup search with debouncing
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        const trimmedQuery = query?.trim() || '';
        
        // If query is empty or less than 2 chars, fetch all SKU specs
        if (!trimmedQuery || trimmedQuery.length < 2) {
          this.loading.set(true);
          this.error.set(null);
          
          return this.api.searchSkuSpecsAutocomplete('', 50, this.isPart()).pipe(
            catchError(error => {
              this.error.set('Failed to load SKU specs');
              return of({ data: [], status: 500, message: 'Error' });
            })
          );
        }

        this.loading.set(true);
        this.error.set(null);
        
        return this.api.searchSkuSpecsAutocomplete(trimmedQuery, 10, this.isPart()).pipe(
          catchError(error => {
            this.error.set('Failed to search SKU specs');
            return of({ data: [], status: 500, message: 'Error' });
          })
        );
      })
    ).subscribe(response => {
      this.loading.set(false);
      if (Array.isArray(response)) {
        // Handle error case that returns empty array
        this.options.set([]);
        this.showDropdown.set(false);
      } else if (response.status === 200) {
        this.options.set(response.data);
        this.showDropdown.set(true);
        this.highlightedIndex.set(-1);
      } else {
        this.options.set([]);
        this.showDropdown.set(false);
      }
    });

    // Load all SKU specs initially
    this.loadAllSkuSpecs();
  }

  private loadAllSkuSpecs() {
    this.loading.set(true);
    this.error.set(null);
    
    this.api.searchSkuSpecsAutocomplete('', 50, this.isPart()).pipe(
      catchError(error => {
        this.error.set('Failed to load SKU specs');
        return of({ data: [], status: 500, message: 'Error' });
      })
    ).subscribe(response => {
      this.loading.set(false);
      if (Array.isArray(response)) {
        this.options.set([]);
      } else if (response.status === 200) {
        this.options.set(response.data);
      } else {
        this.options.set([]);
      }
    });
  }

  onFocus() {
    // Show dropdown if there are options available
    if (this.options().length > 0) {
      this.showDropdown.set(true);
    }
  }

  onBlur() {
    // Delay hiding dropdown to allow for option selection
    setTimeout(() => {
      this.showDropdown.set(false);
      this.highlightedIndex.set(-1);
    }, 150);
  }

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.valueChange.emit(value);
    
    // If user clears the input, show all options
    if (!value || value.trim().length === 0) {
      this.loadAllSkuSpecs();
    }
  }

  selectOption(option: SkuOption) {
    this.searchControl.setValue(option.sku, { emitEvent: false });
    this.valueChange.emit(option.sku);
    this.skuSelected.emit(option);
    this.showDropdown.set(false);
    this.highlightedIndex.set(-1);
  }

  createNewSku() {
    const query = this.searchControl.value?.trim() || '';
    if (query) {
      this.createNew.emit(query);
      this.showDropdown.set(false);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    const options = this.filteredOptions();
    const currentIndex = this.highlightedIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.showDropdown()) {
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          this.highlightedIndex.set(nextIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.showDropdown()) {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          this.highlightedIndex.set(prevIndex);
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (this.showDropdown() && currentIndex >= 0 && currentIndex < options.length) {
          this.selectOption(options[currentIndex]);
        } else if (this.showCreateOption()) {
          this.createNewSku();
        }
        break;

      case 'Escape':
        this.showDropdown.set(false);
        this.highlightedIndex.set(-1);
        break;
    }
  }

  getOptionDisplayText(option: SkuOption): string {
    return `${option.sku} - ${option.model_name || 'No model name'}`;
  }

  getOptionBadgeText(option: SkuOption): string {
    return option.is_part ? 'Part' : 'Device';
  }

  getOptionBadgeClass(option: SkuOption): string {
    return option.is_part ? 'badge-part' : 'badge-device';
  }

  // Public method to refresh the list
  refreshList() {
    this.loadAllSkuSpecs();
  }
}