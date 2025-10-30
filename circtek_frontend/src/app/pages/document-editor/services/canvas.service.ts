import { Injectable, ElementRef, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Konva from 'konva';
import { CanvasStateV2, SerializedNodeV2, EditorDimensions } from '../types/editor.types';
import { TRANSFORMER_CONFIG, CANVAS_STATE_VERSION } from '../constants/editor.constants';
import { DimensionService } from './dimension.service';
import { CanvasStateService } from './canvas-state.service';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private stageSubject = new BehaviorSubject<Konva.Stage | null>(null);
  public stage$ = this.stageSubject.asObservable();

  private layerSubject = new BehaviorSubject<Konva.Layer | null>(null);
  public layer$ = this.layerSubject.asObservable();

  private transformerSubject = new BehaviorSubject<Konva.Transformer | null>(null);
  public transformer$ = this.transformerSubject.asObservable();

  private selectedShapeSubject = new BehaviorSubject<Konva.Node | null>(null);
  public selectedShape$ = this.selectedShapeSubject.asObservable();

  private hasElementsSubject = new BehaviorSubject<boolean>(false);
  public hasElements$ = this.hasElementsSubject.asObservable();

  constructor(
    private dimensionService: DimensionService
  ) {}

  get stage(): Konva.Stage | null {
    return this.stageSubject.value;
  }

  get layer(): Konva.Layer | null {
    return this.layerSubject.value;
  }

  get transformer(): Konva.Transformer | null {
    return this.transformerSubject.value;
  }

  get selectedShape(): Konva.Node | null {
    return this.selectedShapeSubject.value;
  }

  set selectedShape(shape: Konva.Node | null) {
    this.selectedShapeSubject.next(shape);
  }

  get hasElements(): boolean {
    return this.hasElementsSubject.value;
  }

  get dimensions(): DimensionService {
    return this.dimensionService;
  }

  initializeKonva(containerId: string, cdRef: ChangeDetectorRef): boolean {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[initializeKonva] Konva container not found in DOM.');
      return false;
    }

    const dimensions = this.dimensionService.getCurrentDimensions();
    
    // Ensure container has visible dimensions
    container.style.width = `${dimensions.canvasWidth}px`;
    container.style.height = `${dimensions.canvasHeight}px`;
    container.style.display = 'block';
    container.style.margin = '0 auto';
    container.style.backgroundColor = '#eee';

    // Force reflow (may still be 0 during first tick depending on layout timing)
    void container.offsetWidth;

    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      // Proceed anyway using calculated dimensions; we'll update size after first render
      console.warn(`[initializeKonva] Container reported zero size; proceeding with computed dimensions ${dimensions.canvasWidth}x${dimensions.canvasHeight}`);
    } else {
     
    }
    container.style.backgroundColor = '';

    // Create stage
    const stage = new Konva.Stage({
      container: containerId,
      width: dimensions.canvasWidth,
      height: dimensions.canvasHeight,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Create background
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: stage.width(),
      height: stage.height(),
      fill: '#f0f0f0',
      listening: false,
      name: 'background'
    });
    layer.add(background);
    layer.draw();

    // Create transformer
    const transformer = new Konva.Transformer({
      nodes: [],
      keepRatio: false,
      ...TRANSFORMER_CONFIG,
      boundBoxFunc: (oldBoundBox, newBoundBox) => {
        if (newBoundBox.width < 5 || newBoundBox.height < 5) {
          return oldBoundBox;
        }
        return newBoundBox;
      }
    });
    layer.add(transformer);

    // Store references
    this.stageSubject.next(stage);
    this.layerSubject.next(layer);
    this.transformerSubject.next(transformer);

    // Setup stage click handling
    this.setupStageEvents(stage, layer, transformer, background);

   
    cdRef.detectChanges();

    return true;
  }

  private setupStageEvents(
    stage: Konva.Stage, 
    layer: Konva.Layer, 
    transformer: Konva.Transformer, 
    background: Konva.Rect
  ): void {
    stage.on('click tap', (e) => {
      if (e.target === stage || e.target === background) {
        transformer.nodes([]);
        this.selectedShapeSubject.next(null);
        layer.draw();
        return;
      }

      if (e.target.getParent() instanceof Konva.Transformer) {
        return;
      }

      if (e.target !== this.selectedShape) {
        this.selectShape(e.target);
      }
    });
  }

  selectShape(shape: Konva.Node): void {
    const transformer = this.transformer;
    if (!transformer) return;

    // Configure transformer based on shape type
    if (shape.name() === 'shape' && shape.attrs.shapeType === 'line') {
      transformer.enabledAnchors(['middle-left', 'middle-right']);
      transformer.rotateEnabled(true);
    } else {
      transformer.enabledAnchors(TRANSFORMER_CONFIG.enabledAnchors);
      transformer.rotateEnabled(true);
    }

    transformer.nodes([shape]);
    transformer.getLayer()?.batchDraw();
    this.selectedShapeSubject.next(shape);
  }

  deselectShape(): void {
    const transformer = this.transformer;
    if (transformer) {
      transformer.nodes([]);
      this.selectedShapeSubject.next(null);
      this.layer?.draw();
    }
  }

  updateStageSize(): void {
    const stage = this.stage;
    const layer = this.layer;
    if (!stage || !layer) return;

    const dimensions = this.dimensionService.getCurrentDimensions();
    const newWidth = dimensions.canvasWidth;
    const newHeight = dimensions.canvasHeight;

    if (stage.width() !== newWidth || stage.height() !== newHeight) {
      stage.width(newWidth);
      stage.height(newHeight);
      
      // Update background
      const background = layer.findOne('.background') || 
                         layer.findOne((node: Konva.Node) => node.attrs?.name === 'background');
      
      if (background) {
        background.width(newWidth);
        background.height(newHeight);
      } else {
        const newBackground = new Konva.Rect({
          x: 0,
          y: 0,
          width: newWidth,
          height: newHeight,
          fill: '#f0f0f0',
          listening: false,
          name: 'background'
        });
        layer.add(newBackground);
        newBackground.moveToBottom();
      }
      
      stage.batchDraw();
     
      this.updateContainerStyle();
    }
  }

  updateContainerStyle(): void {
    const stage = this.stage;
    if (!stage) return;
    
    const container = stage.container();
    if (!container) return;
    
    const scale = stage.scaleX();
    const scaledWidth = stage.width() * scale;
    const scaledHeight = stage.height() * scale;
    
    container.style.width = `${scaledWidth}px`;
    container.style.height = `${scaledHeight}px`;
    container.style.margin = '0 auto';
    
   
  }

  getContainerStyle() {
    const stage = this.stage;
    if (!stage) {
      const dimensions = this.dimensionService.getCurrentDimensions();
      return {
        width: `${dimensions.canvasWidth}px`,
        height: `${dimensions.canvasHeight}px`,
        margin: '0 auto'
      };
    }
    
    const scale = stage.scaleX();
    const scaledWidth = stage.width() * scale;
    const scaledHeight = stage.height() * scale;

    return {
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      margin: '0 auto'
    };
  }

  clearCanvas(clearRegistry = true, placeholderRegistry?: Map<string, any>, placeholderContainerRef?: any): void {
    const stage = this.stage;
    const layer = this.layer;
    if (!stage || !layer) return;

    // Find background node
    const background = layer.findOne('.background') || layer.findOne((node: Konva.Node) => node.attrs?.name === 'background');

    // Clear Konva nodes except background and transformer
    const children = layer.getChildren().slice();
    children.forEach((node: Konva.Node) => {
      if (node !== background && !(node instanceof Konva.Transformer)) {
        node.destroy();
      }
    });

    // Clear component-based placeholders if registry provided
    if (clearRegistry && placeholderContainerRef && placeholderRegistry) {
      placeholderContainerRef.clear();
      placeholderRegistry.clear();
    }

    // Reset selection and update hasElements flag
    this.deselectShape();
    this.updateHasElementsFlag();
    layer.draw();
  }

  addElement(element: Konva.Shape | Konva.Group): void {
    const layer = this.layer;
    if (layer) {
      // Only add to layer if not already added (to handle placeholders that add themselves)
      if (!element.getParent()) {
        layer.add(element);
      }
      // Update hasElements flag by checking actual layer contents
      this.updateHasElementsFlag();
      layer.draw();
    }
  }

  removeElement(element: Konva.Node): void {
    element.destroy();
    
    // Update hasElements flag by checking actual layer contents
    this.updateHasElementsFlag();
    this.layer?.draw();
  }

  private updateHasElementsFlag(): void {
    const layer = this.layer;
    if (layer) {
      // Find all elements except background and transformer
      const elements = layer.getChildren(node => {
        const isBackground = node.attrs?.name === 'background';
        const isTransformer = node instanceof Konva.Transformer;
        return !(isBackground || isTransformer);
      });
      const hasElements = elements.length > 0;
     
      this.hasElementsSubject.next(hasElements);
    }
  }

  // Force update the hasElements flag - useful after deserialization
  public forceUpdateHasElementsFlag(): void {
   
    this.updateHasElementsFlag();
  }

  serializeCanvasState(placeholderRegistry: Map<string, any>): CanvasStateV2 | null {
    const stage = this.stage;
    const layer = this.layer;
    if (!stage || !layer) return null;

    const canvasConfig = this.dimensionService.getCanvasConfig();
    
    // Use the proper CanvasStateService to serialize the full canvas state
    return CanvasStateService.serialize(
      stage,
      layer,
      placeholderRegistry,
      {
        widthInches: canvasConfig.widthInches,
        heightInches: canvasConfig.heightInches,
        paperSize: canvasConfig.paperSize,
        orientation: canvasConfig.orientation,
        dpi: canvasConfig.dpi
      }
    );
  }

  deserializeCanvasState(
    state: CanvasStateV2, 
    placeholderRegistry: Map<string, any>,
    placeholderContainerRef: any,
    recreateElementCallback: (element: SerializedNodeV2) => void
  ): void {
    const stage = this.stage;
    if (!stage) {
      console.error("Stage not initialized before deserializing state.");
      return;
    }

    // Load canvas configuration from state
    if (state && state.canvas) {
      this.dimensionService.loadDimensionsFromState(state);
    }

    // Clear existing canvas content
    this.clearCanvas(false, placeholderRegistry, placeholderContainerRef);

    // Ensure stage size matches the loaded configuration
    this.updateStageSize();

    // Check if state has nodes
    if (!state || !state.nodes || !Array.isArray(state.nodes)) {
      console.warn('State format missing nodes array. Initializing blank canvas.');
      this.layer?.draw();
      this.updateHasElementsFlag(); // Update flag for empty canvas
      return;
    }

   

    // Recreate elements
    if (state.nodes && Array.isArray(state.nodes)) {
      state.nodes.forEach((element: SerializedNodeV2) => {
        recreateElementCallback(element);
      });
    }

    // Update hasElements flag based on actual layer contents after recreation
    // Use a longer timeout to ensure all async operations (like image loading) are complete
    setTimeout(() => {
     
      this.updateHasElementsFlag();
    }, 500);

    this.layer?.draw();
  }

  destroy(): void {
    const stage = this.stage;
    if (stage) {
      stage.destroy();
      this.stageSubject.next(null);
      this.layerSubject.next(null);
      this.transformerSubject.next(null);
      this.selectedShapeSubject.next(null);
      this.hasElementsSubject.next(false);
    }
  }
} 