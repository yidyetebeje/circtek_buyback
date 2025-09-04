import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    @if (isChromelessRoute()) {
      <router-outlet />
    } @else {
      <app-sidebar #sidebar></app-sidebar>
      <app-navbar (sidebarToggle)="onSidebarToggle()"></app-navbar>
      <main class="main-content">
        <router-outlet />
      </main>
    }
  `,
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'circtek_frontend';

  private readonly themeService = inject(ThemeService);
  private sidebar = viewChild.required<SidebarComponent>('sidebar');
  private readonly router = inject(Router);

  // Hide chrome on auth routes
  isChromelessRoute = signal(false);

  constructor() {
    // Initial state
    this.isChromelessRoute.set(this.checkChromelessRoute(this.router.url));

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isChromelessRoute.set(this.checkChromelessRoute(event.urlAfterRedirects));
      }
    });
  }

  private checkChromelessRoute(url: string): boolean {
    return url.startsWith('/login') || url.startsWith('/forgot-password') || url.startsWith('/diagnostics/report');
  }

  onSidebarToggle() {
    this.sidebar().toggleSidebar();
  }
}
