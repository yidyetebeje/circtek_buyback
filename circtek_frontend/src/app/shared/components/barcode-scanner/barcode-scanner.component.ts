import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface ScanResult {
  value: string;
  isValid: boolean;
  type: 'imei' | 'serial' | 'unknown';
}

@Component({
  selector: 'app-barcode-scanner',
  imports: [CommonModule, FormsModule],
  templateUrl: './barcode-scanner.component.html',
  styleUrls: ['./barcode-scanner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeScannerComponent {
  // Inputs
  placeholder = input<string>('Scan or enter IMEI/Serial number...');
  disabled = input<boolean>(false);
  label = input<string>('');
  required = input<boolean>(false);
  autoClear = input<boolean>(true); // Auto clear after successful scan
  enableCamera = input<boolean>(true); // Enable camera scanning
  showSearchButton = input<boolean>(false); // Show search button
  searchButtonText = input<string>('Search'); // Search button text
  searching = input<boolean>(false); // External searching state
  
  // Outputs
  scanned = output<ScanResult>();
  searchClicked = output<string>(); // Emitted when search button is clicked
  inputChanged = output<string>(); // Emitted when input value changes
  
  // Internal state
  protected readonly inputValue = signal<string>('');
  protected readonly isValid = signal<boolean | null>(null);
  protected readonly validationType = signal<'imei' | 'serial' | 'unknown'>('unknown');
  protected readonly errorMessage = signal<string>('');
  protected readonly isScanning = signal<boolean>(false);
  protected readonly isCameraScanning = signal<boolean>(false);
  protected readonly cameraError = signal<string>('');
  protected readonly hasCamera = signal<boolean>(false);
  
  // View references
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('scannerInput');
  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');
  
  // Barcode scanner detection
  private scanBuffer = '';
  private scanTimeout: any;
  private readonly SCAN_TIMEOUT = 100; // ms between characters for scanner detection
  private lastKeyTime = 0;
  
  // Camera scanning
  private currentStream: MediaStream | null = null;
  private animationFrame: number | null = null;
  private html5QrcodeScanner: Html5QrcodeScanner | null = null;
  
  constructor() {
    // Listen for keyboard events to detect barcode scanner input
    effect(() => {
      if (typeof window !== 'undefined') {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.checkCameraAvailability();
      }
    });
  }
  
  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    this.stopCameraScanning();
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear();
    }
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastKeyTime;
    
    // Check if any input field, textarea, or select is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );
    
    // If any input is focused, let normal typing work
    if (isInputFocused) {
      return;
    }
    
    // Detect rapid key input (typical of barcode scanners)
    if (timeDiff < this.SCAN_TIMEOUT) {
      this.isScanning.set(true);
      
      if (event.key === 'Enter') {
        // End of barcode scan
        event.preventDefault();
        this.processScan(this.scanBuffer);
        this.scanBuffer = '';
        this.isScanning.set(false);
      } else if (event.key.length === 1) {
        // Regular character
        this.scanBuffer += event.key;
        event.preventDefault();
      }
    } else {
      // Reset buffer if too much time has passed
      this.scanBuffer = '';
      if (event.key.length === 1) {
        this.scanBuffer = event.key;
        this.isScanning.set(true);
      }
    }
    
    this.lastKeyTime = currentTime;
    
    // Clear scan buffer after timeout
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    this.scanTimeout = setTimeout(() => {
      this.scanBuffer = '';
      this.isScanning.set(false);
    }, this.SCAN_TIMEOUT * 2);
  }
  
  private processScan(scannedValue: string): void {
    if (!scannedValue.trim()) return;
    
    // Focus the input and set the value
    const inputElement = this.inputRef()?.nativeElement;
    if (inputElement) {
      inputElement.focus();
      this.inputValue.set(scannedValue.trim());
      this.validateAndEmit(scannedValue.trim());
    }
  }
  
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.inputValue.set(value);
    // Only show visual feedback, don't emit scan result until Enter is pressed
    this.validateInputVisual(value);
    // Emit input change for external handling
    this.inputChanged.emit(value);
  }
  
  onInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const value = this.inputValue();
      if (value.trim()) {
        if (this.showSearchButton()) {
          // If search button is enabled, emit search click instead
          this.onSearchButtonClick();
        } else {
          // Original behavior
          this.validateAndEmit(value.trim());
        }
      }
    }
  }
  
  private validateInputVisual(value: string): void {
    if (!value.trim()) {
      this.isValid.set(null);
      this.validationType.set('unknown');
      this.errorMessage.set('');
      return;
    }
    
    const result = this.validateIMEIOrSerial(value.trim());
    this.isValid.set(result.isValid);
    this.validationType.set(result.type);
    
    if (!result.isValid) {
      this.errorMessage.set(this.getErrorMessage(value.trim()));
    } else {
      this.errorMessage.set('');
    }
    
    // Don't emit scan result here - only show visual feedback
  }

  private validateAndEmit(value: string): void {
    if (!value.trim()) {
      this.isValid.set(null);
      this.validationType.set('unknown');
      this.errorMessage.set('');
      return;
    }
    
    const result = this.validateIMEIOrSerial(value.trim());
    this.isValid.set(result.isValid);
    this.validationType.set(result.type);
    
    if (!result.isValid) {
      this.errorMessage.set(this.getErrorMessage(value.trim()));
    } else {
      this.errorMessage.set('');
    }
    
    // Emit the scan result only when Enter is pressed or barcode is scanned
    this.scanned.emit(result);
    
    // Auto clear if enabled and valid
    if (this.autoClear() && result.isValid) {
      setTimeout(() => {
        this.inputValue.set('');
        this.isValid.set(null);
        this.validationType.set('unknown');
        this.errorMessage.set('');
      }, 1000);
    }
  }
  
  private validateIMEIOrSerial(value: string): ScanResult {
    // Check if value contains spaces - if so, it's invalid
    if (value.includes(' ')) {
      return {
        value: value,
        isValid: false,
        type: 'unknown'
      };
    }
    
    // Remove any dashes (but not spaces - they're now invalid)
    const cleanValue = value.replace(/[-]/g, '');
    
    // Check if it's a valid IMEI (15 digits)
    if (this.isValidIMEI(cleanValue)) {
      return {
        value: cleanValue,
        isValid: true,
        type: 'imei'
      };
    }
    
    // Check if it's a valid serial number (alphanumeric, 6-20 characters)
    if (this.isValidSerial(cleanValue)) {
      return {
        value: cleanValue,
        isValid: true,
        type: 'serial'
      };
    }
    
    return {
      value: cleanValue,
      isValid: false,
      type: 'unknown'
    };
  }
  
  private isValidIMEI(imei: string): boolean {
    // IMEI should be exactly 15 digits
    if (!/^\d{15}$/.test(imei)) {
      return false;
    }
    
    // Luhn algorithm validation for IMEI
    let sum = 0;
    let alternate = false;
    
    for (let i = imei.length - 1; i >= 0; i--) {
      let digit = parseInt(imei.charAt(i));
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  }
  
  private isValidSerial(serial: string): boolean {
    // Serial number: alphanumeric, 6-20 characters
    return /^[A-Za-z0-9]{6,20}$/.test(serial);
  }
  
  private getErrorMessage(value: string): string {
    // Check if value contains spaces first
    if (value.includes(' ')) {
      return 'Spaces are not allowed in IMEI or serial numbers';
    }
    
    const cleanValue = value.replace(/[-]/g, '');
    
    if (cleanValue.length === 0) {
      return 'Please enter a value';
    }
    
    if (/^\d+$/.test(cleanValue)) {
      if (cleanValue.length !== 15) {
        return 'IMEI must be exactly 15 digits';
      } else {
        return 'Invalid IMEI checksum';
      }
    }
    
    if (cleanValue.length < 6) {
      return 'Serial number must be at least 6 characters';
    }
    
    if (cleanValue.length > 20) {
      return 'Serial number must be no more than 20 characters';
    }
    
    if (!/^[A-Za-z0-9]+$/.test(cleanValue)) {
      return 'Only alphanumeric characters allowed';
    }
    
    return 'Invalid IMEI or serial number';
  }
  
  focus(): void {
    const inputElement = this.inputRef()?.nativeElement;
    if (inputElement) {
      inputElement.focus();
    }
  }
  
  clear(): void {
    this.inputValue.set('');
    this.isValid.set(null);
    this.validationType.set('unknown');
    this.errorMessage.set('');
  }

  onSearchButtonClick(): void {
    const value = this.inputValue().trim();
    if (value) {
      this.searchClicked.emit(value);
    }
  }
  
  protected getInputClasses(): string {
    const baseClasses = 'input input-bordered scanner-input w-full';
    
    if (this.isScanning()) {
      return `${baseClasses} scanning`;
    }
    
    if (this.inputValue() && this.isValid() !== null) {
      if (this.isValid()) {
        return `${baseClasses} input-success border-success`;
      } else {
        return `${baseClasses} input-error border-error`;
      }
    }
    
    return baseClasses;
  }
  
  // Camera methods
  private async checkCameraAvailability(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      this.hasCamera.set(hasVideoInput);
    } catch (error) {
      console.warn('Camera check failed:', error);
      this.hasCamera.set(false);
    }
  }
  
  async startCameraScanning(): Promise<void> {
    if (!this.hasCamera() || this.isCameraScanning()) return;
    
    try {
      this.cameraError.set('');
      this.isCameraScanning.set(true);
      
      // Wait for modal to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if element exists with retry logic
      let scannerElement = document.getElementById('qr-reader');
      let retries = 0;
      while (!scannerElement && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        scannerElement = document.getElementById('qr-reader');
        retries++;
      }
      
      if (!scannerElement) {
        throw new Error('Scanner container not found in DOM after retries');
      }
      
      // Initialize html5-qrcode scanner
      this.html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        },
        false
      );

      // Start scanning
      this.html5QrcodeScanner.render(
        (decodedText, decodedResult) => {
          this.processScan(decodedText);
          this.stopCameraScanning();
        },
        (error) => {
          // Ignore frequent scanning errors
        }
      );
      
    } catch (error) {
      console.error('Camera access failed:', error);
      this.cameraError.set('Camera access denied or not available');
      this.isCameraScanning.set(false);
    }
  }
  
  stopCameraScanning(): void {
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear().catch(err => {
        console.warn('Error clearing scanner:', err);
      });
      this.html5QrcodeScanner = null;
    }
    
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.isCameraScanning.set(false);
    this.cameraError.set('');
  }
  
}
