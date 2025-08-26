import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly isOpen = signal(false);

  toggleSidebar() {
    this.isOpen.update(open => !open);
  }

  closeSidebar() {
    this.isOpen.set(false);
  }
}
