import { Component, OnInit } from '@angular/core';
import Konva from 'konva';
import { BasePlaceholderComponent } from '../base-placeholder/base-placeholder.component';
import { PlaceholderService } from '../../services/placeholder.service';

@Component({
  selector: 'app-text-placeholder',
  template: '',
})
export class TextPlaceholderComponent extends BasePlaceholderComponent implements OnInit {
  protected placeholderType = 'text';
  public placeholderGroup!: Konva.Group;
  private textNode!: Konva.Text;

  // Configuration constants for placeholder text constraints
  private readonly PLACEHOLDER_MIN_WIDTH = 80;  // Minimum width in pixels
  private readonly PLACEHOLDER_MIN_HEIGHT = 30; // Minimum height in pixels

  constructor(placeholderService: PlaceholderService) {
    super(placeholderService);
  }

  override ngOnInit(): void {
    if (this.layer && this.position && this.placeholderId) {
      this.createPlaceholder();
    } else {
      console.error('TextPlaceholderComponent: Missing required inputs.');
    }
  }

  override createPlaceholder(): void {
    console.log('Creating text placeholder for ID:', this.placeholderId);
    this.setupPlaceholderGroup();
    this.addTextPlaceholderElements();
    this.setupGroupEventListeners();
    this.addToLayerAndEmit();
  }

  private setupPlaceholderGroup(): void {
    if (!this.position || !this.placeholderId) {
      console.error('Position or placeholderId not provided for group setup');
      return;
    }

    this.placeholderGroup = new Konva.Group({
      x: this.position.x,
      y: this.position.y,
      width: this.position.width || 200, // Smaller default, will be auto-sized
      height: this.position.height || 50,
      draggable: true,
      name: 'placeholder-group',
    });

    // Set the same attributes as the base component would
    const parts = this.placeholderId.split('.');
    const attrs: any = {
      'placeholderId': this.placeholderId,
      'placeholderState': this.placeholderService.getPlaceholderStates().ORIGINAL,
      'componentType': this.constructor.name,
      'placeholderWidth': this.position.width || 100, // Smaller default
      'placeholderHeight': this.position.height || 50,
    };
    if (parts.length === 2) {
      attrs['placeholderType'] = parts[0];
      attrs['placeholderField'] = parts[1];
    }
    this.placeholderGroup.setAttrs(attrs);

    // Set the placeholderImage to the group for compatibility with base component
    this.placeholderImage = this.placeholderGroup as any;

    // Initialize state
    this.state = {
      width: this.position.width || 100, // Smaller default
      height: this.position.height || 50,
      x: this.position.x,
      y: this.position.y,
      ...this.state // Preserve any existing state
    };
  }

  private addTextPlaceholderElements(): void {
    if (!this.placeholderGroup) {
      console.error("Placeholder group not initialized before adding elements.");
      return;
    }

    const sampleValue = this.placeholderService.getPlaceholderSampleValue(this.placeholderId);
    const displayText = this.state?.text || sampleValue || 'Sample Text';

    this.textNode = new Konva.Text({
      text: displayText,
      fontSize: this.state?.fontSize || this.state?.font_size || 16,
      fontFamily: this.state?.fontFamily || this.state?.font_family || 'Arial',
      fontStyle: this.state?.fontStyle || this.state?.font_style || 'normal',
      fill: this.getTextColor(displayText),
      align: this.state?.align || 'left',
      padding: this.state?.padding || 8,
      wrap: this.state?.wrap !== false ? 'word' : 'none',
      ellipsis: this.state?.ellipsis || false,
      name: 'placeholder-text',
      width: this.placeholderGroup.width(),
      x: 0,
      y: 0,
    });
    
    this.placeholderGroup.add(this.textNode);
    this.autoAdjustGroupSize();
    this.updateState();
  }

  private getTextColor(displayText: string): string {
    // Check if we have a saved color first
    if (this.state?.fill) {
      return this.state.fill;
    }

    // Apply specific styling for status fields based on sample value
    if (this.placeholderId && this.placeholderId.toLowerCase().includes('status')) {
      if (displayText.includes('✓')) {
        return '#28a745'; // Green for passing/good status
      } else if (displayText.includes('✗')) {
        return '#dc3545'; // Red for failing/bad status
      }
    }

    return '#000000'; // Default black
  }

  private autoAdjustGroupSize(): void {
    if (!this.textNode || !this.placeholderGroup) return;

    // Create a temporary text node to measure the actual text width
    const tempText = new Konva.Text({
      text: this.textNode.text(),
      fontSize: this.textNode.fontSize(),
      fontFamily: this.textNode.fontFamily(),
      fontStyle: this.textNode.fontStyle(),
      padding: this.textNode.padding() || 8,
      wrap: 'none', // No wrapping for width measurement
    });

    // Add to layer temporarily to get accurate measurements
    this.layer.add(tempText);
    tempText.hide(); // Hide it so it's not visible
    
    // Get the actual width needed for the text content
    const textWidth = tempText.width();
    const padding = this.textNode.padding() || 8;
    
    // Remove the temporary text node
    tempText.destroy();
    
    // Calculate final width with padding (left + right padding)
    const calculatedWidth = textWidth + (padding * 2);
    
    // Apply minimum width to ensure placeholder is not too narrow
    const finalWidth = Math.max(calculatedWidth, this.PLACEHOLDER_MIN_WIDTH);
    
    // Update text node width to the calculated width
    this.textNode.width(finalWidth);
    
    // For height calculation, we need to account for text wrapping within the new width
    // Create another temporary text with the final width to measure wrapped height
    const tempTextForHeight = new Konva.Text({
      text: this.textNode.text(),
      fontSize: this.textNode.fontSize(),
      fontFamily: this.textNode.fontFamily(),
      fontStyle: this.textNode.fontStyle(),
      padding: this.textNode.padding() || 8,
      width: finalWidth,
      wrap: 'word',
    });

    this.layer.add(tempTextForHeight);
    tempTextForHeight.hide();
    
    const wrappedHeight = tempTextForHeight.height();
    tempTextForHeight.destroy();
    
    const finalHeight = Math.max(wrappedHeight, this.PLACEHOLDER_MIN_HEIGHT);

    // Update text node height
    this.textNode.height(finalHeight);

    // Update group dimensions
    this.placeholderGroup.width(finalWidth);
    this.placeholderGroup.height(finalHeight);
    
    // Update state
    this.state.width = finalWidth;
    this.state.height = finalHeight;
    
    // Update attributes
    this.placeholderGroup.setAttr('placeholderWidth', this.state.width);
    this.placeholderGroup.setAttr('placeholderHeight', this.state.height);
    
    // Update position object
    if (this.position) {
      this.position.width = this.state.width;
      this.position.height = this.state.height;
    }
    
    console.log(`Placeholder ${this.placeholderId} auto-adjusted to ${finalWidth}x${finalHeight} (font size: ${this.textNode.fontSize()}px)`);
    
    this.layer?.batchDraw();
  }

  private updateState(): void {
    if (!this.textNode) return;

    // Update component state with current text node properties
    this.state.text = this.textNode.text();
    this.state.fontSize = this.textNode.fontSize();
    this.state.fontFamily = this.textNode.fontFamily();
    this.state.fontStyle = this.textNode.fontStyle();
    this.state.fill = this.textNode.fill();
    this.state.align = this.textNode.align();
    this.state.padding = this.textNode.padding();
    this.state.wrap = this.textNode.wrap();
    
    // Update group attributes for serialization
    this.placeholderGroup.setAttr('textContent', this.state.text);
    this.placeholderGroup.setAttr('fontSize', this.state.fontSize);
    this.placeholderGroup.setAttr('fontFamily', this.state.fontFamily);
    this.placeholderGroup.setAttr('fontStyle', this.state.fontStyle);
    this.placeholderGroup.setAttr('textColor', this.state.fill);
  }

  private setupGroupEventListeners(): void {
    if (!this.placeholderGroup) return;

    this.placeholderGroup.on('click tap', () => {
      this.placeholderSelected.emit(this.placeholderGroup as any);
      if (this.transformer) {
        this.transformer.nodes([this.placeholderGroup]);
        this.transformer.getLayer()?.batchDraw();
      }
    });

    this.placeholderGroup.on('dblclick dbltap', (e) => {
      e.evt.preventDefault();
      this.showPlaceholderInfoDialog();
    });

    // Handle transform events
    this.placeholderGroup.on('transformend', (e) => {
      const newWidth = e.target.width() * e.target.scaleX();
      const newHeight = e.target.height() * e.target.scaleY();
      
      // Update the component's internal state
      this.state.width = newWidth;
      this.state.height = newHeight;

      // Update group dimensions and reset scale
      this.placeholderGroup.width(newWidth);
      this.placeholderGroup.height(newHeight);
      this.placeholderGroup.scaleX(1);
      this.placeholderGroup.scaleY(1);

      // Update text node width and recalculate height
      if (this.textNode) {
        this.textNode.width(newWidth);
        // The text will automatically adjust its height based on content and wrapping
      }

      // Update position object
      if (this.position) {
        this.position.width = newWidth;
        this.position.height = newHeight;
      }
      
      // Update attributes
      this.placeholderGroup.setAttr('placeholderWidth', newWidth);
      this.placeholderGroup.setAttr('placeholderHeight', newHeight);
      
      this.layer.batchDraw();
    });

    this.placeholderGroup.on('dragend', () => {
      if (this.position) {
        this.position.x = this.placeholderGroup.x();
        this.position.y = this.placeholderGroup.y();
        this.state.x = this.position.x;
        this.state.y = this.position.y;
        console.log(`Placeholder ${this.placeholderId} drag ended at:`, this.position.x, this.position.y);
      }
    });

    // Ensure draggability
    setTimeout(() => {
      if (this.placeholderGroup) {
        this.placeholderGroup.draggable(true);
        this.layer?.batchDraw();
      }
    }, 50);
  }

  protected override addToLayerAndEmit(): void {
    if (!this.placeholderGroup || !this.layer) return;
    this.layer.add(this.placeholderGroup);
    this.layer.batchDraw();
    // Emit the group as if it were an image for compatibility
    this.placeholderCreated.emit(this.placeholderGroup as any);
  }

  // Public methods for updating text properties
  public updateTextProperty(property: string, value: any): void {
    if (!this.textNode) return;

    switch (property) {
      case 'fontSize':
      case 'font_size':
        this.textNode.fontSize(value);
        this.state.fontSize = value;
        // Font size changes should trigger width adjustment
        this.autoAdjustGroupSize();
        break;
      case 'fontFamily':
      case 'font_family':
        this.textNode.fontFamily(value);
        this.state.fontFamily = value;
        // Font family changes should trigger width adjustment
        this.autoAdjustGroupSize();
        break;
      case 'fontStyle':
      case 'font_style':
        this.textNode.fontStyle(value);
        this.state.fontStyle = value;
        // Font style changes should trigger width adjustment
        this.autoAdjustGroupSize();
        break;
      case 'fill':
      case 'color':
        this.textNode.fill(value);
        this.state.fill = value;
        break;
      case 'text':
        this.textNode.text(value);
        this.state.text = value;
        // Text content changes should trigger width adjustment
        this.autoAdjustGroupSize();
        break;
      case 'align':
        this.textNode.align(value);
        this.state.align = value;
        break;
    }

    this.updateState();
    this.layer?.batchDraw();
  }

  // Getter for the text node (useful for direct manipulation)
  public getTextNode(): Konva.Text | null {
    return this.textNode || null;
  }

  protected override showPlaceholderInfoDialog(): void {
    alert(`Placeholder Info:\nID: ${this.placeholderId}\nType: ${this.placeholderGroup.getAttr('placeholderType')}\nField: ${this.placeholderGroup.getAttr('placeholderField')}\nSample: ${this.placeholderService.getPlaceholderSampleValue(this.placeholderId)}`);
  }
}
