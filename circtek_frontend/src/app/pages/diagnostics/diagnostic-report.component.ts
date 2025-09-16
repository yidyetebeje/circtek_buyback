import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Diagnostic } from '../../core/models/diagnostic';
import { LogosService } from '../../services/logos.service';
import qrcode from 'qrcode';
import { LucideAngularModule, Download, Printer } from 'lucide-angular';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-diagnostic-report',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './diagnostic-report.component.html',
  styleUrl: './diagnostic-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticReportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly logosService = inject(LogosService);

  loading = signal<boolean>(true);
  report = signal<Diagnostic | null>(null);
  logoUrl = computed(() => this.logosService.getClientLogoUrl());
  qrCodeDataUrl = signal<string | null>(null);
  // Expose Math for template usage (ceil/slicing)
  protected readonly Math = Math;
  // Lucide icons
  protected readonly Download = Download;
  protected readonly Printer = Printer;

  id = computed<number>(() => Number(this.route.snapshot.paramMap.get('id')));

  constructor() {
    const id = this.id();
    if (Number.isFinite(id)) {
      this.api.getPublicDiagnostic(id).subscribe(res => {
        this.report.set(res.data ?? null);
        this.loading.set(false);
        if (res.data) {
          this.generateQrCode(res.data.id);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  async generateQrCode(reportId: number) {
    try {
      const reportUrl = `${window.location.origin}/diagnostics/report/${reportId}`;
      const dataUrl = await qrcode.toDataURL(reportUrl, { errorCorrectionLevel: 'H', width: 256 });
      this.qrCodeDataUrl.set(dataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      this.qrCodeDataUrl.set(null);
    }
  }

  print() {
    window.print();
  }

  async downloadPdf() {
    try {
      console.log('Starting optimized PDF generation...');
      const reportElement = document.querySelector('.report-document') as HTMLElement;
      const containerElement = document.querySelector('.report-page-container') as HTMLElement;
      if (!reportElement || !containerElement) {
        console.error('Report elements not found');
        return;
      }

      // Add PDF optimization class temporarily
      containerElement.classList.add('pdf-optimized');
      console.log('Added PDF optimization styles');
      
      // Wait for styles to be applied
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the HTML element as canvas using html2canvas-pro with optimized settings
      const canvas = await html2canvas(reportElement, {
        scale: 1.5, // Reduced scale for better performance while maintaining quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800, // Fixed width for consistency
        height: reportElement.scrollHeight,
        removeContainer: true, // Remove the temporary container after rendering
        logging: false, // Disable logging for better performance
        imageTimeout: 5000, // 5 second timeout for images
        foreignObjectRendering: false, // Better compatibility
        onclone: (clonedDoc) => {
          // Apply PDF optimization styles to cloned document
          const clonedContainer = clonedDoc.querySelector('.report-page-container') as HTMLElement;
          const clonedElement = clonedDoc.querySelector('.report-document') as HTMLElement;
          if (clonedContainer && clonedElement) {
            clonedContainer.classList.add('pdf-optimized');
            // Ensure images are loaded and styled properly
            const images = clonedElement.querySelectorAll('img');
            images.forEach(img => {
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
            });
            // Remove any problematic elements
            const noPrintElements = clonedElement.querySelectorAll('.no-print');
            noPrintElements.forEach(el => el.remove());
          }
        }
      });

      console.log('Canvas captured successfully:', canvas.width, 'x', canvas.height);

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add the image to PDF with optimized compression
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality for smaller file size
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with report ID and current date
      const report = this.report();
      const fileName = `diagnostic_report_${report?.id || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      pdf.save(fileName);
      console.log('PDF saved successfully:', fileName);

      // Remove PDF optimization class
      containerElement.classList.remove('pdf-optimized');
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Remove PDF optimization class in case of error
      const containerElement = document.querySelector('.report-page-container') as HTMLElement;
      if (containerElement) {
        containerElement.classList.remove('pdf-optimized');
      }
      // Fallback to print dialog if PDF generation fails
      window.print();
    }
  }

  protected parseList(v: string | null): string[] {
    if (!v) return [];
    const s = String(v).trim();
    if (!s) return [];
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map(x => String(x)).filter(Boolean);
    } catch {}
    return s.split(/[;,]/g).map(x => x.trim()).filter(Boolean);
  }
}


