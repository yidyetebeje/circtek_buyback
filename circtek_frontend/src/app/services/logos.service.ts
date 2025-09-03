import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LogosService {
  private clientLogoUrl: string | null = null;

  async loadClientLogo(clientId: number, force = false): Promise<void> {
    if (this.clientLogoUrl && !force) return;
    // Placeholder: In real app, fetch from API using clientId
    this.clientLogoUrl = null; // keep null unless available
  }

  getClientLogoUrl(): string | null {
    return this.clientLogoUrl;
  }
}


