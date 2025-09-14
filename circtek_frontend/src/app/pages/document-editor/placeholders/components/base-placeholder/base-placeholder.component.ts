import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import Konva from 'konva';
import { PlaceholderService } from '../../services/placeholder.service'; // Corrected path
import { Position } from '../../services/placeholder-factory.service'; // Corrected path
import { KonvaEventObject } from 'konva/lib/Node'; // Import the event type

@Component({
  selector: 'app-base-placeholder', // Use a generic selector or make this abstract
  template: '', // Base component usually has no template
  // No styleUrls needed for base component
})
export class BasePlaceholderComponent implements OnInit {
  @Input() layer!: Konva.Layer;
  @Input() transformer!: Konva.Transformer;
  @Input() position!: Position;
  @Input() placeholderId!: string;
  @Input() src: string | null = null; // For image-based placeholders like Logo

  @Output() placeholderCreated = new EventEmitter<Konva.Image>();
  @Output() placeholderSelected = new EventEmitter<Konva.Image>();

  public placeholderImage!: Konva.Image;
  // State property for serialization/deserialization
  public state: any = {}; // Use 'any' for flexibility or define a specific State interface

  constructor(public placeholderService: PlaceholderService) {}

  ngOnInit(): void {
    // Base implementation to be overridden by subclasses
    if (this.layer && this.position && this.placeholderId) {
      // Subclasses should call their specific create method here
      // this.createPlaceholder(); // Example - subclasses will implement
    } else {
        console.error('BasePlaceholderComponent: Missing required inputs (layer, position, or placeholderId)');
    }
  }

  // Method to be implemented by subclasses
  createPlaceholder(): void {
    // Example implementation - subclasses must provide their own
     console.warn('createPlaceholder() must be implemented by subclasses.');
     this.setupPlaceholderImage(); // Common setup
     // Add specific elements in subclass
     this.setupEventListeners(); // Common setup
     this.addToLayerAndEmit(); // Common setup
  }

  // Common setup for the Konva Image
  protected setupPlaceholderImage(): void {
    if (!this.position || !this.placeholderId) {
      console.error('Position or placeholderId not provided for image setup');
      return;
    }

    this.placeholderImage = new Konva.Image({
      x: this.position.x,
      y: this.position.y,
      width: this.position.width, // Use initial width from position
      height: this.position.height, // Use initial height from position
      draggable: true,
      name: 'placeholder', // Use a consistent name for component-based placeholders
      image: undefined // Will be set by subclasses
    });
  

    // Parse placeholder ID and set attributes
    const parts = this.placeholderId.split('.');
    const attrs: any = {
      'placeholderId': this.placeholderId,
      'placeholderState': this.placeholderService.getPlaceholderStates().ORIGINAL,
      'componentType': this.constructor.name, // Store the component type name
       // Initialize dimensions attributes based on position
      'placeholderWidth': this.position.width || 200, // Default if not set
      'placeholderHeight': this.position.height || 100, // Default if not set
    };
    if (parts.length === 2) {
      attrs['placeholderType'] = parts[0];
      attrs['placeholderField'] = parts[1];
    } else {
        console.warn('Invalid placeholderId format:', this.placeholderId);
    }
    this.placeholderImage.setAttrs(attrs);
  }

  // Common event listeners
  protected setupEventListeners(): void {
    if (!this.placeholderImage) return;

    this.placeholderImage.on('click tap', () => {
      this.placeholderSelected.emit(this.placeholderImage);
      if (this.transformer) {
        this.transformer.nodes([this.placeholderImage]);
        this.transformer.getLayer()?.batchDraw();
      }
    });

    // Explicitly type the event object
    this.placeholderImage.on('dblclick dbltap', (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        // Prevent default browser actions and Konva's default dblclick behavior if needed
        e.evt.preventDefault();
        this.showPlaceholderInfoDialog();
    });

    // Handle transform events to update dimension attributes
    
    // After transform, reset scales and adjust actual sizes stored in state
    this.placeholderImage.on('transformend', (e) => {
        console.log('transformend called', e);
        const newWidth = e.target.width() * e.target.scaleX();
        const newHeight = e.target.height() * e.target.scaleY();
        console.log('newWidth', newWidth);
        console.log('newHeight', newHeight);
        console.log("oldWidth", this.state.width);
        console.log("oldHeight", this.state.height);
        
        // Update the component's internal state
        this.state.width = newWidth;
        this.state.height = newHeight;

        // Update Konva node dimensions and reset scale
        this.placeholderImage.width(newWidth);
        this.placeholderImage.height(newHeight);
        this.placeholderImage.scaleX(1);
        this.placeholderImage.scaleY(1);

        // Update position object
        if (this.position) {
            this.position.width = newWidth;
            this.position.height = newHeight;
        }
        
        // Update attributes for direct access if needed (though state is preferred)
        this.placeholderImage.setAttr('placeholderWidth', newWidth);
        this.placeholderImage.setAttr('placeholderHeight', newHeight);
        
        this.layer.batchDraw();
    });

    this.placeholderImage.on('dragend', () => {
      if (this.position) {
        this.position.x = this.placeholderImage.x();
        this.position.y = this.placeholderImage.y();
        this.state.x = this.position.x; // Update state as well
        this.state.y = this.position.y;
        console.log(`Placeholder ${this.placeholderId} drag ended at:`, this.position.x, this.position.y);
      }
    });

    // Ensure draggability (may need timeout)
    setTimeout(() => {
        if (this.placeholderImage) { // Check if image still exists
             this.placeholderImage.draggable(true);
            this.layer?.batchDraw();
        }
    }, 50);
  }

  // Common method to add image to layer and emit event
  protected addToLayerAndEmit(): void {
    if (!this.placeholderImage || !this.layer) return;
    this.layer.add(this.placeholderImage);
    this.layer.batchDraw();
    this.placeholderCreated.emit(this.placeholderImage);
  }

  // Base transformer event handlers - can be overridden by subclasses
  protected onTransformerTransform(): void {
    // Default implementation - subclasses can override for custom behavior
    console.log(`Transformer transforming placeholder: ${this.placeholderId}`);
  }

  protected onTransformerTransformEnd(): void {
    // Default implementation - subclasses can override for custom behavior
    console.log(`Transformer transform ended for placeholder: ${this.placeholderId}`);
  }

  // Handle double-click - select the element for editing instead of showing alert
  protected showPlaceholderInfoDialog(): void {
    // Instead of showing an alert, trigger selection and emit the event
    this.placeholderSelected.emit(this.placeholderImage);
    if (this.transformer) {
      this.transformer.nodes([this.placeholderImage]);
      this.transformer.getLayer()?.batchDraw();
    }
    // Log for debugging purposes
    console.log(`Placeholder selected for editing - ID: ${this.placeholderId}`);
  }
} 