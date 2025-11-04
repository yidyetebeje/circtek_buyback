import { Component, input, output, signal, computed, effect, ChangeDetectionStrategy, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronDown, Search, X } from 'lucide-angular';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchableSelectComponent {
  // Icons
  readonly ChevronDown = ChevronDown;
  readonly Search = Search;
  readonly X = X;

  // Inputs
  options = input.required<string[]>();
  value = input<string>('');
  placeholder = input<string>('Select...');
  disabled = input<boolean>(false);
  label = input<string>('');
  required = input<boolean>(false);
  error = input<string>('');

  // Outputs
  valueChange = output<string>();

  // State
  isOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  highlightedIndex = signal<number>(0);

  // View references
  searchInput = viewChild<ElementRef>('searchInput');

  // Computed
  filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.options();
    return this.options().filter(option => 
      option.toLowerCase().includes(query)
    );
  });

  displayValue = computed(() => {
    return this.value() || this.placeholder();
  });

  constructor() {
    // Reset search when dropdown closes
    effect(() => {
      if (!this.isOpen()) {
        this.searchQuery.set('');
        this.highlightedIndex.set(0);
      }
    });

    // Focus search input when dropdown opens
    effect(() => {
      if (this.isOpen()) {
        setTimeout(() => {
          this.searchInput()?.nativeElement?.focus();
        }, 10);
      }
    });
  }

  toggleDropdown() {
    if (!this.disabled()) {
      this.isOpen.update(v => !v);
    }
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  selectOption(option: string) {
    this.valueChange.emit(option);
    this.closeDropdown();
  }

  clearSelection(event: Event) {
    event.stopPropagation();
    this.valueChange.emit('');
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.highlightedIndex.set(0);
  }

  onKeyDown(event: KeyboardEvent) {
    const filtered = this.filteredOptions();
    const currentIndex = this.highlightedIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < filtered.length - 1) {
          this.highlightedIndex.set(currentIndex + 1);
          this.scrollToHighlighted();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          this.highlightedIndex.set(currentIndex - 1);
          this.scrollToHighlighted();
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (filtered.length > 0 && currentIndex >= 0) {
          this.selectOption(filtered[currentIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
    }
  }

  private scrollToHighlighted() {
    setTimeout(() => {
      const highlighted = document.querySelector('.option-highlighted');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }

  // Click outside handler would be implemented with HostListener or similar
}