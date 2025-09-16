import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Diagnostic } from '../../core/models/diagnostic';
import { ApiService } from '../../core/services/api.service';
import { DiagnosticDataService } from '../../core/services/diagnostic-data.service';
import { PdfGeneratorService } from '../../core/services/pdf-generator.service';

@Component({
  selector: 'app-report-cell',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex items-center gap-1">
      <!-- View Report Link -->
      <a
        class="btn btn-ghost btn-xs"
        [routerLink]="['/diagnostics/report', row.id]"
        [attr.aria-label]="'Open detailed report for #' + row.id"
        title="View detailed report"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
          <path d="M19 2H10a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3h3a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-6 16H5v-9h3v6a2 2 0 0 0 2 2h3Zm5-5h-8V4h8Zm-6-6h4v2h-4Z"/>
        </svg>
      </a>
      
      <!-- Direct PDF Download Button -->
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        [disabled]="isDownloading()"
        (click)="downloadPdf()"
        [attr.aria-label]="'Download PDF report for #' + row.id"
        title="Download PDF report"
      >
        @if (isDownloading()) {
          <span class="loading loading-spinner loading-xs"></span>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
            <path d="M12 2C13.1 2 14 2.9 14 4V12L16.5 9.5L17.91 10.91L12 16.83L6.09 10.91L7.5 9.5L10 12V4C10 2.9 10.9 2 12 2ZM5 18V20H19V18H21V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V18H5Z"/>
          </svg>
        }
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportCellComponent {
  @Input() row!: Diagnostic;
  
  private readonly apiService = inject(ApiService);
  private readonly diagnosticDataService = inject(DiagnosticDataService);
  private readonly pdfGeneratorService = inject(PdfGeneratorService);
  
  isDownloading = signal<boolean>(false);
  
  // Initialize cache cleanup interval
  private static cacheCleanupInterval: number | null = null;
  
  constructor() {
    // Start cache cleanup if not already started
    if (!ReportCellComponent.cacheCleanupInterval) {
      ReportCellComponent.cacheCleanupInterval = window.setInterval(() => {
        ReportCellComponent.cleanupCache();
      }, 60000); // Clean up every minute
    }
  }
  
  // Simple in-memory cache for PDF URLs
  private static pdfCache = new Map<number, { url: string; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async downloadPdf() {
    if (this.isDownloading()) return;
    
    try {
      this.isDownloading.set(true);
      
      // Check cache first
      const cached = ReportCellComponent.pdfCache.get(this.row.id);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
        // Use cached URL
        this.downloadFromUrl(cached.url, this.row);
        return;
      }
      
      // Try to get diagnostic from cached service data first (no API call)
      let diagnostic = this.diagnosticDataService.getDiagnosticById(this.row.id);
      
      if (diagnostic) {
        // Generate PDF from cached data - much faster!
        const blob = await this.pdfGeneratorService.generateDiagnosticPdf(diagnostic);
        const url = window.URL.createObjectURL(blob);
        
        // Cache the URL
        ReportCellComponent.pdfCache.set(this.row.id, { url, timestamp: now });
        
        // Download the file
        this.downloadFromUrl(url, diagnostic);
      } else {
        // Fallback: Use API service if data not in cache
        console.warn('Diagnostic data not found in cache, falling back to API call');
        const blob = await firstValueFrom(this.apiService.downloadDiagnosticPdf(this.row.id));
        const url = window.URL.createObjectURL(blob);
        
        // Cache the URL
        ReportCellComponent.pdfCache.set(this.row.id, { url, timestamp: now });
        
        // Download the file
        this.downloadFromUrl(url, this.row);
      }
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // Fallback to opening report page if direct download fails
      window.open(`/diagnostics/report/${this.row.id}`, '_blank');
    } finally {
      this.isDownloading.set(false);
    }
  }
  
  private downloadFromUrl(url: string, diagnostic: Diagnostic) {
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename using the PDF generator service for consistency
    link.download = this.pdfGeneratorService.generateFilename(diagnostic);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL after a delay to ensure download started
    setTimeout(() => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
        ReportCellComponent.pdfCache.delete(this.row.id);
      }
    }, 1000);
  }
  
  // Clean up expired cache entries periodically
  static cleanupCache() {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000;
    
    for (const [id, entry] of ReportCellComponent.pdfCache.entries()) {
      if (now - entry.timestamp > CACHE_DURATION) {
        window.URL.revokeObjectURL(entry.url);
        ReportCellComponent.pdfCache.delete(id);
      }
    }
  }
  
  // Stop cache cleanup interval (useful for testing or cleanup)
  static stopCacheCleanup() {
    if (ReportCellComponent.cacheCleanupInterval) {
      clearInterval(ReportCellComponent.cacheCleanupInterval);
      ReportCellComponent.cacheCleanupInterval = null;
    }
  }
}
