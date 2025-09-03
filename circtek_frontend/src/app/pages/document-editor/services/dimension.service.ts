import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EditorDimensions, PaperOrientation } from '../types/editor.types';
import { PAPER_SIZES_INCH, DEFAULT_VALUES } from '../constants/editor.constants';

@Injectable({
  providedIn: 'root'
})
export class DimensionService {
  private dimensionsSubject = new BehaviorSubject<EditorDimensions>(this.getDefaultDimensions());
  public dimensions$ = this.dimensionsSubject.asObservable();

  private paperSizes = { ...PAPER_SIZES_INCH };

  constructor() {}

  private getDefaultDimensions(): EditorDimensions {
    // Use direct calculation during initialization to avoid circular dependency
    const defaultDpi = DEFAULT_VALUES.DPI;
    const pageWidthInches = DEFAULT_VALUES.PAGE_WIDTH_INCHES;
    const pageHeightInches = DEFAULT_VALUES.PAGE_HEIGHT_INCHES;
    
    return {
      canvasWidth: Math.round(pageWidthInches * defaultDpi),
      canvasHeight: Math.round(pageHeightInches * defaultDpi),
      canvasWidthMm: pageWidthInches * DEFAULT_VALUES.MM_PER_INCH,
      canvasHeightMm: pageHeightInches * DEFAULT_VALUES.MM_PER_INCH,
      pageWidthInches: pageWidthInches,
      pageHeightInches: pageHeightInches,
      DPI: defaultDpi,
      selectedPaperSize: DEFAULT_VALUES.SELECTED_PAPER_SIZE,
      paperOrientation: DEFAULT_VALUES.PAPER_ORIENTATION
    };
  }

  getCurrentDimensions(): EditorDimensions {
    return this.dimensionsSubject.value;
  }

  inchesToPixels(inches: number, dpi?: number): number {
    const currentDpi = dpi || this.getCurrentDimensions().DPI;
    return Math.round(inches * currentDpi);
  }

  inchesToMm(inches: number): number {
    return inches * DEFAULT_VALUES.MM_PER_INCH;
  }

  mmToInches(mm: number): number {
    return mm / DEFAULT_VALUES.MM_PER_INCH;
  }

  mmToPixels(mm: number, dpi?: number): number {
    return this.inchesToPixels(this.mmToInches(mm), dpi);
  }

  pixelsToMm(pixels: number, dpi?: number): number {
    const currentDpi = dpi || this.getCurrentDimensions().DPI;
    return Math.round((pixels / currentDpi) * DEFAULT_VALUES.MM_PER_INCH);
  }

  pixelsToInches(pixels: number, dpi?: number): number {
    const currentDpi = dpi || this.getCurrentDimensions().DPI;
    return pixels / currentDpi;
  }

  getPaperSizes() {
    return { ...this.paperSizes };
  }

  setPaperSize(sizeName: string): void {
    const currentDimensions = this.getCurrentDimensions();
    
    if (this.paperSizes[sizeName]) {
      const updatedDimensions = {
        ...currentDimensions,
        selectedPaperSize: sizeName
      };
      
      this.updateDimensionsForPaperSize(updatedDimensions);
    } else {
      console.error(`Attempted to set invalid paper size: ${sizeName}`);
    }
  }

  setPaperOrientation(orientation: PaperOrientation): void {
    const currentDimensions = this.getCurrentDimensions();
    
    if (currentDimensions.paperOrientation !== orientation) {
      const updatedDimensions = {
        ...currentDimensions,
        paperOrientation: orientation
      };
      
      this.updateDimensionsForPaperSize(updatedDimensions);
    }
  }

  setDPI(dpi: number): void {
    if (dpi > 0 && dpi <= 1200) {
      const currentDimensions = this.getCurrentDimensions();
      const updatedDimensions = {
        ...currentDimensions,
        DPI: dpi
      };
      
      this.updateDimensionsForPaperSize(updatedDimensions);
    }
  }

  setCustomDimensions(widthMm: number, heightMm: number): void {
    const currentDimensions = this.getCurrentDimensions();
    
    // Ensure inputs are treated as valid numbers
    const newWidthMm = Math.max(10, Number(widthMm) || 10);
    const newHeightMm = Math.max(10, Number(heightMm) || 10);

    // Convert mm back to inches to update the source of truth
    const newWidthInches = this.mmToInches(newWidthMm);
    const newHeightInches = this.mmToInches(newHeightMm);

    let pageWidthInches: number;
    let pageHeightInches: number;

    // Update the inch properties (respecting orientation)
    if (currentDimensions.paperOrientation === 'portrait') {
      pageWidthInches = newWidthInches;
      pageHeightInches = newHeightInches;
    } else { // Landscape
      pageWidthInches = newHeightInches; // Assign swapped values
      pageHeightInches = newWidthInches;
    }

    // Update the 'Custom' entry in the paper sizes
    this.paperSizes['Custom'] = { width: pageWidthInches, height: pageHeightInches };

    const updatedDimensions = {
      ...currentDimensions,
      selectedPaperSize: 'Custom',
      pageWidthInches,
      pageHeightInches,
      canvasWidthMm: newWidthMm,
      canvasHeightMm: newHeightMm
    };

    this.updateDimensionsForPaperSize(updatedDimensions);
  }

  private updateDimensionsForPaperSize(dimensions: EditorDimensions): void {
    let baseWidthInches = dimensions.pageWidthInches;
    let baseHeightInches = dimensions.pageHeightInches;

    const selectedSizePreset = this.paperSizes[dimensions.selectedPaperSize];
    if (dimensions.selectedPaperSize !== 'Custom' && selectedSizePreset) {
      baseWidthInches = selectedSizePreset.width;
      baseHeightInches = selectedSizePreset.height;
    } else if (dimensions.selectedPaperSize === 'Custom') {
      this.paperSizes['Custom'] = { width: baseWidthInches, height: baseHeightInches };
    }

    let displayWidthInches = baseWidthInches;
    let displayHeightInches = baseHeightInches;
    if (dimensions.paperOrientation === 'landscape') {
      [displayWidthInches, displayHeightInches] = [displayHeightInches, displayWidthInches];
    }

    const canvasWidth = this.inchesToPixels(displayWidthInches, dimensions.DPI);
    const canvasHeight = this.inchesToPixels(displayHeightInches, dimensions.DPI);
    const canvasWidthMm = this.inchesToMm(displayWidthInches);
    const canvasHeightMm = this.inchesToMm(displayHeightInches);

    const updatedDimensions: EditorDimensions = {
      ...dimensions,
      pageWidthInches: baseWidthInches,
      pageHeightInches: baseHeightInches,
      canvasWidth,
      canvasHeight,
      canvasWidthMm,
      canvasHeightMm
    };

    this.dimensionsSubject.next(updatedDimensions);
  }

  // Load dimensions from canvas state
  loadDimensionsFromState(state: any): void {
    if (state && state.canvas) {
      const config = state.canvas;
      
      const updatedDimensions: EditorDimensions = {
        ...this.getCurrentDimensions(),
        DPI: config.dpi || DEFAULT_VALUES.DPI,
        selectedPaperSize: config.paper_size || DEFAULT_VALUES.SELECTED_PAPER_SIZE,
        paperOrientation: config.orientation || DEFAULT_VALUES.PAPER_ORIENTATION,
        pageWidthInches: config.width_inches,
        pageHeightInches: config.height_inches
      };

      // Update the 'Custom' entry if necessary
      if (updatedDimensions.selectedPaperSize === 'Custom') {
        this.paperSizes['Custom'] = { 
          width: updatedDimensions.pageWidthInches, 
          height: updatedDimensions.pageHeightInches 
        };
      }

      this.updateDimensionsForPaperSize(updatedDimensions);
    }
  }

  getCanvasConfig() {
    const dimensions = this.getCurrentDimensions();
    return {
      widthInches: dimensions.pageWidthInches,
      heightInches: dimensions.pageHeightInches,
      paperSize: dimensions.selectedPaperSize,
      orientation: dimensions.paperOrientation,
      dpi: dimensions.DPI
    };
  }
} 