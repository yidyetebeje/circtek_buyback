import { Injectable, ComponentRef, ViewContainerRef, inject, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Diagnostic } from '../../core/models/diagnostic';
import { ApiService } from '../../core/services/api.service';
import { LogosService } from '../../services/logos.service';
import { CipherService } from '../../core/services/cipher.service';
import qrcode from 'qrcode';
import { DiagnosticReportTemplateComponent } from '../components/diagnostic-report-template/diagnostic-report-template.component';

@Injectable({
  providedIn: 'root'
})
export class DiagnosticPdfService {
  private readonly apiService = inject(ApiService);
  private readonly logosService = inject(LogosService);
  private readonly cipherService = inject(CipherService);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  async generatePdf(diagnosticId: number): Promise<Blob> {
    console.log('Starting diagnostic PDF generation for ID:', diagnosticId);
    
    let container: HTMLElement | null = null;
    let componentRef: ComponentRef<DiagnosticReportTemplateComponent> | null = null;
    
    try {
      // Fetch the diagnostic data
      const response = await this.apiService.getPublicDiagnostic(diagnosticId).toPromise();
      if (!response?.data) {
        throw new Error('Failed to fetch diagnostic data');
      }
      
      const diagnostic = response.data;
      console.log('Diagnostic data fetched successfully');
      
      // Create the report using the shared component
      const result = await this.createReportContainer(diagnostic);
      container = result.container;
      componentRef = result.componentRef;
      
      // Add to DOM for rendering
      document.body.appendChild(container);
      console.log('Report container added to DOM');
      
      // Wait for images and content to load
      await this.waitForImagesAndContent(container);
      
      // Convert all images to base64 to ensure they're captured
      await this.convertAllImagesToBase64(container);
      
      // Extra wait for rendering since container is now visible
      console.log('Waiting for visible rendering...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Starting canvas capture...');
      
      // Capture the component element directly (like report page does)
      const componentElement = componentRef.location.nativeElement;
      if (!componentElement) {
        throw new Error('Component element not found');
      }
      
      console.log('Component element dimensions:', componentElement.offsetWidth, 'x', componentElement.offsetHeight);
      
      // Use same simple options as the working report component
      const canvas = await html2canvas(componentElement, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
      });
      
      console.log('Canvas captured successfully:', canvas.width, 'x', canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas capture failed - zero dimensions');
      }
      
      // Generate PDF using same logic as report component
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

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', leftMargin + offsetX, offsetY, adjustedImgWidth, adjustedImgHeight);
      
      const blob = pdf.output('blob');
      
      console.log('PDF generated successfully, size:', blob.size);
      return blob;
      
    } catch (error) {
      console.error('Error generating diagnostic PDF:', error);
      throw error;
    } finally {
      // Cleanup
      if (componentRef) {
        componentRef.destroy();
      }
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
        console.log('Report container cleaned up');
      }
    }
  }
  
  private async createReportContainer(diagnostic: Diagnostic): Promise<{ container: HTMLElement; componentRef: ComponentRef<DiagnosticReportTemplateComponent> }> {
    console.log('Creating report container with diagnostic data');
    
    // Generate QR code
    const qrCodeDataUrl = await this.generateQrCode(diagnostic.id, diagnostic.serial_number || undefined);
    console.log('QR code generated:', qrCodeDataUrl ? 'Success' : 'Failed');
    
    // Convert logo to base64 data URL for PDF embedding
    const logoUrl = this.logosService.getClientLogoUrl() || 'https://api.circtek.com/logo.png';
    console.log('Original logo URL:', logoUrl);
    
    const logoDataUrl = await this.getImageAsDataUrl(logoUrl);
    console.log('Logo data URL conversion:', logoDataUrl.startsWith('data:') ? 'Success (base64)' : 'Failed (using original URL)');
    console.log('Logo data URL length:', logoDataUrl.length);
    
    const encodedReportId = this.cipherService.encodeTestId(diagnostic.id, diagnostic.serial_number || undefined);
    
    // Create the component dynamically
    const componentRef = createComponent(DiagnosticReportTemplateComponent, {
      environmentInjector: this.injector,
    });
    
    // Set inputs
    componentRef.setInput('report', diagnostic);
    componentRef.setInput('logoUrl', logoDataUrl);
    componentRef.setInput('qrCodeDataUrl', qrCodeDataUrl);
    componentRef.setInput('encodedReportId', encodedReportId);
    componentRef.setInput('showPrintButtons', false);
    
    // Attach to application
    this.appRef.attachView(componentRef.hostView);
    
    // Create container - MUST be visible for html2canvas to capture images properly
    const container = document.createElement('div');
    container.className = 'temp-report-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(255, 255, 255, 0.98);
      z-index: 9999;
      overflow: hidden;
      font-family: arial !important;
      pointer-events: none;
    `;
    
    // Add loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #294174;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      z-index: 10000;
    `;
    loadingDiv.textContent = 'Generating PDF...';
    container.appendChild(loadingDiv);
    
    // Create wrapper for PDF capture - match report page layout
    const pdfTableWrapper = document.createElement('div');
    pdfTableWrapper.className = 'pdf-table-wrapper';
    pdfTableWrapper.style.cssText = `
      font-family: arial !important;
      width: 100%;
      padding: 15px;
      box-sizing: border-box;
    `;
    pdfTableWrapper.appendChild(componentRef.location.nativeElement);
    
    container.appendChild(pdfTableWrapper);
    
    // Add the shared component styles
    this.addReportStyles(container);
    
    // Trigger change detection
    componentRef.changeDetectorRef.detectChanges();
    
    return { container, componentRef };
  }
  
  private addReportStyles(container: HTMLElement): void {
    // Styles are now in the shared component, no need to add them here
    // This method can be kept for any additional PDF-specific styles if needed
  }
  
  private async generateQrCode(diagnosticId: number, serialNumber?: string): Promise<string | null> {
    try {
      const encodedId = this.cipherService.encodeTestId(diagnosticId, serialNumber);
      const reportUrl = `${window.location.origin}/diagnostics/report/${encodedId}`;
      return await qrcode.toDataURL(reportUrl, { errorCorrectionLevel: 'H', width: 256 });
    } catch (err) {
      console.error('Error generating QR code:', err);
      return null;
    }
  }

  private async getImageAsDataUrl(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS
      
      img.onload = () => {
        try {
          // Create a canvas to convert image to data URL
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Failed to get canvas context');
            resolve(imageUrl); // Fallback to original URL
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          try {
            const dataUrl = canvas.toDataURL('image/png');
            console.log('Image converted to data URL successfully');
            resolve(dataUrl);
          } catch (error) {
            console.error('Error converting canvas to data URL (CORS issue?):', error);
            resolve(imageUrl); // Fallback to original URL
          }
        } catch (error) {
          console.error('Error processing image:', error);
          resolve(imageUrl); // Fallback to original URL
        }
      };
      
      img.onerror = (error) => {
        console.error('Error loading image:', error);
        resolve(imageUrl); // Fallback to original URL
      };
      
      // Set timeout for image loading
      setTimeout(() => {
        if (!img.complete) {
          console.warn('Image loading timeout, using original URL');
          resolve(imageUrl);
        }
      }, 5000);
      
      img.src = imageUrl;
    });
  }

  private async convertAllImagesToBase64(container: HTMLElement): Promise<void> {
    console.log('Converting all images to base64...');
    const images = container.querySelectorAll('img');
    
    const conversionPromises = Array.from(images).map(async (img, index) => {
      const src = img.src;
      
      // Skip if already base64
      if (src.startsWith('data:')) {
        console.log(`Image ${index} already base64`);
        return;
      }
      
      console.log(`Converting image ${index} from ${src.substring(0, 50)}...`);
      
      try {
        // Ensure img has proper attributes
        img.setAttribute('crossorigin', 'anonymous');
        
        const dataUrl = await this.getImageAsDataUrl(src);
        if (dataUrl.startsWith('data:')) {
          img.src = dataUrl;
          // Remove crossorigin attribute after conversion to avoid issues
          img.removeAttribute('crossorigin');
          console.log(`Image ${index} converted successfully`);
          
          // Wait for the new src to be processed
          await new Promise(resolve => {
            if (img.complete) {
              resolve(void 0);
            } else {
              img.onload = () => resolve(void 0);
              img.onerror = () => resolve(void 0);
              setTimeout(() => resolve(void 0), 1000);
            }
          });
        } else {
          console.warn(`Image ${index} conversion failed, keeping original URL`);
        }
      } catch (error) {
        console.error(`Error converting image ${index}:`, error);
      }
    });
    
    await Promise.all(conversionPromises);
    
    console.log('All images conversion complete');
  }
  
  private async waitForImagesAndContent(container: HTMLElement): Promise<void> {
    console.log('Waiting for images and content to load...');
    
    // Wait for images
    const images = container.querySelectorAll('img');
    console.log(`Found ${images.length} images to load`);
    
    const imagePromises = Array.from(images).map((img, index) => {
      if (img.complete) {
        console.log(`Image ${index} already loaded`);
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.onload = () => {
          console.log(`Image ${index} loaded successfully`);
          resolve(void 0);
        };
        img.onerror = () => {
          console.warn(`Image ${index} failed to load`);
          resolve(void 0); // Don't fail on image errors
        };
        // Timeout after 8 seconds
        setTimeout(() => {
          console.warn(`Image ${index} loading timeout`);
          resolve(void 0);
        }, 8000);
      });
    });
    
    await Promise.all(imagePromises);
    
    // Additional wait for fonts, layout, and rendering
    console.log('Waiting for layout and rendering...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Content loading complete');
  }

  generateFilename(diagnostic: Diagnostic): string {
    const lpn = diagnostic.lpn || diagnostic.device_lpn || `report${diagnostic.id}`;
    const createdAt = diagnostic.created_at || '';
    const datePart = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : '';
    return datePart ? `${lpn}_${datePart}.pdf` : `${lpn}.pdf`;
  }
}
