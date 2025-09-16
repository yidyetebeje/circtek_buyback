import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Diagnostic } from '../../core/models/diagnostic';

@Component({
  selector: 'app-report-cell',
  imports: [CommonModule, RouterLink],
  template: `
    <a
      class="btn btn-ghost btn-xs"
      [routerLink]="['/diagnostics/report', row.id]"
      [attr.aria-label]="'Open detailed report for #' + row.id"
      title="Open detailed report"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
        <path d="M19 2H10a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3h3a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-6 16H5v-9h3v6a2 2 0 0 0 2 2h3Zm5-5h-8V4h8Zm-6-6h4v2h-4Z"/>
      </svg>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportCellComponent {
  @Input() row!: Diagnostic;
}