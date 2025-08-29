import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-cell',
  imports: [CommonModule],
  template: `
    <span class="text-sm text-base-content/70">{{ displayIndex() }}</span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCellComponent {
  @Input() base: number = 0; // base index = pageIndex * pageSize
  @Input() idx: number = 0;  // row index within current page

  displayIndex = computed(() => (this.base ?? 0) + (this.idx ?? 0) + 1);
}
