import { Injectable, ComponentRef, ViewContainerRef, inject, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Diagnostic } from '../../core/models/diagnostic';
import { ApiService } from '../../core/services/api.service';
import { LogosService } from '../../services/logos.service';
import { CipherService } from '../../core/services/cipher.service';
import qrcode from 'qrcode';

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
    
    try {
      // Fetch the diagnostic data
      const response = await this.apiService.getPublicDiagnostic(diagnosticId).toPromise();
      if (!response?.data) {
        throw new Error('Failed to fetch diagnostic data');
      }
      
      const diagnostic = response.data;
      console.log('Diagnostic data fetched successfully');
      
      // Create the report HTML container
      container = await this.createReportContainer(diagnostic);
      
      // Add to DOM for rendering
      document.body.appendChild(container);
      console.log('Report container added to DOM');
      
      // Wait for images and content to load
      await this.waitForImagesAndContent(container);
      
      // Add PDF optimization styles
      container.classList.add('pdf-optimized');
      
      // Find the report document
      const reportDocument = container.querySelector('.report-document') as HTMLElement;
      if (!reportDocument) {
        throw new Error('Report document element not found');
      }
      
      console.log('Starting canvas capture...');
      
      // Capture with html2canvas
      const canvas = await html2canvas(reportDocument, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: reportDocument.scrollHeight,
        removeContainer: true,
        logging: false,
        imageTimeout: 10000,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          // Apply optimization styles to cloned document
          const clonedContainer = clonedDoc.querySelector('.temp-report-container') as HTMLElement;
          if (clonedContainer) {
            clonedContainer.classList.add('pdf-optimized');
            
            // Remove no-print elements
            const noPrintElements = clonedContainer.querySelectorAll('.no-print');
            noPrintElements.forEach(el => el.remove());
            
            // Optimize images
            const images = clonedContainer.querySelectorAll('img');
            images.forEach(img => {
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
            });
          }
        }
      });
      
      console.log('Canvas captured successfully:', canvas.width, 'x', canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas capture failed - zero dimensions');
      }
      
      // Generate PDF
      const pdf = this.createPdf(canvas, true); // true for single page
      const blob = pdf.output('blob');
      
      console.log('PDF generated successfully, size:', blob.size);
      return blob;
      
    } catch (error) {
      console.error('Error generating diagnostic PDF:', error);
      throw error;
    } finally {
      // Cleanup
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
        console.log('Report container cleaned up');
      }
    }
  }
  
  private async createReportContainer(diagnostic: Diagnostic): Promise<HTMLElement> {
    console.log('Creating report container with diagnostic data');
    
    // Create main container
    const container = document.createElement('div');
    container.className = 'temp-report-container report-page-container';
    container.style.cssText = `
      position: absolute;
      top: -10000px;
      left: 0;
      visibility: visible;
      opacity: 1;
      background-color: #f0f2f5;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      z-index: -1;
    `;
    
    // Create report document
    const reportDoc = document.createElement('div');
    reportDoc.className = 'report-document';
    reportDoc.style.cssText = `
      background-color: #ffffff;
      width: 250mm;
      min-height: 297mm;
      padding: 30mm;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      line-height: 1.6;
      display: flex;
      flex-direction: column;
    `;
    
    // Generate QR code
    const qrCodeDataUrl = await this.generateQrCode(diagnostic.id);
    
    // Build the report HTML content
    reportDoc.innerHTML = await this.buildReportContent(diagnostic, qrCodeDataUrl);
    
    // Add styles
    this.addReportStyles(container);
    
    container.appendChild(reportDoc);
    
    return container;
  }
  
  private async buildReportContent(diagnostic: Diagnostic, qrCodeDataUrl: string | null): Promise<string> {
    const logoUrl = this.logosService.getClientLogoUrl() || 'https://api.circtek.com/logo.png';
    
    // Parse component lists
    const passedComponents = this.parseComponentList(diagnostic.passed_components);
    const failedComponents = this.parseComponentList(diagnostic.failed_components);
    const pendingComponents = this.parseComponentList(diagnostic.pending_components);
    
    // Format date
    const formattedDate = diagnostic.created_at ? 
      new Date(diagnostic.created_at).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : 'N/A';
    
    return `
      <!-- Header -->
      <div class="report-header">
        <div class="logo-section">
          <img src="${logoUrl}" alt="Company Logo" class="company-logo">
          <div class="report-title-block">
            <h1 class="report-title">Diagnostic Report</h1>
            <div class="report-id">Report ID: <span class="report-id-value">${diagnostic.id}</span></div>
          </div>
        </div>
        <div class="report-meta-section">
          <div class="flex justify-end gap-2 no-print mb-4" style="display: none;">
            <!-- Print buttons hidden in PDF -->
          </div>
          <div class="tested-on-label">Tested on:</div>
          <div class="tested-on-value">${formattedDate}</div>
          <div class="qr-code-placeholder">
            ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;">` : '<span style="font-size: 12px; color: #999;">QR Code</span>'}
          </div>
        </div>
      </div>

      <!-- Device Info -->
      <div class="report-section">
        <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
          <div class="card" style="background-color: rgba(229, 231, 235, 0.6);">
            <div class="card-body" style="padding: 12px;">
              <h2 class="card-title" style="font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <span>${diagnostic.model_name || '-'}</span>
                <span style="font-size: 14px; color: rgba(107, 114, 128, 1);">${(diagnostic.device_storage ? (' ' + diagnostic.device_storage) : '') + (diagnostic.device_color ? (' ' + diagnostic.device_color) : '') || '-'}</span>
              </h2>
            </div>
          </div>
          <div class="card" style="background-color: rgba(229, 231, 235, 0.6);">
            <div class="card-body" style="padding: 20px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 8px; font-size: 14px;">
                <div><span style="font-weight: 600;">IMEI:</span> ${diagnostic.imei || diagnostic.device_imei || '-'}</div>
                <div><span style="font-weight: 600;">Serial:</span> ${diagnostic.serial_number || diagnostic.device_serial || '-'}</div>
                <div><span style="font-weight: 600;">LPN:</span> ${diagnostic.lpn || diagnostic.device_lpn || '-'}</div>
                <div><span style="font-weight: 600;">Battery:</span> ${(diagnostic.battery_info?.health || '-')}</div>
                <div><span style="font-weight: 600;">Carrier:</span> ${(diagnostic.carrier_lock?.carrier || '-')}</div>
                <div><span style="font-weight: 600;">OS:</span> ${diagnostic.os_version || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status bar row -->
      <div class="report-section">
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); text-align: center; font-size: 14px; font-weight: 600;">
          <div style="background-color: rgba(229, 231, 235, 0.6); padding: 8px 0; border-radius: 8px 0 0 0;">FMI</div>
          <div style="background-color: rgba(229, 231, 235, 0.6); padding: 8px 0;">Jailbreak</div>
          <div style="background-color: rgba(229, 231, 235, 0.6); padding: 8px 0;">Grade</div>
          <div style="background-color: rgba(229, 231, 235, 0.6); padding: 8px 0;">ESN</div>
          <div style="background-color: rgba(229, 231, 235, 0.6); padding: 8px 0;">MDM</div>
          <div style="background-color: rgba(229, 231, 235, 0.6); padding: 8px 0; border-radius: 0 8px 0 0;">Wipe</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); text-align: center; border: 1px solid rgba(229, 231, 235, 1); border-top: 0; border-radius: 0 0 8px 8px; font-size: 14px;">
          <div style="padding: 8px 0; font-weight: 500;">${diagnostic.iCloud || '-'}</div>
          <div style="padding: 8px 0; font-weight: 500;">No</div>
          <div style="padding: 8px 0; font-weight: 500;">-</div>
          <div style="padding: 8px 0; font-weight: 500;">${diagnostic.ESN || '-'}</div>
          <div style="padding: 8px 0; font-weight: 500;">${diagnostic.device_lock || '-'}</div>
          <div style="padding: 8px 0; font-weight: 500;">${diagnostic.eSIM_erasure || '-'}</div>
        </div>
      </div>

      <!-- Tests Matrix -->
      <div class="report-section">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">Functional Tests</h3>
        <div class="functional-tests-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 8px; font-size: 14px;">
          ${passedComponents.map(name => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-radius: 6px; background-color: rgba(229, 231, 235, 0.5);">
              <span style="font-weight: 500;">${name}</span>
              <span style="color: #10B981;">✓ Passed</span>
            </div>
          `).join('')}
          ${pendingComponents.map(name => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-radius: 6px; background-color: rgba(229, 231, 235, 0.5);">
              <span style="font-weight: 500;">${name}</span>
              <span style="color: #F59E0B;">● Pending</span>
            </div>
          `).join('')}
          ${failedComponents.map(name => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-radius: 6px; background-color: rgba(229, 231, 235, 0.5);">
              <span style="font-weight: 500;">${name}</span>
              <span style="color: #EF4444;">✗ Failed</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Footer summary -->
      <div class="report-footer-summary">
        <div style="font-size: 14px; font-weight: 600;">
          <span>Overall Result:</span>
          <span style="margin-left: 8px;">
            ${failedComponents.length > 0 ? 
              '<span class="badge badge-error">Failed</span>' : 
              pendingComponents.length > 0 ? 
              '<span class="badge badge-warning">Pending</span>' : 
              '<span class="badge badge-success">Passed</span>'
            }
          </span>
        </div>
        <div style="font-size: 12px; color: rgba(107, 114, 128, 0.6); margin-top: 4px;">
          ${failedComponents.length > 0 ? 
            `${failedComponents.length} component(s) failed, ${passedComponents.length} component(s) passed.` :
            pendingComponents.length > 0 ?
            'This device has pending tests.' :
            `All ${passedComponents.length} components passed with no errors.`
          }
        </div>
      </div>
    `;
  }
  
  private addReportStyles(container: HTMLElement): void {
    const style = document.createElement('style');
    style.textContent = `
      .temp-report-container .report-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      
      .temp-report-container .logo-section {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      
      .temp-report-container .company-logo {
        max-height: 80px;
        width: auto;
      }
      
      .temp-report-container .report-title-block {
        display: flex;
        flex-direction: column;
      }
      
      .temp-report-container .report-title {
        font-size: 2.2em;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 5px;
      }
      
      .temp-report-container .report-id {
        font-size: 0.9em;
        color: #7f8c8d;
      }
      
      .temp-report-container .report-id-value {
        background-color: #ecf0f1;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'Courier New', Courier, monospace;
      }
      
      .temp-report-container .report-meta-section {
        text-align: right;
      }
      
      .temp-report-container .tested-on-label {
        font-size: 0.85em;
        color: #7f8c8d;
        margin-top: 10px;
      }
      
      .temp-report-container .tested-on-value {
        font-weight: 600;
        font-size: 0.95em;
        color: #555;
      }
      
      .temp-report-container .qr-code-placeholder {
        width: 100px;
        height: 100px;
        border: 1px dashed #ccc;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: auto;
        margin-top: 15px;
        color: #999;
        font-size: 0.75em;
      }
      
      .temp-report-container .report-section {
        margin-bottom: 30px;
      }
      
      .temp-report-container .card {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
        background-color: #fdfdfd;
      }
      
      .temp-report-container .card-body {
        padding: 20px;
      }
      
      .temp-report-container .card-title {
        font-size: 1.2em;
        font-weight: 600;
        color: #34495e;
        margin-bottom: 10px;
      }
      
      .temp-report-container .report-footer-summary {
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid #eee;
        text-align: center;
        color: #555;
      }
      
      .temp-report-container .badge {
        padding: 5px 10px;
        border-radius: 4px;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.75em;
        display: inline-block;
      }
      
      .temp-report-container .badge-error {
        background-color: #e74c3c;
        color: white;
      }
      
      .temp-report-container .badge-warning {
        background-color: #f39c12;
        color: white;
      }
      
      .temp-report-container .badge-success {
        background-color: #27ae60;
        color: white;
      }
      
      .temp-report-container.pdf-optimized {
        width: 800px !important;
        transform: scale(1) !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
      }
      
      .temp-report-container.pdf-optimized .report-document {
        width: 100% !important;
        max-width: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 20px !important;
      }
    `;
    
    container.appendChild(style);
  }
  
  private async generateQrCode(diagnosticId: number): Promise<string | null> {
    try {
      const reportUrl = `${window.location.origin}/diagnostics/report/${diagnosticId}`;
      return await qrcode.toDataURL(reportUrl, { errorCorrectionLevel: 'H', width: 256 });
    } catch (err) {
      console.error('Error generating QR code:', err);
      return null;
    }
  }
  
  private parseComponentList(value: string | null): string[] {
    if (!value) return [];
    const s = String(value).trim();
    if (!s) return [];
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map(x => String(x)).filter(Boolean);
    } catch {}
    return s.split(/[;,]/g).map(x => x.trim()).filter(Boolean);
  }
  
  private async waitForImagesAndContent(container: HTMLElement): Promise<void> {
    console.log('Waiting for images and content to load...');
    
    // Wait for images
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(void 0);
        img.onerror = () => resolve(void 0); // Don't fail on image errors
        // Timeout after 5 seconds
        setTimeout(() => resolve(void 0), 5000);
      });
    });
    
    await Promise.all(imagePromises);
    
    // Additional wait for fonts and layout
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Content loading complete');
  }
  
  private createPdf(canvas: HTMLCanvasElement, singlePage: boolean = true): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    let imgWidth = pdfWidth;
    let imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    if (singlePage && imgHeight > pdfHeight) {
      // Scale to fit single page
      const scaleFactor = pdfHeight / imgHeight;
      imgHeight = pdfHeight;
      imgWidth = pdfWidth * scaleFactor;
      console.log('Content scaled to fit single page');
    }
    
    const xOffset = (pdfWidth - imgWidth) / 2;
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    if (singlePage) {
      pdf.addImage(imgData, 'PNG', xOffset, 0, imgWidth, imgHeight);
    } else {
      // Multi-page support
      let position = 0;
      let heightLeft = imgHeight;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }
    
    return pdf;
  }
  
  generateFilename(diagnostic: Diagnostic): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const encodedId = this.cipherService.encodeTestId(diagnostic.id, diagnostic.serial_number || undefined);
    return `diagnostic_report_${encodedId}_${timestamp}.pdf`;
  }
}