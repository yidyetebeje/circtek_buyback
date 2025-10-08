import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  LayoutDashboard,
  Stethoscope,
  History,
  Users,
  Package,
  Wrench,
  CreditCard
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly isOpen = signal(false);

  // Icons
  readonly LayoutDashboard = LayoutDashboard;
  readonly Stethoscope = Stethoscope;
  readonly History = History;
  readonly Users = Users;
  readonly Package = Package;
  readonly Wrench = Wrench;
  readonly CreditCard = CreditCard;

  toggleSidebar() {
    this.isOpen.update(open => !open);
  }

  closeSidebar() {
    this.isOpen.set(false);
  }
}
