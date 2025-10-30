import { Component, OnInit } from '@angular/core';
import Konva from 'konva';
import * as QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { BasePlaceholderComponent } from '../base-placeholder/base-placeholder.component';
import { PlaceholderService } from '../../services/placeholder.service';
import { LogosService } from '../../../../../services/logos.service';

export interface ImageConfig {
  width: number;
  height: number;
  data: string;
  format?: string;
}

@Component({
  selector: 'app-image-placeholder',
  template: '',
})
export class ImagePlaceholderComponent extends BasePlaceholderComponent implements OnInit {

  constructor(
    placeholderService: PlaceholderService,
    private logoService: LogosService
  ) {
    super(placeholderService);
  }

  override ngOnInit(): void {
    if (this.layer && this.position && this.placeholderId) {
      this.createPlaceholder();
    } else {
      console.error('ImagePlaceholderComponent: Missing required inputs.');
    }
  }

  override createPlaceholder(): void {
   
    this.setupPlaceholderImage();
    this.generateAndAddImage();
    this.setupEventListeners();
    this.addToLayerAndEmit();
  }

  protected override setupEventListeners(): void {
    // Call parent's basic event listeners first
    super.setupEventListeners();
  }

  // Override base transformer event handlers for image-specific behavior
  protected override onTransformerTransform(): void {
    this.onTransformStart();
  }

  protected override onTransformerTransformEnd(): void {
    this.onTransformEnd();
  }

  private onTransformStart(): void {
    // During transform, just update the visual representation
    if (this.placeholderImage) {
      const newWidth = this.placeholderImage.width() * this.placeholderImage.scaleX();
      const newHeight = this.placeholderImage.height() * this.placeholderImage.scaleY();
      
      // Update temporary state for visual feedback
      this.state.width = newWidth;
      this.state.height = newHeight;
      
      this.layer?.batchDraw();
    }
  }

  private async onTransformEnd(): Promise<void> {
    if (!this.placeholderImage) return;

    const newWidth = this.placeholderImage.width() * this.placeholderImage.scaleX();
    const newHeight = this.placeholderImage.height() * this.placeholderImage.scaleY();

    // Update position object
   
    if (this.position) {
      this.position.width = newWidth;
      this.position.height = newHeight;
    }
   

    // Reset scales on the image
    this.placeholderImage.width(newWidth);
    this.placeholderImage.height(newHeight);
    this.placeholderImage.scaleX(1);
    this.placeholderImage.scaleY(1);

    // Update state without regenerating image content
    this.updateStateOnly(newWidth, newHeight);

    this.layer?.batchDraw();
  }

  private async generateAndAddImage(): Promise<void> {
    try {
      const imageConfig = await this.generateImageConfig();
      await this.setImageData(imageConfig);
    } catch (error) {
      console.error('Error creating image placeholder:', error);
      await this.createFallbackImage();
    }
  }

  private async generateImageConfig(): Promise<ImageConfig> {
    const width = this.state?.width || this.position?.width || 200;
    const height = this.state?.height || this.position?.height || 100;
    
    // Determine image type and generate accordingly
    if (this.placeholderId.toLowerCase().includes('qrcode')) {
      return this.generateQRCode(width, height);
    } else if (this.placeholderId.toLowerCase().includes('barcode')) {
      return this.generateBarcode(width, height);
    } else if (this.placeholderId.toLowerCase() === 'client.logo') {
      return this.generateLogo(width, height);
    } else {
      throw new Error('Unknown image type');
    }
  }

  private async generateQRCode(width: number, height: number): Promise<ImageConfig> {
    const data = this.getQRData();
    
    // Generate QR code at optimal square size (use the larger dimension for quality)
    const optimalSize = Math.max(width, height, 200); // Ensure minimum 200px for quality
    const squareDataURL = await QRCode.toDataURL(data, {
      width: optimalSize,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
    
    // If dimensions are square or close to square, return the original
    const aspectRatio = width / height;
    if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
      return { width, height, data: squareDataURL };
    }
    
    // Otherwise, resize the square QR code to exact dimensions using canvas
    const resizedDataURL = await this.resizeQRCode(squareDataURL, optimalSize, width, height);
    return { width, height, data: resizedDataURL };
  }

  private async resizeQRCode(originalDataURL: string, originalSize: number, targetWidth: number, targetHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Draw the QR code stretched to fit exact dimensions
        ctx.drawImage(img, 0, 0, originalSize, originalSize, 0, 0, targetWidth, targetHeight);
        
        resolve(canvas.toDataURL());
      };
      img.onerror = reject;
      img.src = originalDataURL;
    });
  }

  private async generateBarcode(width: number, height: number): Promise<ImageConfig> {
    const { data, format } = this.getBarcodeData();
    const canvas = document.createElement('canvas');
    
    JsBarcode(canvas, data, {
      format,
      width: 2,
      height: height - 20,
      displayValue: true,
      fontSize: 14,
      margin: 5,
      background: '#ffffff',
      lineColor: '#000000'
    });
    
    return { width, height, data: canvas.toDataURL(), format };
  }

  private async generateLogo(width: number, height: number): Promise<ImageConfig> {
    const logoUrl = this.logoService.getClientLogoUrl() || this.src;
    if (!logoUrl) {
      throw new Error('No logo URL available');
    }
    
    return { width, height, data: logoUrl };
  }

  private async setImageData(config: ImageConfig): Promise<void> {
    // Load image
    const imageObj = await this.loadImage(config.data);
    
    // Set the image data to the Konva Image
    this.placeholderImage.image(imageObj);
    
    // Update dimensions
    this.placeholderImage.width(config.width);
    this.placeholderImage.height(config.height);

    // Handle aspect ratio for logos
    if (this.placeholderId.toLowerCase() === 'client.logo') {
      this.adjustImageAspectRatio(imageObj, config.width, config.height);
    }

    this.updateState(config);
    this.layer?.batchDraw();
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private adjustImageAspectRatio(imageObj: HTMLImageElement, containerWidth: number, containerHeight: number): void {
    const imageAspect = imageObj.naturalWidth / imageObj.naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let newWidth = containerWidth;
    let newHeight = containerHeight;

    if (imageAspect > containerAspect) {
      newWidth = containerWidth;
      newHeight = containerWidth / imageAspect;
    } else {
      newHeight = containerHeight;
      newWidth = containerHeight * imageAspect;
    }

    this.placeholderImage.width(newWidth);
    this.placeholderImage.height(newHeight);
  }

  private async createFallbackImage(): Promise<void> {
    const width = this.state?.width || this.position?.width || 200;
    const height = this.state?.height || this.position?.height || 100;
    
    let fallbackText = 'Image Error';
    if (this.placeholderId.toLowerCase().includes('qrcode')) {
      fallbackText = 'QR Code';
    } else if (this.placeholderId.toLowerCase().includes('barcode')) {
      fallbackText = 'Barcode';
    } else if (this.placeholderId.toLowerCase() === 'client.logo') {
      fallbackText = 'Client Logo';
    }

    // Create a simple canvas with error text
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fill background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, width, height);
      
      // Draw border
      ctx.strokeStyle = '#ccc';
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(0, 0, width, height);
      
      // Draw text
      ctx.fillStyle = '#888';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallbackText, width / 2, height / 2);
    }

    // Load the canvas as image
    const imageObj = await this.loadImage(canvas.toDataURL());
    this.placeholderImage.image(imageObj);
    this.placeholderImage.width(width);
    this.placeholderImage.height(height);
    
    this.updateState({ width, height, data: canvas.toDataURL() });
    this.layer?.batchDraw();
  }

  private updateState(config: ImageConfig): void {
    // Update component state
    this.state.width = config.width;
    this.state.height = config.height;
    
    // Update Konva image attributes
    this.placeholderImage.setAttr('placeholderWidth', config.width);
    this.placeholderImage.setAttr('placeholderHeight', config.height);

    // Store specific data based on type
    if (this.placeholderId.toLowerCase().includes('qrcode')) {
      const qrData = this.getQRData();
      this.state.qrData = qrData;
      this.placeholderImage.setAttr('qrData', qrData);
    } else if (this.placeholderId.toLowerCase().includes('barcode')) {
      const { data, format } = this.getBarcodeData();
      this.state.barcodeData = data;
      this.state.barcodeFormat = format;
      this.placeholderImage.setAttr('barcodeData', data);
      this.placeholderImage.setAttr('barcodeFormat', format);
    } else if (this.placeholderId.toLowerCase() === 'client.logo') {
      this.state.src = config.data;
      this.placeholderImage.setAttr('logoSrc', config.data);
      this.placeholderImage.setAttr('isClientLogo', true);
    }

    // Update position object for tracking
    if (this.position) {
      this.position.width = config.width;
      this.position.height = config.height;
    }
  }

  private updateStateOnly(width: number, height: number): void {
    // Update component state dimensions only
    this.state.width = width;
    this.state.height = height;
    
    // Update Konva image attributes for serialization
    this.placeholderImage.setAttr('placeholderWidth', width);
    this.placeholderImage.setAttr('placeholderHeight', height);

    // Update position object for tracking
    if (this.position) {
      this.position.width = width;
      this.position.height = height;
    }
  }

  private getQRData(): string {
    if (this.state?.qrData) return this.state.qrData;
    
    const [category, field] = this.placeholderId.split('.');
    switch (category.toLowerCase()) {
      case 'device':
        const deviceModel = this.placeholderService.getPlaceholderSampleValue('Device.Model');
        const deviceSerial = this.placeholderService.getPlaceholderSampleValue('Device.Serial');
        return `https://circtek.com/device?model=${encodeURIComponent(deviceModel)}&serial=${encodeURIComponent(deviceSerial)}`;
      case 'test':
        const testDate = this.placeholderService.getPlaceholderSampleValue('Test.Date');
        const tester = this.placeholderService.getPlaceholderSampleValue('Test.Tester');
        return `https://circtek.com/testresult?date=${encodeURIComponent(testDate)}&tester=${encodeURIComponent(tester)}`;
      default:
        return `https://circtek.com/scan/${this.placeholderId}/${Date.now()}`;
    }
  }

  private getBarcodeData(): { data: string, format: string } {
    if (this.state?.barcodeData && this.state?.barcodeFormat) {
      return { data: this.state.barcodeData, format: this.state.barcodeFormat };
    }

    const [category, field] = this.placeholderId.split('.');
    let data = '';
    let format = 'CODE128';

    switch (category.toLowerCase()) {
      case 'device':
        if (field.toLowerCase().includes('imei')) {
          data = this.placeholderService.getPlaceholderSampleValue('Device.IMEI') || '356938112345678';
        } else if (field.toLowerCase().includes('serial')) {
          data = this.placeholderService.getPlaceholderSampleValue('Device.Serial') || 'SNABC123XYZ789';
        } else if (field.toLowerCase().includes('lpnbarcode')) {
          data = this.placeholderService.getPlaceholderSampleValue('Device.LPN') || 'LPNRR123456789';
        } else {
          data = 'DEVICE-DATA-123';
        }
        break;
      case 'product':
        data = '5901234123457';
        format = 'EAN13';
        break;
      default:
        data = `ID-${this.placeholderId}-${Date.now().toString().slice(-6)}`;
    }

    return { data, format };
  }
} 