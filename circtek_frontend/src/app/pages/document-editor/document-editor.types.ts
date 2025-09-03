// src/app/features/document-editor/document-editor.types.ts
export {}; // Ensure this file is treated as a module

// Type definitions for document editor

// Basic structure for paper dimensions in inches
export interface PaperDimensionsInch {
  width: number;
  height: number;
}

// Configuration stored as part of the canvas state
export interface CanvasConfiguration {
  widthInches?: number;     // Source of truth width
  heightInches?: number;    // Source of truth height
  paperSize?: string;       // e.g., 'Label_4x6', 'A4', 'Custom'
  orientation?: 'portrait' | 'landscape';
  dpi?: number;
  width?: number;           // Deprecated - pixel width
  height?: number;          // Deprecated - pixel height
}

// Represents a single node (element) on the canvas
export interface SerializedNode {
  type: string;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  
  // Text specific properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  align?: string;
  padding?: number;
  wrap?: string;
  ellipsis?: boolean;
  
  // Image specific properties
  src?: string;
  isClientLogo?: boolean;
  
  // Placeholder specific properties
  placeholderId?: string;
  placeholderState?: string;
  placeholderType?: string;
  placeholderField?: string;
  sampleValue?: string;
  complexType?: string;
  
  // Shape specific properties
  shapeType?: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number[];
  
  // Complex placeholder children
  children?: any[];
  
  // For any additional attributes
  attrs?: any;
}

// Represents a placeholder managed by an Angular component
export interface SerializedComponentPlaceholder {
  type: string;
  id: string;
  componentType: string;
  placeholderId: string;
  position: PositionData;
  state?: any;
  src?: string | null;
}

// Position data for component placeholders
export interface PositionData {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// Overall structure for the serialized canvas state
export interface SerializedCanvasState {
  version: string;
  timestamp: string;
  canvas: {
    widthInches: number;
    heightInches: number;
    paperSize: string;
    orientation: 'portrait' | 'landscape';
    dpi: number;
    width?: number;  // Legacy support
    height?: number; // Legacy support
  };
  nodes: SerializedNode[];
  componentPlaceholders?: SerializedComponentPlaceholder[];
}

// ==================  V2 Simplified Schema  ==================

export interface CanvasV2 {
  width_inches: number;
  height_inches: number;
  paper_size?: string;
  orientation?: 'portrait' | 'landscape';
  dpi?: number;
  [key: string]: any; // Allow temporary extra fields during migration
}

export interface SerializedNodeV2 {
  id: string;
  node_type: 'text' | 'image' | 'shape' | 'placeholder';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale_x?: number;
  scale_y?: number;

  // Text specific
  text?: string;
  font_size?: number;
  font_family?: string;
  font_style?: string;
  fill?: string;
  align?: string;
  padding?: number;
  wrap?: string;
  ellipsis?: boolean;

  // Image specific
  src?: string;
  is_client_logo?: boolean;

  // Placeholder specific
  placeholder_id?: string;
  component_type?: string; // optional runtime helper
  state?: any;             // include only when necessary
  data?: any;              // duplicate of state field for backward compatibility

  // Shape specific
  shape_type?: string;
  stroke?: string;
  stroke_width?: number;
  points?: number[];

  // Legacy camelCase field retained for internal compatibility during refactor
  type?: string; // to be removed once code exclusively uses node_type
  [key: string]: any; // Allow extra props temporarily
}

export interface CanvasStateV2 {
  version: string;   // "2.0"
  timestamp: string; // ISO-8601
  canvas: CanvasV2;
  nodes: SerializedNodeV2[];
  component_placeholders?: any[]; // transitional field; will be removed when not used
} 