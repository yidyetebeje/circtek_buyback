import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  @Input() status: 'Active' | 'Invited' | 'Inactive' | undefined;

  get badgeClass() {
    switch (this.status) {
      case 'Active':
        return 'badge-success';
      case 'Invited':
        return 'badge-warning';
      case 'Inactive':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }
}
