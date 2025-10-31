import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Diagnostic } from '../../../core/models/diagnostic';

@Component({
  selector: 'app-diagnostic-report-template',
  imports: [CommonModule],
  templateUrl: './diagnostic-report-template.component.html',
  styleUrl: './diagnostic-report-template.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticReportTemplateComponent {
  // Inputs
  report = input.required<Diagnostic>();
  logoUrl = input<string | null>(null);
  qrCodeDataUrl = input<string | null>(null);
  encodedReportId = input<string>('');
  showPrintButtons = input<boolean>(true);
  
  // Computed properties
  protected getBatteryInfo = computed(() => {
    const report = this.report();
    if (!report?.battery_info) return '-';
    
    const batteryInfo = report.battery_info as any;
    
    if (batteryInfo.health_percentage !== undefined) {
      return `${batteryInfo.health_percentage}%`;
    } else if (batteryInfo.health !== undefined) {
      return batteryInfo.health;
    } else if (batteryInfo.case || batteryInfo.left || batteryInfo.right) {
      const caseBattery = batteryInfo.case?.charge_percentage;
      const leftBattery = batteryInfo.left?.charge_percentage;
      const rightBattery = batteryInfo.right?.charge_percentage;
      
      const parts = [];
      if (caseBattery) parts.push(`Case: ${caseBattery}`);
      if (leftBattery) parts.push(`L: ${leftBattery}`);
      if (rightBattery) parts.push(`R: ${rightBattery}`);
      
      return parts.length > 0 ? parts.join(', ') : '-';
    }
    
    return '-';
  });
  
  protected getICloudStatus = computed(() => {
    const report = this.report();
    if (!report?.iCloud) return '-';
    
    const iCloud = report.iCloud as any;
    return iCloud.status || iCloud || report.device_lock;
  });
  
  protected getCarrierLock = computed(() => {
    const report = this.report();
    if (!report?.carrier_lock) return '-';
    
    const carrierLock = report.carrier_lock as any;
    return carrierLock.carrier || carrierLock || '-';
  });
  
  protected getDeviceOs = computed(() => {
    const report = this.report();
    if (!report?.device_type) return 'unknown';
    
    const deviceType = String(report.device_type).toLowerCase();
    if (deviceType.includes('iphone') || deviceType.includes('ipad') || deviceType.includes('ios')) {
      return 'ios';
    } else if (deviceType.includes('android')) {
      return 'android';
    }
    return 'unknown';
  });
  
  protected getOemParts = computed(() => {
    const report = this.report();
    if (!report?.oem_info) return [];
    
    try {
      const oemInfo = typeof report.oem_info === 'string' 
        ? JSON.parse(report.oem_info) 
        : report.oem_info;
      
      if (Array.isArray(oemInfo)) {
        return oemInfo;
      }
    } catch (e) {
      console.error('Error parsing OEM info:', e);
    }
    
    return [];
  });
  
  protected getAllTests = computed(() => {
    const report = this.report();
    if (!report) return [];
    
    const tests: Array<{name: string, status: string}> = [];
    
    const failedTests = this.parseList(report.failed_components);
    failedTests.forEach(name => {
      tests.push({ name, status: 'failed' });
    });
    
    const passedTests = this.parseList(report.passed_components);
    passedTests.forEach(name => {
      tests.push({ name, status: 'passed' });
    });
    
    return tests;
  });
  
  protected getPassedCount = computed(() => {
    const report = this.report();
    if (!report) return 0;
    return this.parseList(report.passed_components).length;
  });
  
  protected getFailedCount = computed(() => {
    const report = this.report();
    if (!report) return 0;
    return this.parseList(report.failed_components).length;
  });
  
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
  
  protected chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }
}
