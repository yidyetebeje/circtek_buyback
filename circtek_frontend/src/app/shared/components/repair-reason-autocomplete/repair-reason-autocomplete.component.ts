import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface RepairReasonOption {
  id: number;
  name: string;
  description?: string | null;
  fixed_price?: number | null;
}

@Component({
  selector: 'app-repair-reason-autocomplete',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './repair-reason-autocomplete.component.html',
  styleUrls: ['./repair-reason-autocomplete.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairReasonAutocompleteComponent {
  private readonly api = inject(ApiService);

  // Inputs
  valueId = input<number | null>(null);
  placeholder = input<string>('Search reason...');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  onlyFixedPrice = input<boolean>(false);

  // Outputs
  valueChange = output<number | null>();
  selected = output<RepairReasonOption>();

  // State
  searchControl = new FormControl('');
  options = signal<RepairReasonOption[]>([]);
  loading = signal<boolean>(false);
  showDropdown = signal<boolean>(false);
  error = signal<string | null>(null);
  highlightedIndex = signal<number>(-1);

  activeOptionId = computed(() => {
    const index = this.highlightedIndex();
    return index >= 0 ? `reason-option-${index}` : null;
  });

  constructor() {
    // Reflect external value into input text if needed (fetch label on demand)
    effect(() => {
      const id = this.valueId();
      if (id == null) return;
      // Try to locate in current options first
      const existing = this.options().find(o => o.id === id);
      if (existing) {
        if (this.searchControl.value !== existing.name) {
          this.searchControl.setValue(existing.name, { emitEvent: false });
        }
        return;
      }
      // Fallback: fetch reason by id to display its name
      this.loading.set(true);
      this.error.set(null);
      this.api.getRepairReason(id).subscribe({
        next: (res: any) => {
          this.loading.set(false);
          const data = res?.data as RepairReasonOption | null;
          if (data?.name) {
            this.searchControl.setValue(data.name, { emitEvent: false });
          }
        },
        error: () => { this.loading.set(false); }
      });
    });

    // Setup search
    this.searchControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(query => {
        const trimmed = (query || '').toString().trim();
        this.loading.set(true);
        this.error.set(null);
        let search = trimmed;
        const limit = trimmed ? 20 : 50;
        return this.fetchReasons(search, limit).pipe(
          catchError(() => {
            this.error.set('Failed to load reasons');
            return of({ data: [], status: 500 });
          })
        );
      })
    ).subscribe((res: any) => {
      this.loading.set(false);
      const data: RepairReasonOption[] = Array.isArray(res) ? [] : (res?.data ?? []);
      const filtered = this.onlyFixedPrice() ? data.filter(r => (r.fixed_price ?? 0) > 0) : data;
      this.options.set(filtered);
      this.showDropdown.set(filtered.length > 0);
      this.highlightedIndex.set(-1);
    });

    // Initial load
    this.loadInitial();
  }

  private loadInitial() {
    this.loading.set(true);
    this.error.set(null);
    this.fetchReasons('', 50).pipe(
      catchError(() => {
        this.error.set('Failed to load reasons');
        return of({ data: [], status: 500 });
      })
    ).subscribe((res: any) => {
      this.loading.set(false);
      const data: RepairReasonOption[] = Array.isArray(res) ? [] : (res?.data ?? []);
      const filtered = this.onlyFixedPrice() ? data.filter(r => (r.fixed_price ?? 0) > 0) : data;
      this.options.set(filtered);
    });
  }

  private fetchReasons(search: string, limit: number) {
    let params = new HttpParams()
      .set('page', '1')
      .set('limit', String(limit));
    if (search) params = params.set('search', search);
    return this.api.getRepairReasons(params);
  }

  onFocus() {
    if (this.options().length > 0) this.showDropdown.set(true);
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown.set(false);
      this.highlightedIndex.set(-1);
    }, 150);
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value || value.trim().length === 0) this.loadInitial();
  }

  selectOption(option: RepairReasonOption) {
    this.searchControl.setValue(option.name, { emitEvent: false });
    this.valueChange.emit(option.id);
    this.selected.emit(option);
    this.showDropdown.set(false);
    this.highlightedIndex.set(-1);
  }

  onKeyDown(event: KeyboardEvent) {
    const options = this.options();
    const currentIndex = this.highlightedIndex();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.showDropdown()) this.highlightedIndex.set(currentIndex < options.length - 1 ? currentIndex + 1 : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.showDropdown()) this.highlightedIndex.set(currentIndex > 0 ? currentIndex - 1 : options.length - 1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.showDropdown() && currentIndex >= 0 && currentIndex < options.length) this.selectOption(options[currentIndex]);
        break;
      case 'Escape':
        this.showDropdown.set(false);
        this.highlightedIndex.set(-1);
        break;
    }
  }
}


