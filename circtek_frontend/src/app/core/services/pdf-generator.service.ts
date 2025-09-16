import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Diagnostic } from '../models/diagnostic';
import { DiagnosticDataService, UserInfo, TenantInfo } from './diagnostic-data.service';
import { LogosService } from '../../services/logos.service';
import qrcode from 'qrcode';

export interface PdfGenerationOptions {
  includeQrCode?: boolean;
  includeHeader?: boolean;
  includeBranding?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  private readonly diagnosticDataService = inject(DiagnosticDataService);
  private readonly logosService = inject(LogosService);

  // Cache for QR codes to avoid regeneration
  private qrCodeCache = new Map<number, string>();
  private readonly QR_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Generate PDF from cached diagnostic data without API calls
   */
  async generateDiagnosticPdf(
    diagnostic: Diagnostic, 
    options: PdfGenerationOptions = {}
  ): Promise<Blob> {
    const {
      includeQrCode = true,
      includeHeader = true,
      includeBranding = true
    } = options;

    // Create PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 20;

    try {
      // Add header with branding if enabled
      if (includeHeader && includeBranding) {
        currentY = await this.addHeader(pdf, currentY, pageWidth);
      }

      // Add diagnostic information
      currentY = this.addDiagnosticInfo(pdf, diagnostic, currentY, pageWidth);

      // Add device information
      currentY = this.addDeviceInfo(pdf, diagnostic, currentY, pageWidth);

      // Add test results
      currentY = this.addTestResults(pdf, diagnostic, currentY, pageWidth, pageHeight);

      // Add QR code if enabled
      if (includeQrCode) {
        await this.addQrCode(pdf, diagnostic.id, currentY, pageWidth, pageHeight);
      }

      // Add footer
      this.addFooter(pdf, pageWidth, pageHeight);

      // Return as blob
      const pdfBlob = pdf.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Generate PDF filename based on diagnostic data and user info
   */
  generateFilename(diagnostic: Diagnostic): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const deviceInfo = diagnostic.imei || diagnostic.serial_number || diagnostic.lpn || 'unknown';
    const userInfo = this.diagnosticDataService.userInfo();
    const tenantInfo = this.diagnosticDataService.tenantInfo();
    
    let filename = `diagnostic_report_${diagnostic.id}_${deviceInfo}_${timestamp}`;
    
    if (tenantInfo?.name) {
      filename += `_${tenantInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    
    return `${filename}.pdf`;
  }

  private async addHeader(pdf: jsPDF, startY: number, pageWidth: number): Promise<number> {
    let currentY = startY;
    
    try {
      // Add logo if available
      const logoUrl = this.logosService.getClientLogoUrl();
      if (logoUrl) {
        // Note: In a real implementation, you'd need to load and add the logo
        // For now, just add a placeholder
        pdf.setFontSize(16);
        pdf.setTextColor(100, 100, 100);
        pdf.text('DIAGNOSTIC REPORT', pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
      }

      // Add tenant/company info
      const userInfo = this.diagnosticDataService.userInfo();
      const tenantInfo = this.diagnosticDataService.tenantInfo();
      
      if (tenantInfo?.name || userInfo?.tenant_name) {
        pdf.setFontSize(12);
        pdf.setTextColor(60, 60, 60);
        const companyName = tenantInfo?.name || userInfo?.tenant_name || 'CircTek';
        pdf.text(companyName, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;
      }

      // Add separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, currentY, pageWidth - 20, currentY);
      currentY += 15;

    } catch (error) {
      console.error('Error adding header:', error);
      currentY += 20; // Fallback spacing
    }

    return currentY;
  }

  private addDiagnosticInfo(pdf: jsPDF, diagnostic: Diagnostic, startY: number, pageWidth: number): number {
    let currentY = startY;

    // Report title
    pdf.setFontSize(18);
    pdf.setTextColor(30, 30, 30);
    pdf.text(`Diagnostic Report #${diagnostic.id}`, 20, currentY);
    currentY += 15;

    // Basic info
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);

    const info = [
      { label: 'Test Date:', value: diagnostic.created_at ? new Date(diagnostic.created_at).toLocaleString() : 'N/A' },
      { label: 'Tester:', value: diagnostic.tester_username || 'N/A' },
      { label: 'Status:', value: this.getTestStatus(diagnostic) }
    ];

    info.forEach((item, index) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.label, 20, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.value, 60, currentY);
      currentY += 7;
    });

    currentY += 10;
    return currentY;
  }

  private addDeviceInfo(pdf: jsPDF, diagnostic: Diagnostic, startY: number, pageWidth: number): number {
    let currentY = startY;

    // Section title
    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.text('Device Information', 20, currentY);
    currentY += 10;

    // Device details
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);

    const deviceInfo = [
      { label: 'IMEI:', value: diagnostic.imei || 'N/A' },
      { label: 'Serial Number:', value: diagnostic.serial_number || 'N/A' },
      { label: 'LPN:', value: diagnostic.lpn || 'N/A' },
      { label: 'Make:', value: diagnostic.make || 'N/A' },
      { label: 'Model:', value: diagnostic.model_name || 'N/A' },
      { label: 'OS Version:', value: diagnostic.os_version || 'N/A' },
      { label: 'Storage:', value: diagnostic.device_storage || 'N/A' },
      { label: 'Color:', value: diagnostic.device_color || 'N/A' },
      { label: 'Device Lock:', value: diagnostic.device_lock || 'N/A' },
      { label: 'OEM Status:', value: diagnostic.oem_status || 'N/A' }
    ];

    // Display in two columns
    const leftColumn = deviceInfo.slice(0, 5);
    const rightColumn = deviceInfo.slice(5);
    const columnWidth = (pageWidth - 40) / 2;

    leftColumn.forEach((item, index) => {
      const yPos = currentY + (index * 7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.label, 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.value, 70, yPos);
    });

    rightColumn.forEach((item, index) => {
      const yPos = currentY + (index * 7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.label, 20 + columnWidth, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.value, 70 + columnWidth, yPos);
    });

    currentY += Math.max(leftColumn.length, rightColumn.length) * 7 + 15;

    // Battery info if available
    if (diagnostic.battery_info) {
      pdf.setFontSize(12);
      pdf.setTextColor(30, 30, 30);
      pdf.text('Battery Information', 20, currentY);
      currentY += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      const batteryText = this.formatBatteryInfo(diagnostic.battery_info);
      pdf.text(batteryText, 20, currentY);
      currentY += 15;
    }

    return currentY;
  }

  private addTestResults(pdf: jsPDF, diagnostic: Diagnostic, startY: number, pageWidth: number, pageHeight: number): number {
    let currentY = startY;

    // Section title
    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.text('Test Results', 20, currentY);
    currentY += 10;

    // Parse components
    const passedComponents = this.parseComponents(diagnostic.passed_components);
    const failedComponents = this.parseComponents(diagnostic.failed_components);
    const pendingComponents = this.parseComponents(diagnostic.pending_components);

    // Summary
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Passed: ${passedComponents.length} | Failed: ${failedComponents.length} | Pending: ${pendingComponents.length}`, 20, currentY);
    currentY += 15;

    // Add component lists
    if (passedComponents.length > 0) {
      currentY = this.addComponentList(pdf, 'Passed Components', passedComponents, currentY, pageWidth, [0, 150, 0]);
    }

    if (failedComponents.length > 0) {
      currentY = this.addComponentList(pdf, 'Failed Components', failedComponents, currentY, pageWidth, [200, 0, 0]);
    }

    if (pendingComponents.length > 0) {
      currentY = this.addComponentList(pdf, 'Pending Components', pendingComponents, currentY, pageWidth, [200, 100, 0]);
    }

    return currentY;
  }

  private addComponentList(pdf: jsPDF, title: string, components: string[], startY: number, pageWidth: number, color: number[]): number {
    let currentY = startY;

    pdf.setFontSize(12);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(title, 20, currentY);
    currentY += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);

    components.forEach(component => {
      if (currentY > 270) { // Check if we need a new page
        pdf.addPage();
        currentY = 20;
      }
      pdf.text(`• ${component}`, 25, currentY);
      currentY += 6;
    });

    currentY += 8;
    return currentY;
  }

  private async addQrCode(pdf: jsPDF, diagnosticId: number, startY: number, pageWidth: number, pageHeight: number): Promise<void> {
    try {
      let qrCodeDataUrl = this.qrCodeCache.get(diagnosticId);
      
      if (!qrCodeDataUrl) {
        const reportUrl = `${window.location.origin}/diagnostics/report/${diagnosticId}`;
        qrCodeDataUrl = await qrcode.toDataURL(reportUrl, { 
          errorCorrectionLevel: 'H', 
          width: 128,
          margin: 1 
        });
        this.qrCodeCache.set(diagnosticId, qrCodeDataUrl);
      }

      // Position QR code in bottom right
      const qrSize = 30;
      const qrX = pageWidth - qrSize - 20;
      const qrY = pageHeight - qrSize - 20;

      pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Add label
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Scan for details', qrX, qrY + qrSize + 5);

    } catch (error) {
      console.error('Error adding QR code:', error);
    }
  }

  private addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    const footerY = pageHeight - 15;
    
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    
    // Generated timestamp
    const timestamp = new Date().toLocaleString();
    pdf.text(`Generated: ${timestamp}`, 20, footerY);
    
    // Page number
    pdf.text('Page 1', pageWidth - 30, footerY);
  }

  private getTestStatus(diagnostic: Diagnostic): string {
    if ((diagnostic.failed_components ?? '').trim()) return 'FAILED';
    if ((diagnostic.pending_components ?? '').trim()) return 'PENDING';
    return 'PASSED';
  }

  private parseComponents(value: string | null): string[] {
    if (!value) return [];
    const v = String(value).trim();
    if (!v) return [];
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(x => String(x)).filter(Boolean);
    } catch {}
    return v.split(/[;,]/g).map(s => s.trim()).filter(Boolean);
  }

  private formatBatteryInfo(batteryInfo: any): string {
    if (typeof batteryInfo !== 'object' || !batteryInfo) return 'N/A';
    
    const parts: string[] = [];
    if (batteryInfo.health) parts.push(`Health: ${batteryInfo.health}`);
    if (batteryInfo.cycle_count ?? batteryInfo.cycles) {
      parts.push(`Cycles: ${batteryInfo.cycle_count ?? batteryInfo.cycles}`);
    }
    if (batteryInfo.capacity) parts.push(`Capacity: ${batteryInfo.capacity}`);
    if (batteryInfo.voltage) parts.push(`Voltage: ${batteryInfo.voltage}`);
    
    return parts.length ? parts.join(' • ') : 'N/A';
  }

  // Clear QR code cache
  clearQrCodeCache(): void {
    this.qrCodeCache.clear();
  }

  // Clean up expired QR codes
  cleanupExpiredQrCodes(): void {
    // QR codes don't expire in this simple implementation
    // but you could add timestamp tracking if needed
  }
}