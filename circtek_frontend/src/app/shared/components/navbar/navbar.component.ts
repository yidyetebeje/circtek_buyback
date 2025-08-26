import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, output } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  // Theme toggle (dim/light)
  protected readonly theme = signal<'dim' | 'light'>('dim');
  protected readonly isDarkMode = computed(() => this.theme() === 'dim');
  private readonly document = inject(DOCUMENT);

  // Mobile menu toggle
  sidebarToggle = output<void>();

  private _themeEffect = effect(() => {
    const t = this.theme();
    this.document?.documentElement?.setAttribute('data-theme', t);
  });

  toggleTheme() {
    this.theme.update((t) => (t === 'dim' ? 'light' : 'dim'));
  }

  onSidebarToggle() {
    this.sidebarToggle.emit();
  }
}
