import Konva from 'konva';
import { CanvasStateV2, SerializedNodeV2, PositionData } from '../types/editor.types';

/**
 * Utility (non-injectable) service for converting between Konva objects + placeholderRegistry
 * and the lightweight CanvasStateV2 JSON structure.
 */
export class CanvasStateService {
  /** Serialise full editor state to V2 schema  */
  static serialize(
    stage: Konva.Stage,
    layer: Konva.Layer,
    placeholderRegistry: Map<string, any>,
    opts: {
      widthInches: number;
      heightInches: number;
      paperSize: string;
      orientation: 'portrait' | 'landscape';
      dpi: number;
    }
  ): CanvasStateV2 {
    const state: CanvasStateV2 = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      canvas: {
        width_inches: opts.widthInches,
        height_inches: opts.heightInches,
        paper_size: opts.paperSize,
        orientation: opts.orientation,
        dpi: opts.dpi,
      },
      nodes: [],
    };


    // Collect every visible node on the layer except internal editor artefacts
    layer.getChildren(n => {
      const isBackground = n.attrs?.name === 'background';
      const isTransformer = n instanceof Konva.Transformer;
      return !(isBackground || isTransformer);
    }).forEach(node => {
      const sn = CanvasStateService.nodeToV2(node);
      if (sn) {
        state.nodes.push(sn);
      }

    });

    return state;
  }

  /** Convert a single Konva node into SerializedNodeV2 (or null if unsupported) */
  static nodeToV2(node: Konva.Node): SerializedNodeV2 | null {
    switch (node.name()) {
      case 'text': {
        const t = node as Konva.Text;
        return {
          id: t.id(),
          node_type: 'text',
          x: t.x(),
          y: t.y(),
          width: t.width(),
          height: t.height(),
          text: t.text(),
          font_size: t.fontSize(),
          font_family: t.fontFamily(),
          font_style: t.fontStyle(),
          fill: t.fill() as string,
          align: t.align(),
          padding: t.padding(),
          wrap: t.wrap(),
          ellipsis: t.ellipsis(),
          rotation: t.rotation(),
          scale_x: t.scaleX(),
          scale_y: t.scaleY(),
        };
      }
      case 'image': {
        const img = node as Konva.Image;
        return {
          id: img.id(),
          node_type: 'image',
          x: img.x(),
          y: img.y(),
          width: img.width(),
          height: img.height(),
          src: img.attrs.src,
          is_client_logo: img.attrs.isClientLogo === true,
          rotation: img.rotation(),
          scale_x: img.scaleX(),
          scale_y: img.scaleY(),
        };
      }
      case 'shape': {
        const sh = node as Konva.Shape;
        return {
          id: sh.id(),
          node_type: 'shape',
          x: sh.x(),
          y: sh.y(),
          width: sh.width(),
          height: sh.height(),
          shape_type: sh.attrs.shapeType,
          fill: sh.fill() as string,
          stroke: sh.stroke() as string,
          stroke_width: sh.strokeWidth(),
          points: sh instanceof Konva.Line ? sh.points() : undefined,
          rotation: sh.rotation(),
          scale_x: sh.scaleX(),
          scale_y: sh.scaleY(),
        };
      }

      default: {
        if (node.name()?.includes('placeholder')) {
          // Handle legacy placeholder nodes (simple text nodes with placeholder name)
          if (node instanceof Konva.Text) {
            return {
              id: node.id(),
              node_type: 'placeholder',
              x: node.x(),
              y: node.y(),
              width: node.width(),
              height: node.height(),
              placeholder_id: node.attrs.placeholderId,
              component_type: node.attrs.componentType,
              rotation: node.rotation(),
              scale_x: node.scaleX(),
              scale_y: node.scaleY(),
              // For legacy text placeholders, include text styling directly
              text: node.text(),
              font_size: node.fontSize(),
              font_family: node.fontFamily(),
              font_style: node.fontStyle(),
              fill: node.fill() as string,
              align: node.align(),
              padding: node.padding(),
              wrap: node.wrap(),
              ellipsis: node.ellipsis(),
            };
          } else if (node instanceof Konva.Image) {
            // Handle new simplified image-based placeholders
            const img = node as Konva.Image;
            const base: SerializedNodeV2 = {
              id: img.id(),
              node_type: 'placeholder',
              x: img.x(),
              y: img.y(),
              width: img.width(),
              height: img.height(),
              placeholder_id: img.attrs.placeholderId,
              component_type: img.attrs.componentType,
              rotation: img.rotation(),
              scale_x: img.scaleX(),
              scale_y: img.scaleY(),
            };

            // Extract state from image attributes
            const state: any = {
              width: img.width(),
              height: img.height(),
              x: img.x(),
              y: img.y(),
            };

            // Extract placeholder-specific state from attributes
            const placeholderId = img.attrs.placeholderId;
            if (placeholderId) {
              // Text placeholder state
              if (img.attrs.textContent) {
                state.text = img.attrs.textContent;
                state.fontSize = img.attrs.fontSize;
                state.fontFamily = img.attrs.fontFamily;
                state.fill = img.attrs.textColor;
              }
              
              // QR Code specific state
              if (placeholderId.toLowerCase().includes('qrcode')) {
                state.qrData = img.attrs.qrData;
              }
              // Barcode specific state
              else if (placeholderId.toLowerCase().includes('barcode')) {
                state.barcodeData = img.attrs.barcodeData;
                state.barcodeFormat = img.attrs.barcodeFormat;
              }
              // Logo specific state
              else if (placeholderId.toLowerCase() === 'client.logo') {
                state.isClientLogo = img.attrs.isClientLogo;
                state.src = img.attrs.logoSrc;
              }
            }

            base.state = state;
            base['data'] = state; // Add data field for backward compatibility
            return base;
          } else {
            // Handle other legacy placeholder types (Groups)
            // Basic placeholder info common to all placeholder node types
            const base: SerializedNodeV2 = {
              id: node.id(),
              node_type: 'placeholder',
              x: node.x(),
              y: node.y(),
              width: node.width(),
              height: node.height(),
              placeholder_id: node.attrs.placeholderId,
              component_type: node.attrs.componentType,
              rotation: node.rotation(),
              scale_x: node.scaleX(),
              scale_y: node.scaleY(),
            };

            /*
             * NEW: Persist styling information for component-based placeholders
             * (e.g., TextPlaceholderComponent, ImagePlaceholderComponent) by extracting
             * the primary content nodes inside the placeholder group.
             * This allows properties such as font size, family, style and fill
             * colour – edited at runtime – to survive a save/reload cycle.
             */
            if (node instanceof Konva.Group) {
              const textChild = node.findOne((n: Konva.Node) => n.name() === 'placeholder-text' && n instanceof Konva.Text) as Konva.Text | undefined;
              const imageChild = node.findOne((n: Konva.Node) => n.name() === 'placeholder-image' && n instanceof Konva.Image) as Konva.Image | undefined;

              const state: any = {
                // Always save current dimensions – other components (logo, QR, etc.) rely on these
                width: node.width(),
                height: node.height(),
                // Save position for restoration
                x: node.x(),
                y: node.y(),
              };

              // Handle text placeholder state
              if (textChild) {
                // Copy relevant text styling so that it can be reapplied on load
                state.text = textChild.text();
                state.font_size = textChild.fontSize();
                state.font_family = textChild.fontFamily();
                state.font_style = textChild.fontStyle();
                state.fill = textChild.fill();
                state.align = textChild.align();
                state.padding = textChild.padding();
                state.wrap = textChild.wrap();
                state.ellipsis = textChild.ellipsis();
              }

              // Handle image placeholder state  
              if (imageChild) {
                state.src = imageChild.attrs.src;
                
                // Preserve image-specific state from component if available
                const placeholderId = node.attrs.placeholderId;
                if (placeholderId) {
                  // QR Code specific state
                  if (placeholderId.toLowerCase().includes('qrcode')) {
                    state.qrData = node.attrs.qrData || state.qrData;
                  }
                  // Barcode specific state
                  else if (placeholderId.toLowerCase().includes('barcode')) {
                    state.barcodeData = node.attrs.barcodeData || state.barcodeData;
                    state.barcodeFormat = node.attrs.barcodeFormat || state.barcodeFormat;
                  }
                  // Logo specific state
                  else if (placeholderId.toLowerCase() === 'client.logo') {
                    state.isClientLogo = true;
                  }
                }
              }

              base.state = state;
              base['data'] = state; // Add data field for backward compatibility
            }

            return base;
          }
        }
        return null;
      }
    }
  }
} 