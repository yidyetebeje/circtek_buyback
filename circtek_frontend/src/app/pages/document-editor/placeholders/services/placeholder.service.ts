import { Injectable } from '@angular/core';

export interface Placeholder {
  id: string;
  name: string;
  icon: string; // Nucleo icon class name
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed';
}

@Injectable({
  providedIn: 'root'
})
export class PlaceholderService {
  // Sample test results data structure
  private sampleTestResults: TestResult[] = [
    { name: 'Voltage Test', status: 'passed' },
    { name: 'Current Test', status: 'passed' },
    { name: 'Resistance Test', status: 'failed' },
    { name: 'Continuity Test', status: 'passed' },
    { name: 'Isolation Test', status: 'passed' },
    { name: 'Leakage Test', status: 'failed' },
    { name: 'Ground Test', status: 'passed' },
    { name: 'Polarity Test', status: 'passed' },
    { name: 'Power Supply Test', status: 'passed' },
    { name: 'Network Connectivity', status: 'passed' },
    { name: 'Display Test', status: 'passed' },
    { name: 'Memory Test', status: 'failed' },
    { name: 'Sensor Calibration', status: 'passed' },
    { name: 'Peripheral Interface', status: 'passed' },
  ];

  private readonly placeholderStates = {
    ORIGINAL: 'original',
    PREVIEW: 'preview',
    ACTUAL: 'actual'
  };

  constructor() { }

  getPlaceholderStates() {
    return this.placeholderStates;
  }

  /**
   * Returns sample test results data for display in test results placeholder
   */
  getSampleTestResults(): TestResult[] {
    return this.sampleTestResults;
  }

  /**
   * Returns a human-readable display text for a placeholder
   */
  getPlaceholderDisplayText(placeholderId: string): string {
    if (!placeholderId) return 'Unknown';

    const parts = placeholderId.split('.');
    if (parts.length !== 2) {
      return `<${placeholderId}>`;
    }

    const [category, field] = parts;

    // Format the field name - capitalize first letter of each word, handle camelCase
    let displayText = field
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .replace(/ q r /i, ' QR ') // Specific handling for QR
      .replace(/ i m e i /i, ' IMEI ') // Specific handling for IMEI
      .replace(/ o e m /i, ' OEM ') // Specific handling for OEM
      .trim();

    // Special case for known barcodes/qrcodes
    if (field.toLowerCase().includes('qrcode')) {
        displayText = displayText.replace('Qr Code', 'QR Code');
    } else if (field.toLowerCase().includes('barcode')) {
        displayText = displayText.replace('Barcode', ' Barcode');
    }

    // For status fields, check if we should add a status indicator symbol
    if (field.toLowerCase().includes('status')) {
      const sampleValue = this.getPlaceholderSampleValue(placeholderId);
      // Extract the status symbol (✓ or ✗) from the sample value
      const statusSymbol = sampleValue.includes('✓') ? ' ✓' : sampleValue.includes('✗') ? ' ✗' : '';
      displayText += statusSymbol;
    }

    return displayText;
  }


  // Get sample value for a placeholder
  getPlaceholderSampleValue(placeholderId: string): string {
    if (!placeholderId) return 'Sample Value';

    const parts = placeholderId.split('.');
    if (parts.length !== 2) return 'Sample Value';

    const [type, field] = parts;

    // Return appropriate sample values based on type and field
    switch (type.toLowerCase()) {
      case 'customer': // Kept for potential future use
        switch (field.toLowerCase()) {
          case 'name': return 'CircTek Industries';
          case 'address': return '123 Tech Boulevard, Amsterdam';
          case 'email': return 'info@circtek.com';
          case 'phone': return '+31 20 123 4567';
          default: return 'Customer Information';
        }
      case 'device':
        switch (field.toLowerCase()) {
          case 'name': return 'iPhone 14 Pro Max';
          case 'color': return 'Deep Purple';
          case 'model': return 'A2651';
          case 'imei': return '356938112345678';
          case 'serial': return 'C39F5ZALP0XV';
          case 'lockstatus': return 'Unlocked ✓';
          case 'icloudstatus': return 'iCloud Off ✓';
          case 'functionalitystatus': return 'Functional ✓';
          case 'batterystatus': return 'BH 92%';
          case 'oem': return 'OEM ✓';
          case 'status': return 'Device Passed ✓';
          case 'disksizegb': return '256 GB';
          case 'lpn': return 'LPNRR123456789';
          case 'qrcode': return '[QR Code]'; // Placeholder indicator
          case 'imeibarcode': return '[IMEI Barcode]'; // Placeholder indicator
          case 'serialbarcode': return '[Serial Barcode]'; // Placeholder indicator
          case 'lpnbarcode': return '[LPN Barcode]'; // Placeholder indicator
          case 'portnumber': return 'Port 2';
          case 'questionsresponsehorizontal': return 'Excellent - No scratches, 95% - Good, None';
          case 'questionsresponsevertical': return 'Excellent - No scratches\n95% - Good\nNone';
          default: return 'Device Information';
        }
      case 'test':
        switch (field.toLowerCase()) {
          case 'results': return '[Test Results Table]'; // Special component
          case 'summary': return 'Passed 12/14 tests';
          case 'date': return '05/07/2025';
          case 'warehouse': return 'Amsterdam Central';
          case 'tester': return 'Emma Bakker';
          case 'failedcomponent': return 'Front Camera, Earpiece Speaker';
          case 'resultsqrcode': return '[Test Results QR Code]'; // Placeholder indicator
          default: return 'Test Information';
        }
      case 'date':
        switch (field.toLowerCase()) {
          case 'current': return new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY format
          default: return new Date().toLocaleDateString('en-GB');
        }
      case 'client':
        switch (field.toLowerCase()) {
          case 'logo': return '[Client Logo]'; // Placeholder indicator
          default: return 'Client Information';
        }
      default:
        return 'Sample Data';
    }
  }

  /**
   * Returns a list of all available placeholders for the sidebar
   */
  getAvailablePlaceholders(): Placeholder[] {
    // Define placeholders with their IDs, display names, and suggested icons (e.g., from Nucleo Icons)
    const placeholders: Placeholder[] = [
      // Device
      { id: 'Device.Name', name: 'Device Name', icon: 'ni-tag' },
      { id: 'Device.Color', name: 'Device Color', icon: 'ni-palette' },
      { id: 'Device.Model', name: 'Device Model', icon: 'ni-settings-gear-65' },
      { id: 'Device.IMEI', name: 'Device IMEI', icon: 'ni-key-25' },
      { id: 'Device.Serial', name: 'Device Serial', icon: 'ni-key-25' },
      { id: 'Device.LockStatus', name: 'Lock Status', icon: 'ni-lock-circle-open' },
      { id: 'Device.iCloudStatus', name: 'iCloud Status', icon: 'ni-cloud-download-95' },
      { id: 'Device.FunctionalityStatus', name: 'Functionality Status', icon: 'ni-check-bold' },
      { id: 'Device.BatteryStatus', name: 'Battery Status', icon: 'ni-battery-half' },
      { id: 'Device.OEM', name: 'Device OEM', icon: 'ni-building' }, // Corrected field name
      { id: 'Device.Status', name: 'Device Status', icon: 'ni-button-play' },
      { id: 'Device.DiskSizeGB', name: 'Disk Size (GB)', icon: 'ni-chart-bar-32' },
      { id: 'Device.LPN', name: 'LPN', icon: 'ni-tag' },
      { id: 'Device.QRCode', name: 'Device QR Code', icon: 'ni-grid-45' },
      { id: 'Device.IMEIBarcode', name: 'Device IMEI Barcode', icon: 'ni-tag' }, // Consistent naming
      { id: 'Device.SerialBarcode', name: 'Device Serial Barcode', icon: 'ni-tag' }, // Consistent naming
      { id: 'Device.LPNBarcode', name: 'LPN Barcode', icon: 'ni-tag' },
      { id: 'Device.PortNumber', name: 'Port Number', icon: 'ni-pin-3' },
      { id: 'Device.QuestionsResponseHorizontal', name: 'Questions Response (Horizontal)', icon: 'ni-bullet-list-67' },
      { id: 'Device.QuestionsResponseVertical', name: 'Questions Response (Vertical)', icon: 'ni-list-ul' },

      // Client branding
      { id: 'Client.Logo', name: 'Client Logo', icon: 'ni-image' },

      // Test
      // { id: 'Test.Results', name: 'Test Results', icon: 'ni-bullet-list-67' }, // Placeholder for the complex table
      { id: 'Test.Summary', name: 'Test Summary', icon: 'ni-align-left-2' },
      { id: 'Test.Date', name: 'Test Date', icon: 'ni-time-alarm' },
      { id: 'Test.Warehouse', name: 'Warehouse Name', icon: 'ni-building' },
      { id: 'Test.Tester', name: 'Tester Name', icon: 'ni-single-02' },
      { id: 'Test.FailedComponent', name: 'Failed Component', icon: 'ni-settings' },
      { id: 'Test.ResultsQRCode', name: 'Test Results QR Code', icon: 'ni-grid-45' }, // Corrected field name

      // Date
      { id: 'Date.Current', name: 'Current Date', icon: 'ni-calendar-grid-58' },
    ];
    return placeholders;
  }
} 