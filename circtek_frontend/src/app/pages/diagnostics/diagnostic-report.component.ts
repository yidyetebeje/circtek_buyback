import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Diagnostic } from '../../core/models/diagnostic';
import { LogosService } from '../../services/logos.service';
import { DiagnosticPdfService } from '../../shared/services/diagnostic-pdf.service';
import { CipherService } from '../../core/services/cipher.service';
import qrcode from 'qrcode';
import { LucideAngularModule, Download, Printer } from 'lucide-angular';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { DiagnosticReportTemplateComponent } from '../../shared/components/diagnostic-report-template/diagnostic-report-template.component';

@Component({
  selector: 'app-diagnostic-report',
  imports: [CommonModule, LucideAngularModule, DiagnosticReportTemplateComponent],
  templateUrl: './diagnostic-report.component.html',
  styleUrl: './diagnostic-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticReportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly logosService = inject(LogosService);
  private readonly diagnosticPdfService = inject(DiagnosticPdfService);
  private readonly cipherService = inject(CipherService);

  @ViewChild('pdfTable', { static: false }) pdfTable: ElementRef | undefined;

  loading = signal<boolean>(true);
  report = signal<Diagnostic | null>(null);
  logoUrl = computed(() => this.logosService.getClientLogoUrl());
  qrCodeDataUrl = signal<string | null>(null);
  
  // Computed property for encoded report ID to display in PDF
  encodedReportId = computed(() => {
    const report = this.report();
    if (!report) return '';
    return this.cipherService.encodeTestId(report.id, report.serial_number || undefined);
  });
  // Lucide icons
  protected readonly Download = Download;
  protected readonly Printer = Printer;

  encodedId = computed<string>(() => this.route.snapshot.paramMap.get('id') || '');
  id = computed<number | null>(() => {
    const encoded = this.encodedId();
    if (!encoded) return null;
    return this.cipherService.decodeTestId(encoded);
  });

  constructor() {
    const id = this.id();
    if (id && id > 0) {
      this.api.getPublicDiagnostic(id).subscribe(res => {
        this.report.set(res.data ?? null);
        this.loading.set(false);
        if (res.data) {
          // Generate QR code with encoded ID for security
          const encodedId = this.cipherService.encodeTestId(res.data.id, res.data.serial_number);
          this.generateQrCode(encodedId);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  async generateQrCode(encodedReportId: string) {
    try {
      const reportUrl = `${window.location.origin}/diagnostics/report/${encodedReportId}`;
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
    const element = this.pdfTable?.nativeElement;
    if (!element) return;
    
    try {
      // Convert all images to base64 first
      const images = element.querySelectorAll('img');
      console.log(`Found ${images.length} images to convert`);
      
      const conversionPromises = Array.from(images as NodeListOf<HTMLImageElement>).map(async (img, index) => {
        const src = img.src;
        
        // Skip if already base64
        if (src.startsWith('data:')) {
          console.log(`Image ${index} already base64`);
          return;
        }
        
        console.log(`Converting image ${index}...`);
        
        try {
          const dataUrl = await this.convertImageToDataUrl(src);
          if (dataUrl.startsWith('data:')) {
            img.src = dataUrl;
            console.log(`Image ${index} converted successfully`);
            
            // Wait for image to be processed
            await new Promise<void>(resolve => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(() => resolve(), 1000);
              }
            });
          }
        } catch (error) {
          console.error(`Error converting image ${index}:`, error);
        }
      });
      
      await Promise.all(conversionPromises);
      console.log('All images converted, starting capture...');
      
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now capture with html2canvas
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: true,
      });
      
      const pdf = new jsPDF('portrait', 'mm', 'a4', true);
      const ratio = canvas.width / canvas.height;

      const pdfWidth = 210;
      const leftMargin = 0;
      const imgWidth = pdfWidth - leftMargin;
      const imgHeight = imgWidth / ratio;
      const zoomFactor = 1;
      const adjustedImgWidth = imgWidth * zoomFactor;
      const adjustedImgHeight = imgHeight * zoomFactor;
      const offsetX = (imgWidth - adjustedImgWidth) / 2;
      const topMargin = 20;
      const offsetY = (imgHeight - adjustedImgHeight) / 2 + topMargin;

      // Add the image to the PDF with the new dimensions, margins, and zoom factor
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', leftMargin + offsetX, offsetY, adjustedImgWidth, adjustedImgHeight);

      // Generate filename with encoded report ID and date
      const report = this.report();
      const lpn = report?.lpn || report?.device_lpn || `report${this.encodedReportId()}`;
      const createdAt = report?.created_at || '';
      const datePart = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : '';
      const fileName = datePart ? `${lpn}_${datePart}` : lpn;
      pdf.save(`${fileName}.pdf`);
      
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }
  
  private convertImageToDataUrl(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imageUrl);
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          try {
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } catch (error) {
            console.error('Canvas to dataURL failed:', error);
            resolve(imageUrl);
          }
        } catch (error) {
          console.error('Image processing error:', error);
          resolve(imageUrl);
        }
      };
      
      img.onerror = () => {
        console.error('Image loading failed:', imageUrl);
        resolve(imageUrl);
      };
      
      setTimeout(() => {
        if (!img.complete) {
          console.warn('Image loading timeout:', imageUrl);
          resolve(imageUrl);
        }
      }, 5000);
      
      img.src = imageUrl;
    });
  }
}


