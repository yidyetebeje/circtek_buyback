import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';

interface LogoCache {
  url: string;
  base64: string;
  tenantId: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class LogosService {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly CACHE_KEY = 'circtek_logo_cache';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  logoUrl = signal<string | null>(null);
  logoBase64 = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && user.tenant_id) {
        this.loadLogo(user.tenant_id);
      }
    });
  }

  private async loadLogo(tenantId: number): Promise<void> {
    // Try to load from cache first
    const cached = this.getFromCache(tenantId);
    if (cached) {
      console.log('Logo loaded from cache');
      this.logoUrl.set(cached.url);
      this.logoBase64.set(cached.base64);
      return;
    }

    // Fetch from API if not cached
    this.apiService.getTenant(tenantId).subscribe(async response => {
      if (response.data && response.data.logo) {
        const logoUrl = response.data.logo;
        this.logoUrl.set(logoUrl);
        
        // Convert to base64 and cache
        try {
          const base64 = await this.convertToBase64(logoUrl);
          this.logoBase64.set(base64);
          this.saveToCache(logoUrl, base64, tenantId);
          console.log('Logo fetched and cached');
        } catch (error) {
          console.error('Error converting logo to base64:', error);
          // Still set the URL even if conversion fails
        }
      }
    });
  }

  private getFromCache(tenantId: number): LogoCache | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const data: LogoCache = JSON.parse(cached);
      
      // Check if cache is valid
      const now = Date.now();
      if (data.tenantId === tenantId && (now - data.timestamp) < this.CACHE_DURATION) {
        return data;
      }
      
      // Cache expired or different tenant
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error reading logo cache:', error);
      return null;
    }
  }

  private saveToCache(url: string, base64: string, tenantId: number): void {
    try {
      const cache: LogoCache = {
        url,
        base64,
        tenantId,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving logo to cache:', error);
    }
  }

  private async convertToBase64(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject('Failed to get canvas context');
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject('Image load failed');
      
      // Try without CORS first
      img.src = imageUrl;
      
      // Fallback: if it fails, try with timestamp to bust cache
      setTimeout(() => {
        if (!img.complete) {
          img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
        }
      }, 1000);
    });
  }

  getClientLogoUrl(): string | null {
    return this.logoUrl();
  }

  getClientLogoBase64(): string | null {
    return this.logoBase64();
  }

  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    this.logoUrl.set(null);
    this.logoBase64.set(null);
  }
}
