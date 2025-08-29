import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-date-cell',
  imports: [CommonModule],
  template: `
    <span>
      {{ value ? (value | date: 'MMMM d, y, h:mm a') : 'N/A' }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateCellComponent {
  @Input() value: string | null = null;
}
