import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ROLE_ID } from '../../../core/constants/role.constants';
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
  protected readonly authService = inject(AuthService);
  protected readonly isOpen = signal(false);

  // Icons
  readonly LayoutDashboard = LayoutDashboard;
  readonly Stethoscope = Stethoscope;
  readonly History = History;
  readonly Users = Users;
  readonly Package = Package;
  readonly Wrench = Wrench;
  readonly CreditCard = CreditCard;

  // Expose auth state to template
  protected readonly currentUser = this.authService.currentUser;

  // Role-based menu visibility
  protected readonly canAccessManagement = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.SUPER_ADMIN;
  });

  protected readonly canAccessStock = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return roleId === ROLE_ID.STOCK_MANAGER || roleId === ROLE_ID.REPAIR_MANAGER || roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.SUPER_ADMIN;
  });

  protected readonly canAccessRepair = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return roleId === ROLE_ID.REPAIR_MANAGER || roleId === ROLE_ID.REPAIR_TECHNICIAN || roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.SUPER_ADMIN;
  });

  protected readonly canAccessLicensing = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.SUPER_ADMIN;
  });

  toggleSidebar() {
    this.isOpen.update(open => !open);
  }

  closeSidebar() {
    this.isOpen.set(false);
  }
}
