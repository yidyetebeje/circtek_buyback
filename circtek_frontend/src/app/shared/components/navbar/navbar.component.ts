import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencySelectorComponent } from '../currency-selector/currency-selector.component';
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
  selector: 'app-navbar',
  imports: [RouterModule, MatTooltipModule, LucideAngularModule, CurrencySelectorComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class NavbarComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  protected readonly isDarkMode = computed(() => this.themeService.theme() === 'dim');
  protected readonly themeTooltip = computed(() =>
    this.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'
  );

  // Icons
  readonly LayoutDashboard = LayoutDashboard;
  readonly Stethoscope = Stethoscope;
  readonly History = History;
  readonly Users = Users;
  readonly Package = Package;
  readonly Wrench = Wrench;
  readonly CreditCard = CreditCard;

  // Mobile menu toggle
  sidebarToggle = output<void>();

  // Expose auth state to template
  protected readonly isAuthenticated = this.authService.isAuthenticated;
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

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onSidebarToggle(): void {
    this.sidebarToggle.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}
