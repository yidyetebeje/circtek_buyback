import { DOCUMENT } from '@angular/common';
import { Injectable, signal, effect, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly key = 'circtek-theme';

  readonly theme = signal<string>(this.getInitialTheme());

  private themeEffect = effect(() => {
    const theme = this.theme();
    this.document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(this.key, theme);
    } catch (e) {
      console.error('Failed to set theme in localStorage', e);
    }
  });

  toggleTheme(): void {
    this.theme.update((currentTheme) =>
      currentTheme === 'dim' ? 'light' : 'dim'
    );
  }

  private getInitialTheme(): string {
    try {
      const storedTheme = localStorage.getItem(this.key);
      return storedTheme ? storedTheme : 'dim';
    } catch (e) {
      console.error('Failed to get theme from localStorage', e);
      return 'dim';
    }
  }
}
