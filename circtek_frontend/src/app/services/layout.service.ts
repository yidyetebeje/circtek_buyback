import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private fullScreen = false;

  setFullScreenMode(enabled: boolean): void {
    this.fullScreen = enabled;
    // Hook for future layout adjustments if needed
  }

  isFullScreen(): boolean {
    return this.fullScreen;
  }
}


