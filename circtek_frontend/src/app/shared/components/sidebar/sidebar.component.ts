import { ChangeDetectionStrategy, Component, signal, inject, computed, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { ROLE_NAME } from '../../../core/constants/role.constants';
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
export class SidebarComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly roleService = inject(RoleService);
  protected readonly isOpen = signal(false);

  // Track initialization state
  protected readonly isInitialized = signal(false);

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

  ngOnInit(): void {
    // Subscribe to auth initialization to ensure user data is loaded
    this.authService.initialized$.subscribe(() => {
      this.isInitialized.set(true);
    });
  }

  // Role-based menu visibility
  protected readonly canAccessManagement = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return this.roleService.hasAnyRole(roleId, [ROLE_NAME.ADMIN, ROLE_NAME.SUPER_ADMIN]);
  });

  protected readonly canAccessStock = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return this.roleService.hasAnyRole(roleId, [
      ROLE_NAME.STOCK_MANAGER,
      ROLE_NAME.REPAIR_MANAGER,
      ROLE_NAME.ADMIN,
      ROLE_NAME.SUPER_ADMIN
    ]);
  });

  protected readonly canAccessRepair = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return this.roleService.hasAnyRole(roleId, [
      ROLE_NAME.REPAIR_MANAGER,
      ROLE_NAME.REPAIR_TECHNICIAN,
      ROLE_NAME.ADMIN,
      ROLE_NAME.SUPER_ADMIN
    ]);
  });

  protected readonly canAccessLicensing = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return this.roleService.hasAnyRole(roleId, [ROLE_NAME.ADMIN, ROLE_NAME.SUPER_ADMIN]);
  });

  toggleSidebar() {
    this.isOpen.update(open => !open);
  }

  closeSidebar() {
    this.isOpen.set(false);
  }
}
