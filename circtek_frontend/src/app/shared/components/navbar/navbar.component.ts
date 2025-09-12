import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule, MatTooltipModule],
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

  // Mobile menu toggle
  sidebarToggle = output<void>();

  // Expose auth state to template
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly currentUser = this.authService.currentUser;

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
