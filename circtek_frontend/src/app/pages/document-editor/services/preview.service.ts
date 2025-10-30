import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Konva from 'konva';
import { PLACEHOLDER_STATES, SAMPLE_PLACEHOLDER_DATA, TEXT_EDITOR_CONFIG } from '../constants/editor.constants';
import { PlaceholderService } from '../placeholders/services/placeholder.service';

@Injectable({
  providedIn: 'root'
})
export class PreviewService {
  private isPreviewModeSubject = new BehaviorSubject<boolean>(false);
  public isPreviewMode$ = this.isPreviewModeSubject.asObservable();

  private originalNodeStates = new Map<string, string>();

  constructor(private placeholderService: PlaceholderService) {}

  get isPreviewMode(): boolean {
    return this.isPreviewModeSubject.value;
  }

  togglePreviewMode(layer: Konva.Layer): void {
    const newPreviewMode = !this.isPreviewMode;
    this.isPreviewModeSubject.next(newPreviewMode);
    
   
    
    if (newPreviewMode) {
      this.showPlaceholderPreviewValues(layer);
    } else {
      this.restorePlaceholderOriginalTexts(layer);
    }
  }

  private showPlaceholderPreviewValues(layer: Konva.Layer): void {
   
    this.originalNodeStates.clear();

    // Handle Placeholders
    const placeholderNodes = layer.find('Text[name="placeholder"]');
   

    placeholderNodes.forEach((textNode: Konva.Node) => {
      if (!(textNode instanceof Konva.Text)) return;
      
      const placeholderId = textNode.attrs.placeholderId;
      const nodeID = String(textNode._id);

      if (placeholderId) {
        // Store original text
        this.originalNodeStates.set(nodeID, textNode.text());

        // Store original style and fill
        const originalFontStyle = textNode.fontStyle() || 'italic';
        const originalFill = String(textNode.fill() || '#3a86ff');
        this.originalNodeStates.set(`${nodeID}_style`, originalFontStyle);
        this.originalNodeStates.set(`${nodeID}_fill`, originalFill);

        // Store original state
        const originalState = textNode.attrs.placeholderState || PLACEHOLDER_STATES.ORIGINAL;
        this.originalNodeStates.set(`${nodeID}_state`, originalState);

        // Update the placeholder state to preview
        this.setPlaceholderState(textNode, PLACEHOLDER_STATES.PREVIEW);

        // Get sample value
        let sampleValue: string;
        if (SAMPLE_PLACEHOLDER_DATA[placeholderId]) {
          sampleValue = SAMPLE_PLACEHOLDER_DATA[placeholderId];
        } else {
          sampleValue = this.placeholderService.getPlaceholderSampleValue(placeholderId);
        }

        // Replace the placeholder text with the sample value
        textNode.text(sampleValue);

        // Change text styling to look like regular text
        textNode.fontStyle('normal');
        textNode.fill('#333333');

       
      }
    });

    // Handle Regular Text Nodes
    const textNodes = layer.find('Text[name="text"]');
   

    textNodes.forEach((textNode: Konva.Node, index: number) => {
      if (!(textNode instanceof Konva.Text)) return;
      
      const nodeID = String(textNode._id);
      // Store the original text for every text node
      this.originalNodeStates.set(nodeID, textNode.text());

      // Choose a sample text based on the node's index
      const sampleText = TEXT_EDITOR_CONFIG.SAMPLE_TEXTS[index % TEXT_EDITOR_CONFIG.SAMPLE_TEXTS.length];
      textNode.text(sampleText);
    });

    layer.batchDraw();
  }

  private restorePlaceholderOriginalTexts(layer: Konva.Layer): void {
   

    // Combine both placeholder and regular text nodes for iteration
    const allTextNodes = layer.find('Text');

    allTextNodes.forEach((textNode: Konva.Node) => {
      if (!(textNode instanceof Konva.Text)) return;
      
      const nodeID = String(textNode._id);

      // Restore original text if it was stored
      if (this.originalNodeStates.has(nodeID)) {
        textNode.text(this.originalNodeStates.get(nodeID)!);
      }

      // Restore original styles only for placeholders (if stored)
      if (textNode.name() === 'placeholder') {
        const originalStyle = this.originalNodeStates.get(`${nodeID}_style`);
        const originalFill = this.originalNodeStates.get(`${nodeID}_fill`);
        const originalState = this.originalNodeStates.get(`${nodeID}_state`);

        if (originalStyle) {
          textNode.fontStyle(originalStyle);
        }
        if (originalFill) {
          textNode.fill(originalFill);
        }
        if (originalState) {
          textNode.attrs.placeholderState = originalState;
        } else {
          // Default to original state if not stored
          textNode.attrs.placeholderState = PLACEHOLDER_STATES.ORIGINAL;
        }
        
       
      }
    });

    this.originalNodeStates.clear();
    layer.batchDraw();
  }

  private setPlaceholderState(node: Konva.Node, state: string): void {
    if (node && node.attrs) {
      node.attrs.placeholderState = state;
    }
  }

  // Helper methods for placeholder management
  getPlaceholderId(node: Konva.Node): string | null {
    if (node && node.attrs && node.attrs.placeholderId) {
      return node.attrs.placeholderId;
    }
    return null;
  }

  getPlaceholderState(node: Konva.Node): string | null {
    if (node && node.attrs && node.attrs.placeholderState) {
      return node.attrs.placeholderState;
    }
    return null;
  }

  getPlaceholderType(node: Konva.Node): string | null {
    if (node && node.attrs && node.attrs.placeholderType) {
      return node.attrs.placeholderType;
    }
    return null;
  }

  getPlaceholderField(node: Konva.Node): string | null {
    if (node && node.attrs && node.attrs.placeholderField) {
      return node.attrs.placeholderField;
    }
    return null;
  }

  getPlaceholderDisplayText(placeholderId: string | null): string {
    if (!placeholderId) {
      return '<Unknown Placeholder>';
    }
    
    const parts = placeholderId.split('.');
    if (parts.length !== 2) {
      return `<${placeholderId}>`;
    }
    
    const [category, field] = parts;
    return `${field.charAt(0).toUpperCase() + field.slice(1)}`;
  }

  getPlaceholderSampleValue(placeholderId: string | null): string {
    if (!placeholderId) return 'Sample Value';

    // Check if we have a predefined sample value
    if (SAMPLE_PLACEHOLDER_DATA[placeholderId]) {
      return SAMPLE_PLACEHOLDER_DATA[placeholderId];
    }

    // Use the placeholder service to get sample values
    return this.placeholderService.getPlaceholderSampleValue(placeholderId);
  }

  // Cleanup method
  cleanup(): void {
    this.originalNodeStates.clear();
    this.isPreviewModeSubject.next(false);
  }
} 