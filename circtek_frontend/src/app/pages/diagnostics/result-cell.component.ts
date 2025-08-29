import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Diagnostic } from '../../core/models/diagnostic';

@Component({
  selector: 'app-result-cell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="btn btn-xs px-3 py-2 cursor-pointer"
      [class.btn-error]="status() === 'failed'"
      [class.btn-warning]="status() === 'pending'"
      [class.btn-success]="status() === 'success'"
      (click)="openDetails?.(row)"
      [attr.aria-label]="label()"
      [attr.title]="'View diagnostic details'"
    >
      <span class="text-xs font-semibold">{{ label() }}</span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultCellComponent {
  @Input() row!: Diagnostic;
  @Input() openDetails: ((row: Diagnostic) => void) | undefined;

  private hasText(text: string | null | undefined): boolean {
    return !!(text && String(text).trim().length);
  }

  status = computed<'failed' | 'pending' | 'success'>(() => {
    if (this.hasText(this.row?.failed_components)) return 'failed';
    if (this.hasText(this.row?.pending_components)) return 'pending';
    return 'success';
  });

  label = computed<string>(() => {
    const s = this.status();
    if (s === 'failed') return 'Diagnostic Failed';
    if (s === 'pending') return 'Diagnostic Pending';
    return 'Diagnostic Successful';
  });
}
