import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LogosService {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  logoUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && user.tenant_id) {
        this.apiService.getTenant(user.tenant_id).subscribe(response => {
          if (response.data && response.data.logo) {
            this.logoUrl.set(response.data.logo);
          }
        });
      }
    });
  }
  getClientLogoUrl(): string | null {
    return this.logoUrl();
  }
  
}
