import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <app-sidebar #sidebar></app-sidebar>
    <app-navbar (sidebarToggle)="onSidebarToggle()"></app-navbar>
    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'circtek_frontend';

  private readonly themeService = inject(ThemeService);
  private sidebar = viewChild.required<SidebarComponent>('sidebar');

  onSidebarToggle() {
    this.sidebar().toggleSidebar();
  }
}
