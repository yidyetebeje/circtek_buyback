import { Injectable, ComponentFactoryResolver, ViewContainerRef, Type } from '@angular/core';
import Konva from 'konva';

// Import placeholder component types
import { ImagePlaceholderComponent } from '../components/image-placeholder/image-placeholder.component';
import { TextPlaceholderComponent } from '../components/text-placeholder/text-placeholder.component';
// Base component type
import { BasePlaceholderComponent } from '../components/base-placeholder/base-placeholder.component';

export interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlaceholderFactoryService {

  constructor(private resolver: ComponentFactoryResolver) {}

  createPlaceholder(
    container: ViewContainerRef,
    type: string, // Placeholder ID or component type name
    placeholderId: string,
    src: string | null,
    position: Position,
    layer: Konva.Layer,
    transformer: Konva.Transformer
  ) {
    let componentType: Type<BasePlaceholderComponent>;

    // Determine which component to use based on the placeholder ID
    if (placeholderId.toLowerCase().includes('qrcode') || 
        placeholderId.toLowerCase().includes('barcode') || 
        placeholderId.toLowerCase() === 'client.logo') {
      componentType = ImagePlaceholderComponent;
    } else {
      // Default to text placeholder for other types
      componentType = TextPlaceholderComponent;
    }

    try {
      // Resolve the component factory
      const componentFactory = this.resolver.resolveComponentFactory(componentType);
      // Create the component instance
      const componentRef = container.createComponent(componentFactory);

      // Set input properties for the created component instance
      componentRef.instance.layer = layer;
      componentRef.instance.transformer = transformer;
      componentRef.instance.position = position; // Pass the position object
      componentRef.instance.placeholderId = placeholderId;
      componentRef.instance.src = src;

      console.log(`Created placeholder component: ${componentType.name} for ID: ${placeholderId}`);
      return componentRef;
    } catch (error) {
      console.error(`Error creating placeholder component for ID ${placeholderId}:`, error);
      return null;
    }
  }
} 