export interface PaperDimensionsInch {
  width: number;
  height: number;
}

export interface PositionData {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface SerializedNodeV2 {
  [key: string]: any; // Add index signature for dynamic property access
  node_type: string;
  type?: string; // Add legacy type property
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale_x?: number;
  scale_y?: number;
  scaleX?: number;
  scaleY?: number;
  text?: string;
  font_size?: number;
  fontSize?: number;
  font_family?: string;
  fontFamily?: string;
  font_style?: string;
  fontStyle?: string;
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  strokeWidth?: number;
  align?: string;
  padding?: number;
  wrap?: string;
  ellipsis?: boolean;
  src?: string;
  is_client_logo?: boolean;
  isClientLogo?: boolean;
  placeholder_id?: string;
  placeholderId?: string;
  shape_type?: string;
  shapeType?: string;
  points?: number[];
  state?: any;
  data?: any;
  componentType?: string;
  component_type?: string;
  id?: string;
  position?: PositionData;
}

export interface CanvasConfigV2 {
  width_inches: number;
  height_inches: number;
  paper_size: string;
  orientation: 'portrait' | 'landscape';
  dpi: number;
}

export interface CanvasStateV2 {
  version: string;
  timestamp?: string;
  canvas: CanvasConfigV2;
  nodes: SerializedNodeV2[];
}

export interface DocumentFormData {
  name: string;
  description: string;
  is_published: boolean;
  clientId?: number;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed';
}

export interface PlaceholderStates {
  ORIGINAL: string;
  PREVIEW: string;
}

export interface EditorDimensions {
  canvasWidth: number;
  canvasHeight: number;
  canvasWidthMm: number;
  canvasHeightMm: number;
  pageWidthInches: number;
  pageHeightInches: number;
  DPI: number;
  selectedPaperSize: string;
  paperOrientation: 'portrait' | 'landscape';
}

export interface DragDropState {
  draggedItemType: string | null;
  draggedPlaceholderId: string | null;
}

export interface ListLayoutState {
  isListModeActive: boolean;
  listSelectedNodes: any[];
  listOrientation: 'horizontal' | 'vertical';
  listSeparator: number; // Pixel spacing
  currentListGroup: any | null;
  isIndividualSelection: boolean;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export interface TextEditorConfig {
  originalText: string;
  originalWidth: number;
  originalHeight: number;
  originalFontWeight: string;
  originalFontSize: number;
  originalColor: string;
}

export interface TooltipElement extends HTMLDivElement {
  // Extend HTMLDivElement for tooltip specific properties if needed
}

export type ShapeType = 'filled-rectangle' | 'outlined-rectangle' | 'line';
export type PaperOrientation = 'portrait' | 'landscape';
export type EditorContextType = 'text' | 'image' | 'placeholder' | 'shape' | 'none'; 