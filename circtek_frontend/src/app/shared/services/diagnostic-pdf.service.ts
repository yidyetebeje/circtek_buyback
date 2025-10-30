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
   
    
    let container: HTMLElement | null = null;
    let componentRef: ComponentRef<DiagnosticReportTemplateComponent> | null = null;
    
    try {
      // Fetch the diagnostic data
      const response = await this.apiService.getPublicDiagnostic(diagnosticId).toPromise();
      if (!response?.data) {
        throw new Error('Failed to fetch diagnostic data');
      }
      
      const diagnostic = response.data;
     
      
      // Create the report using the shared component
      const result = await this.createReportContainer(diagnostic);
      container = result.container;
      componentRef = result.componentRef;
      
      // Add to DOM for rendering
      document.body.appendChild(container);
     
      
      // Wait for images and content to load (reduced timeout)
      await this.waitForImagesAndContent(container);
      
      // Skip base64 conversion to avoid CORS issues
      // html2canvas with allowTaint:true can handle external images directly
     
      
      // Minimal wait for rendering - just enough for browser paint
     
      await new Promise(resolve => setTimeout(resolve, 300));
      
     
      
      // Capture the component element directly (like report page does)
      const componentElement = componentRef.location.nativeElement;
      if (!componentElement) {
        throw new Error('Component element not found');
      }
      
     
      
      // Use same simple options as the working report component
      const canvas = await html2canvas(componentElement, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
      });
      
     
      
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
       
      }
    }
  }
  
  private async createReportContainer(diagnostic: Diagnostic): Promise<{ container: HTMLElement; componentRef: ComponentRef<DiagnosticReportTemplateComponent> }> {
   
    
    // Generate QR code
    const qrCodeDataUrl = await this.generateQrCode(diagnostic.id, diagnostic.serial_number || undefined);
   
    
    // Use cached base64 logo if available, otherwise use URL
    const cachedBase64 = this.logosService.getClientLogoBase64();
    const logoUrl = cachedBase64 || this.logosService.getClientLogoUrl() || 'https://api.circtek.com/logo.png';
    
    if (cachedBase64) {
     
    } else {
     
    }
    
    const encodedReportId = this.cipherService.encodeTestId(diagnostic.id, diagnostic.serial_number || undefined);
    
    // Create the component dynamically
    const componentRef = createComponent(DiagnosticReportTemplateComponent, {
      environmentInjector: this.injector,
    });
    
    // Set inputs
    componentRef.setInput('report', diagnostic);
    componentRef.setInput('logoUrl', logoUrl);
    componentRef.setInput('qrCodeDataUrl', qrCodeDataUrl);
    componentRef.setInput('encodedReportId', encodedReportId);
    componentRef.setInput('showPrintButtons', false);
    
    // Attach to application
    this.appRef.attachView(componentRef.hostView);
    
    // Create container - MUST be visible for html2canvas to capture images properly
    // Use minimal visibility to avoid user distraction
    const container = document.createElement('div');
    container.className = 'temp-report-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(255, 255, 255, 0.5);
      z-index: 9999;
      overflow: hidden;
      font-family: arial !important;
      pointer-events: none;
      opacity: 0.3;
    `;
    
    // Add minimal loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #294174;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
    `;
    loadingDiv.textContent = 'Generating...';
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
      }, 2000);
      
      img.src = imageUrl;
    });
  }

  private async convertAllImagesToBase64(container: HTMLElement): Promise<void> {
   
    const images = container.querySelectorAll('img');
    
    const conversionPromises = Array.from(images).map(async (img, index) => {
      const src = img.src;
      
      // Skip if already base64
      if (src.startsWith('data:')) {
       
        return;
      }
      
     
      
      try {
        // Ensure img has proper attributes
        img.setAttribute('crossorigin', 'anonymous');
        
        const dataUrl = await this.getImageAsDataUrl(src);
        if (dataUrl.startsWith('data:')) {
          img.src = dataUrl;
          // Remove crossorigin attribute after conversion to avoid issues
          img.removeAttribute('crossorigin');
         
          
          // Wait for the new src to be processed
          await new Promise(resolve => {
            if (img.complete) {
              resolve(void 0);
            } else {
              img.onload = () => resolve(void 0);
              img.onerror = () => resolve(void 0);
              setTimeout(() => resolve(void 0), 300);
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
    
   
  }
  
  private async waitForImagesAndContent(container: HTMLElement): Promise<void> {
   
    
    // Wait for images
    const images = container.querySelectorAll('img');
   
    
    const imagePromises = Array.from(images).map((img, index) => {
      if (img.complete) {
       
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.onload = () => {
         
          resolve(void 0);
        };
        img.onerror = () => {
          console.warn(`Image ${index} failed to load`);
          resolve(void 0); // Don't fail on image errors
        };
        // Timeout after 3 seconds (faster than before)
        setTimeout(() => {
          console.warn(`Image ${index} loading timeout`);
          resolve(void 0);
        }, 3000);
      });
    });
    
    await Promise.all(imagePromises);
    
    // Minimal wait for fonts, layout, and rendering
   
    await new Promise(resolve => setTimeout(resolve, 300));
    
   
  }

  generateFilename(diagnostic: Diagnostic): string {
    const lpn = diagnostic.lpn || diagnostic.device_lpn || `report${diagnostic.id}`;
    const createdAt = diagnostic.created_at || '';
    const datePart = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : '';
    return datePart ? `${lpn}_${datePart}.pdf` : `${lpn}.pdf`;
  }
}
