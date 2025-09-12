import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Renderer2,
  ViewContainerRef,
  ChangeDetectorRef,
  HostListener,
  ApplicationRef,
  NgZone,
} from "@angular/core";
import {
  Location,
  TitleCasePipe,
  CommonModule,
  NgIf,
  NgClass,
  NgForOf,
} from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";
import Konva from "konva";
import * as QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Subscription, combineLatest } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { LucideAngularModule } from "lucide-angular";
import {
  ArrowLeft,
  Save,
  Edit,
  List,
  Info,
  Trash2,
  Lightbulb,
} from "lucide-angular";

// Services
import { EditorContextService } from "../../services/editor-context.service";
import { LayoutService } from "../../services/layout.service";
import { DocumentService } from "../../core/services/document.service";
import { LogosService } from "../../services/logos.service";
import { PlaceholderService } from "./placeholders/services/placeholder.service";
import { PlaceholderFactoryService } from "./placeholders/services/placeholder-factory.service";

// New services
import { CanvasService } from "./services/canvas.service";
import { TextEditorService } from "./services/text-editor.service";
import { ShapeService } from "./services/shape.service";
import { PreviewService } from "./services/preview.service";
import { ListLayoutService } from "./services/list-layout.service";

// Components and types
import {
  DocumentSaveModalComponent,
  DocumentFormData,
} from "./document-save-modal/document-save-modal.component";
import {
  CanvasStateV2,
  SerializedNodeV2,
  PositionData,
  DragDropState,
  EditorDimensions,
  ListLayoutState,
} from "./types/editor.types";
import {
  PAPER_SIZES_INCH,
  DEFAULT_VALUES,
  SAMPLE_TEST_RESULTS,
  PLACEHOLDER_STATES,
  PLACEHOLDER_SAMPLE_VALUES,
  SHAPE_DEFAULTS,
} from "./constants/editor.constants";

@Component({
  selector: "app-document-editor",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TitleCasePipe,
    DocumentSaveModalComponent,
    NgIf,
    NgClass,
    NgForOf,
    LucideAngularModule,
  ],
  templateUrl: "./document-editor.component.html",
  styleUrls: ["./document-editor.component.scss"],
})
export class DocumentEditorComponent implements OnInit, OnDestroy {
  @ViewChild("placeholderContainer", { read: ViewContainerRef })
  placeholderContainerRef!: ViewContainerRef;
  @ViewChild("sidebarCard") sidebarCard!: ElementRef;
  @ViewChild("mainContentCard") mainContentCard!: ElementRef;
  @ViewChild(DocumentSaveModalComponent) documentSaveModal!: DocumentSaveModalComponent;

  // Registry of created placeholder component references
  private placeholderRegistry = new Map<string, any>();

  // Public properties for template binding
  public selectedColor: string = DEFAULT_VALUES.SELECTED_COLOR;
  public allPlaceholders: any[] = [];
  public filteredCategorizedPlaceholders: any[] = [];
  public placeholderSearchTerm: string = "";
  public currentContextType: string = "none";
  public isSaveModalVisible = false;
  public isEditingDocument = false;
  public currentDocumentData: any = null;
  public isLoading = false;

  // Icons
  readonly ArrowLeft = ArrowLeft;
  readonly Save = Save;
  readonly Edit = Edit;
  readonly List = List;
  readonly Info = Info;
  readonly Trash2 = Trash2;
  readonly Lightbulb = Lightbulb;

  // Drag and drop state
  private dragDropState: DragDropState = {
    draggedItemType: null,
    draggedPlaceholderId: null,
  };

  // Subscriptions
  private subscription: Subscription = new Subscription();
  private contextSubscription!: Subscription;
  private resizeTimeout: any = null;
  private documentId: string | null = null;

  // Public getters for template access
  get stage(): Konva.Stage | null {
    return this.canvasService.stage;
  }
  get layer(): Konva.Layer | null {
    return this.canvasService.layer;
  }
  get transformer(): Konva.Transformer | null {
    return this.canvasService.transformer;
  }
  get selectedShape(): Konva.Node | null {
    return this.canvasService.selectedShape;
  }
  get hasElements(): boolean {
    return this.canvasService.hasElements;
  }
  get isPreviewMode(): boolean {
    return this.previewService.isPreviewMode;
  }

  // Dimension getters for template
  get canvasWidth(): number {
    return this.canvasService.dimensions.getCurrentDimensions().canvasWidth;
  }
  get canvasHeight(): number {
    return this.canvasService.dimensions.getCurrentDimensions().canvasHeight;
  }
  get canvasWidthMm(): number {
    return this.canvasService.dimensions.getCurrentDimensions().canvasWidthMm;
  }
  set canvasWidthMm(value: number) {
    if (this.selectedPaperSize === "Custom") {
      this.canvasService.dimensions.setCustomDimensions(
        value,
        this.canvasHeightMm,
      );
    }
  }
  get canvasHeightMm(): number {
    return this.canvasService.dimensions.getCurrentDimensions().canvasHeightMm;
  }
  set canvasHeightMm(value: number) {
    if (this.selectedPaperSize === "Custom") {
      this.canvasService.dimensions.setCustomDimensions(
        this.canvasWidthMm,
        value,
      );
    }
  }
  get DPI(): number {
    return this.canvasService.dimensions.getCurrentDimensions().DPI;
  }
  get selectedPaperSize(): string {
    return this.canvasService.dimensions.getCurrentDimensions()
      .selectedPaperSize;
  }
  get paperOrientation(): "portrait" | "landscape" {
    return this.canvasService.dimensions.getCurrentDimensions()
      .paperOrientation;
  }

  // List layout getters
  get isListModeActive(): boolean {
    return this.listLayoutService.currentState.isListModeActive;
  }
  get listSelectedNodes(): Konva.Node[] {
    return this.listLayoutService.currentState.listSelectedNodes;
  }
  get listOrientation(): "horizontal" | "vertical" {
    return this.listLayoutService.currentState.listOrientation;
  }
  set listOrientation(value: "horizontal" | "vertical") {
    this.listLayoutService.setListOrientation(value);
  }

  get listSeparator(): number {
    return this.listLayoutService.currentState.listSeparator;
  }
  set listSeparator(value: number) {
    this.listLayoutService.setListSeparator(value);
  }

  // Undo list layout
  undoListLayout(): void {
    if (this.canvasService.layer && this.canvasService.transformer) {
      const success = this.listLayoutService.undoLastLayout(
        this.canvasService.layer,
        this.canvasService.transformer,
      );
      if (!success) {
        this.toastr.info("Nothing to undo.", "List Layout");
      } else {
        // Ensure any selection is cleared and redrawn
        this.canvasService.transformer.nodes([]);
        this.canvasService.transformer.getLayer()?.batchDraw();
        this.canvasService.selectedShape = null;
        this.cdRef.detectChanges();
      }
    }
  }

  // Template helper getters
  get placeholderStates() {
    return this.placeholderService.getPlaceholderStates();
  }
  get sampleTestResults() {
    return this.placeholderService.getSampleTestResults();
  }

  constructor(
    private renderer: Renderer2,
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private el: ElementRef,
    public editorContextService: EditorContextService,
    private layoutService: LayoutService,
    private placeholderService: PlaceholderService,
    private placeholderFactoryService: PlaceholderFactoryService,
    private logoService: LogosService,
    private documentService: DocumentService,
    private toastr: ToastrService,
    private cdRef: ChangeDetectorRef,
    private appRef: ApplicationRef,
    private ngZone: NgZone,
    // New services
    private canvasService: CanvasService,
    private textEditorService: TextEditorService,
    private shapeService: ShapeService,
    private previewService: PreviewService,
    private listLayoutService: ListLayoutService,
  ) {}

  ngOnInit(): void {
    this.layoutService.setFullScreenMode(true);
    this.renderer.addClass(document.body, "document-editor-fullscreen");

    // Subscribe to dimension changes
    this.subscription.add(
      this.canvasService.dimensions.dimensions$.subscribe((dimensions) => {
        this.cdRef.detectChanges();
        if (this.canvasService.stage) {
          this.canvasService.updateStageSize();
        }
      }),
    );

    // Subscribe to editor context type
    this.contextSubscription = this.editorContextService.contextType$.subscribe(
      (context) => {
        this.currentContextType = context;
        this.cdRef.detectChanges();
      },
    );

    // Initialize placeholders
    this.allPlaceholders = this.placeholderService.getAvailablePlaceholders();
    this.updateFilteredPlaceholders();

    // Check for document ID in route parameters
    this.subscription.add(
      this.route.paramMap.subscribe((params) => {
        const id = params.get("id");
        if (id) {
          this.documentId = id;
          this.isEditingDocument = true;
          this.loadDocument(this.documentId);
        } else {
        
          this.isEditingDocument = false;
        }
      }),
    );
  }

  ngAfterViewInit(): void {
    if (!this.canvasService.initializeKonva("konva-container", this.cdRef)) {
      console.error("Failed to initialize Konva");
      return;
    }

    this.setupDragDropListeners();
    window.addEventListener("resize", this.handleWindowResize.bind(this));

    setTimeout(() => {
      this.canvasService.updateStageSize();
      this.adjustSidebarHeight();
      // Ensure hasElements flag is properly initialized
      this.canvasService.forceUpdateHasElementsFlag();
    }, 500);
  }

  @HostListener("window:resize")
  onResize() {
    this.adjustSidebarHeight();
  }

  // Navigation
  goBack() {
    this.location.back();
  }

  // Document management
  async loadDocument(id: string): Promise<void> {
    this.subscription.add(
      this.documentService.getDocument(Number(id)).subscribe({
        next: async (document: any) => {
          this.currentDocumentData = document;

          if (!this.canvasService.stage) {
            if (
              !this.canvasService.initializeKonva("konva-container", this.cdRef)
            ) {
              this.isLoading = false;
              this.toastr.error(
                "Editor could not be initialized.",
                "Load Error",
              );
              this.goBack();
              return;
            }
          }

          setTimeout(() => {
            if (document.canvas_state) {
              try {
                const stateToLoad =
                  typeof document.canvas_state === "string"
                    ? JSON.parse(document.canvas_state)
                    : document.canvas_state;

                this.canvasService.deserializeCanvasState(
                  stateToLoad,
                  this.placeholderRegistry,
                  this.placeholderContainerRef,
                  (element) => this.recreateElement(element),
                );
                
                // Force update the hasElements flag after deserialization to ensure proper UI state
                // Use a longer timeout to ensure all async operations (like placeholder creation) are complete
                setTimeout(() => {
                  console.log('Final update of hasElements flag after deserialization');
                  this.canvasService.forceUpdateHasElementsFlag();
                  this.cdRef.detectChanges();
                }, 1000);
              } catch (error) {
                console.error(
                  "Error parsing or deserializing canvas state:",
                  error,
                );
                this.toastr.error(
                  "Failed to load document layout.",
                  "Load Error",
                );
              }
            }
            this.isLoading = false;
            this.cdRef.detectChanges();
          }, 150);
        },
        error: (err) => {
          console.error("Error loading document:", err);
          this.toastr.error(
            "Failed to load document from server.",
            "Load Error",
          );
          this.isLoading = false;
          this.goBack();
        },
      }),
    );
  }

  // Element recreation for deserialization
  recreateElement(element: SerializedNodeV2): void {
    if (!element || !this.canvasService.layer) return;
    
    console.log('Recreating element:', element);

    const get = (camel: string, snake: string) =>
      element[snake] !== undefined ? element[snake] : element[camel];
    const nodeType = element.node_type || element.type;
    let node: Konva.Node | null = null;

    switch (nodeType) {
      case "text":
        node = this.shapeService.createText(
          element.x,
          element.y,
          get("text", "text"),
          get("fontSize", "font_size"),
          get("fontFamily", "font_family"),
          get("fill", "fill"),
        );
        this.setupTextNodeEvents(node as Konva.Text);
        break;

      case "image":
        const isClientLogo =
          element.is_client_logo === true || element.isClientLogo === true;
        let imageSourceToLoad =
          get("src", "src") || "/assets/img/brand/user.png";
        if (isClientLogo) {
          const logo = this.logoService.getClientLogoUrl();
          if (logo) imageSourceToLoad = logo;
        }

        this.shapeService
          .createImage(
            element.x,
            element.y,
            imageSourceToLoad,
            element.width,
            element.height,
            isClientLogo,
          )
          .then((imageNode) => {
            this.canvasService.addElement(imageNode);
            this.setupImageNodeEvents(imageNode);
          });
        return;

      case "placeholder":
        const phId = get("placeholderId", "placeholder_id");
        if (phId && this.placeholderContainerRef) {
          const position = {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          };
          this.createComponentBasedPlaceholder(
            phId,
            position,
            element.state || element.data || {},
          );
          // Note: createComponentBasedPlaceholder will notify canvas service via placeholderCreated subscription
        }
        return;

      case "shape":
        const shapeType = get("shapeType", "shape_type");
        if (shapeType === "filled-rectangle") {
          node = this.shapeService.createFilledRectangle(
            element.x,
            element.y,
            element.width,
            element.height,
            get("fill", "fill"),
          );
        } else if (shapeType === "outlined-rectangle") {
          node = this.shapeService.createOutlinedRectangle(
            element.x,
            element.y,
            element.width,
            element.height,
            get("stroke", "stroke"),
            get("strokeWidth", "stroke_width"),
          );
        } else if (shapeType === "line") {
          node = this.shapeService.createLine(
            element.x,
            element.y,
            element.width,
            get("stroke", "stroke"),
            get("strokeWidth", "stroke_width"),
          );
        }
        this.setupShapeNodeEvents(node!);
        break;
    }

    if (node) {
      console.log('Adding recreated node to canvas:', node);
      this.canvasService.addElement(node as Konva.Shape | Konva.Group);
    }
  }

  // Event setup methods
  private setupTextNodeEvents(textNode: Konva.Text): void {
    textNode.on("click tap", () => this.selectShape(textNode));
    textNode.on("dblclick dbltap", (e) => {
      e.cancelBubble = true;
      this.startTextEditing(textNode);
    });
    textNode.on("transform", () =>
      this.textEditorService.autoResizeTextNode(textNode, true),
    );
  }

  private setupImageNodeEvents(imageNode: Konva.Image): void {
    imageNode.on("click tap", () => this.selectShape(imageNode));
    imageNode.on("dblclick dbltap", (e) => {
      e.cancelBubble = true;
      this.selectIndividualShape(imageNode);
    });
  }

  private setupShapeNodeEvents(shapeNode: Konva.Node): void {
    shapeNode.on("click tap", () => this.selectShape(shapeNode));
    shapeNode.on("dblclick dbltap", (e) => {
      e.cancelBubble = true;
      this.selectIndividualShape(shapeNode);
    });
  }

  // Canvas operations
  selectShape(shape: Konva.Node): void {
    // Check if list layout service should handle this
    if (
      this.listLayoutService.handleShapeSelection(
        shape,
        this.canvasService.transformer!,
      )
    ) {
      this.updateEditorContext(shape);
      return;
    }

    // Use canvas service for regular selection
    this.canvasService.selectShape(shape);
    this.updateEditorContext(shape);
  }

  private updateEditorContext(shape: Konva.Node): void {
    if (shape.name() === "text" || shape.name() === "placeholder-text" || shape.name() === "placeholder-group") {
      this.editorContextService.setContextType("text");
    } else if (shape.name() === "image") {
      this.editorContextService.setContextType("image");
    } else if (
      shape.name() === "placeholder" ||
      shape.name() === "placeholder-group"
    ) {
      this.editorContextService.setContextType("placeholder");
    } else if (shape.name() === "shape") {
      this.editorContextService.setContextType("shape");
    } else {
      this.editorContextService.setContextType("none");
    }
  }

  private selectIndividualShape(shape: Konva.Node): void {
    if (
      !this.listLayoutService.selectIndividualShape(
        shape,
        this.canvasService.transformer!,
      )
    ) {
      this.selectShape(shape);
    }
  }

  // Text editing
  startTextEditing(node: Konva.Text): void {
    if (
      !this.canvasService.stage ||
      !this.canvasService.transformer ||
      !this.canvasService.layer
    )
      return;

    this.textEditorService.startTextEditing(
      node,
      this.canvasService.stage,
      this.canvasService.transformer,
      this.canvasService.layer,
      (textNode) => this.textEditorService.autoResizeTextNode(textNode, true),
    );
  }

  safeStartTextEditing(): void {
    if (this.selectedShape instanceof Konva.Text) {
      this.startTextEditing(this.selectedShape);
    } else if (this.selectedShape instanceof Konva.Group) {
      const textNode = this.selectedShape.findOne(".placeholder-text");
      if (textNode instanceof Konva.Text) {
        this.startTextEditing(textNode);
      }
    }
  }

  // Shape creation methods
  createFilledRectangle(x: number, y: number, width = 100, height = 80): void {
    const rect = this.shapeService.createFilledRectangle(
      x,
      y,
      width,
      height,
      this.selectedColor,
    );
    this.canvasService.addElement(rect);
    this.setupShapeNodeEvents(rect);
    this.selectShape(rect);
    // Force immediate update of hasElements flag
    this.canvasService.forceUpdateHasElementsFlag();
    this.cdRef.detectChanges();
  }

  createOutlinedRectangle(
    x: number,
    y: number,
    width = 100,
    height = 80,
  ): void {
    const rect = this.shapeService.createOutlinedRectangle(
      x,
      y,
      width,
      height,
      this.selectedColor,
    );
    this.canvasService.addElement(rect);
    this.setupShapeNodeEvents(rect);
    this.selectShape(rect);
    // Force immediate update of hasElements flag
    this.canvasService.forceUpdateHasElementsFlag();
    this.cdRef.detectChanges();
  }

  createLine(x: number, y: number, length = 100): void {
    const line = this.shapeService.createLine(x, y, length, this.selectedColor);
    this.canvasService.addElement(line);
    this.setupShapeNodeEvents(line);
    this.selectShape(line);
    // Force immediate update of hasElements flag
    this.canvasService.forceUpdateHasElementsFlag();
    this.cdRef.detectChanges();
  }

  // Property getters and setters for template
  /**
   * Gets the font size of the currently selected shape or text nodes
   * Supports three modes:
   * 1. List mode with individual selected nodes (before grouping)
   * 2. List group mode (after applying list layout)
   * 3. Single shape selection
   * @returns Font size in pixels or null if no valid text node is selected
   */
  getSelectedShapeFontSize(): number | null {
    // Check if list mode is active and we have selected nodes (before grouping)
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      // Return font size from the first text node found
      for (const node of this.listSelectedNodes) {
        if (node instanceof Konva.Text) {
          return this.shapeService.getTextFontSize(node);
        } else if (node instanceof Konva.Group) {
          const textChild = node.findOne(".placeholder-text");
          if (textChild instanceof Konva.Text) {
            return this.shapeService.getTextFontSize(textChild);
          }
        }
      }
      return null;
    }

    // Check if a group is selected after list layout
    if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      if (textNodes.length > 0) {
        return this.shapeService.getTextFontSize(textNodes[0]);
      }
      return null;
    }

    if (this.selectedShape instanceof Konva.Text) {
      return this.shapeService.getTextFontSize(this.selectedShape);
    }
    return null;
  }

  getSelectedShapeFill(defaultColor = "#000000"): string {
    // Check if list mode is active and we have selected nodes
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      // Return color from the first text node found
      for (const node of this.listSelectedNodes) {
        if (node instanceof Konva.Text) {
          return this.shapeService.getTextFill(node, defaultColor);
        } else if (node instanceof Konva.Group) {
          const textChild = node.findOne(".placeholder-text");
          if (textChild instanceof Konva.Text) {
            return this.shapeService.getTextFill(textChild, defaultColor);
          }
        }
      }
      return defaultColor;
    }

    // Check if a group is selected after list layout
    if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      if (textNodes.length > 0) {
        return this.shapeService.getTextFill(textNodes[0], defaultColor);
      }
      return defaultColor;
    }

    if (this.selectedShape instanceof Konva.Text) {
      return this.shapeService.getTextFill(this.selectedShape, defaultColor);
    } else if (this.selectedShape instanceof Konva.Shape) {
      return this.shapeService.getShapeFill(this.selectedShape, defaultColor);
    }
    return defaultColor;
  }

  getShapeDisplayColor(defaultColor = "#000000"): string {
    // Check if list mode is active and we have selected nodes
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      // Return color from the first text node found
      for (const node of this.listSelectedNodes) {
        if (node instanceof Konva.Text) {
          return this.shapeService.getShapeDisplayColor(node, defaultColor);
        } else if (node instanceof Konva.Group) {
          const textChild = node.findOne(".placeholder-text");
          if (textChild instanceof Konva.Text) {
            return this.shapeService.getShapeDisplayColor(
              textChild,
              defaultColor,
            );
          }
        }
      }
      return defaultColor;
    }

    // Check if a group is selected after list layout
    if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      if (textNodes.length > 0) {
        return this.shapeService.getShapeDisplayColor(
          textNodes[0],
          defaultColor,
        );
      }
      return defaultColor;
    }

    if (this.selectedShape) {
      return this.shapeService.getShapeDisplayColor(
        this.selectedShape,
        defaultColor,
      );
    }
    return defaultColor;
  }

  /**
   * Font and style methods
   */

  /**
   * Sets the font size for selected text elements
   * Supports three selection modes:
   * 1. Individual nodes in list mode (before grouping) - updates all selected text nodes
   * 2. List group (after applying layout) - updates all text nodes within the group
   * 3. Single text node - updates the individual text node
   * @param event Input event containing the new font size value
   */
  setFontSize(event: Event): void {
    const fontSize = parseInt((event.target as HTMLInputElement).value, 10);

    // Check if list mode is active and we have selected nodes (before grouping)
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      console.log(
        `[List Mode] Setting font size to ${fontSize} for ${this.listSelectedNodes.length} selected nodes`,
      );
      // Update font size for all selected text nodes in list mode
      this.listSelectedNodes.forEach((node) => {
        if (node instanceof Konva.Text) {
          this.shapeService.setTextFontSize(node, fontSize);
          this.textEditorService.autoResizeTextNode(node, true);
        } else if (node instanceof Konva.Group) {
          // Handle placeholder groups that might contain text nodes
          const textChild = node.findOne(".placeholder-text");
          if (textChild instanceof Konva.Text) {
            this.shapeService.setTextFontSize(textChild, fontSize);
            this.textEditorService.autoResizeTextNode(textChild, true);
          }
        }
      });
      this.canvasService.layer?.draw();
    } else if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      console.log(
        `[Group Mode] Setting font size to ${fontSize} for ${textNodes.length} text nodes in group`,
      );
      // Handle grouped text nodes after list layout - enables font size changes on grouped elements
      this.updateGroupTextNodes((textNode) => {
        this.shapeService.setTextFontSize(textNode, fontSize);
        this.textEditorService.autoResizeTextNode(textNode, true);
      });
    } else if (this.selectedShape instanceof Konva.Text) {
      // Single shape selection (existing behavior)
      this.shapeService.setTextFontSize(this.selectedShape, fontSize);
      this.textEditorService.autoResizeTextNode(this.selectedShape, true);
      this.canvasService.layer?.draw();
    }
  }

  setFontWeight(weight: "bold" | "normal"): void {
    let group = this.stage?.find("#list-layout-group");
    console.log(group, "the gro");
    // Check if list mode is active and we have selected nodes
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      console.log(
        `[List Mode] Setting font weight to ${weight} for ${this.listSelectedNodes.length} selected nodes`,
      );
      // Update font weight for all selected text nodes in list mode
      this.listSelectedNodes.forEach((node) => {
        if (node instanceof Konva.Text) {
          this.shapeService.setTextFontStyle(node, weight);
        } else if (node instanceof Konva.Group) {
          // Handle placeholder groups that might contain text nodes
          const textChild = node.findOne(".placeholder-text");
          if (textChild instanceof Konva.Text) {
            this.shapeService.setTextFontStyle(textChild, weight);
          }
        }
      });
      this.canvasService.layer?.draw();
    } else if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      console.log(
        `[Group Mode] Setting font weight to ${weight} for ${textNodes.length} text nodes in group`,
      );
      // Handle grouped text nodes after list layout
      this.updateGroupTextNodes((textNode) => {
        this.shapeService.setTextFontStyle(textNode, weight);
      });
    } else if (this.selectedShape instanceof Konva.Text) {
      this.shapeService.setTextFontStyle(this.selectedShape, weight);
      this.canvasService.layer?.draw();
    }
  }

  isBold(shape: Konva.Node | null): boolean {
    // Check if list mode is active and we have selected nodes
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      // Return bold status from the first text node found
      for (const node of this.listSelectedNodes) {
        if (node instanceof Konva.Text) {
          return this.shapeService.isTextBold(node);
        } else if (node instanceof Konva.Group) {
          const textChild = node.findOne(".placeholder-text");
          if (textChild instanceof Konva.Text) {
            return this.shapeService.isTextBold(textChild);
          }
        }
      }
      return false;
    }

    // Check if a group is selected after list layout
    if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      if (textNodes.length > 0) {
        return this.shapeService.isTextBold(textNodes[0]);
      }
      return false;
    }

    if (shape instanceof Konva.Text) {
      return this.shapeService.isTextBold(shape);
    }
    return false;
  }

  /**
   * Sets the text color for selected text elements
   * Supports three selection modes:
   * 1. Individual nodes in list mode (before grouping) - updates all selected text nodes
   * 2. List group (after applying layout) - updates all text nodes within the group
   * 3. Single text node - updates the individual text node
   * @param color Hex color string (e.g., "#FF0000")
   */
  setTextColor(color: string): void {
    // Check if list mode is active and we have selected nodes (before grouping)
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      console.log(
        `[List Mode] Setting text color to ${color} for ${this.listSelectedNodes.length} selected nodes`,
      );
      // Update text color for all selected text nodes in list mode
      this.listSelectedNodes.forEach((node) => {
        if (node instanceof Konva.Text) {
          this.shapeService.setTextFill(node, color);
        } else if (node instanceof Konva.Group) {
          // Handle placeholder groups that might contain text nodes
          const textChild = node.findOne(".placeholder-text");
          if (textChild instanceof Konva.Text) {
            this.shapeService.setTextFill(textChild, color);
          }
        }
      });
      this.canvasService.layer?.batchDraw();
    } else if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      console.log(
        `[Group Mode] Setting text color to ${color} for ${textNodes.length} text nodes in group`,
      );
      // Handle grouped text nodes after list layout - enables color changes on grouped elements
      this.updateGroupTextNodes((textNode) => {
        this.shapeService.setTextFill(textNode, color);
      });
    } else if (this.selectedShape instanceof Konva.Text) {
      this.shapeService.setTextFill(this.selectedShape, color);
      this.canvasService.layer?.batchDraw();
    } else if (this.selectedShape instanceof Konva.Group) {
      // Handle placeholder groups - ensure color changes are applied to text within the group
      const textChild = this.selectedShape.findOne(".placeholder-text");
      if (textChild instanceof Konva.Text) {
        this.shapeService.setTextFill(textChild, color);
        this.canvasService.layer?.batchDraw();
      }
    }
  }

  // Color handling
  onColorChange(event: Event): void {
    this.selectedColor = (event.target as HTMLInputElement).value;

    // Check if list mode is active and we have selected nodes
    if (this.isListModeActive && this.listSelectedNodes.length > 0) {
      // Update color for all selected text nodes in list mode
      this.setTextColor(this.selectedColor);
    } else if (this.isGroupSelected()) {
      // Handle grouped text nodes after list layout
      this.setTextColor(this.selectedColor);
    } else if (this.selectedShape) {
      if (this.selectedShape instanceof Konva.Text) {
        this.setTextColor(this.selectedColor);
      } else if (this.selectedShape instanceof Konva.Group) {
        // Handle placeholder groups that might contain text nodes
        const textChild = this.selectedShape.findOne(".placeholder-text");
        if (textChild instanceof Konva.Text) {
          this.setTextColor(this.selectedColor);
        }
      } else if (
        this.selectedShape instanceof Konva.Shape &&
        this.selectedShape.name() === "shape"
      ) {
        this.shapeService.updateShapeColor(
          this.selectedShape,
          this.selectedColor,
        );
        this.canvasService.layer?.batchDraw();
      }
    }
  }

  onHexInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    if (color && /^#[0-9A-F]{6}$/i.test(color)) {
      this.onColorChange(event);
    }
  }

  // Image methods
  setImageWidth(event: Event): void {
    const width = parseInt((event.target as HTMLInputElement).value, 10);
    if (this.selectedShape instanceof Konva.Image) {
      this.shapeService.setImageWidth(this.selectedShape, width);
      this.canvasService.layer?.batchDraw();
      this.canvasService.transformer?.forceUpdate();
    }
  }

  setImageHeight(event: Event): void {
    const height = parseInt((event.target as HTMLInputElement).value, 10);
    if (this.selectedShape instanceof Konva.Image) {
      this.shapeService.setImageHeight(this.selectedShape, height);
      this.canvasService.layer?.batchDraw();
      this.canvasService.transformer?.forceUpdate();
    }
  }

  // Shape property methods
  getShapeStrokeWidth(): number {
    if (this.selectedShape) {
      return this.shapeService.getShapeStrokeWidth(this.selectedShape);
    }
    return SHAPE_DEFAULTS.RECTANGLE.strokeWidth;
  }

  setShapeStrokeWidth(event: Event): void {
    const width = parseInt((event.target as HTMLInputElement).value, 10);
    if (this.selectedShape) {
      this.shapeService.setShapeStrokeWidth(this.selectedShape, width);
      this.canvasService.layer?.batchDraw();
    }
  }

  getShapeType(): string {
    if (this.selectedShape) {
      return this.shapeService.getShapeType(this.selectedShape);
    }
    return "";
  }

  // Preview mode
  togglePreviewMode(): void {
    if (this.canvasService.layer) {
      this.previewService.togglePreviewMode(this.canvasService.layer);
    }
  }

  // List layout methods
  toggleListMode(): void {
    this.listLayoutService.toggleListMode();
    if (this.canvasService.transformer) {
      this.canvasService.transformer.nodes([]);
      this.canvasService.transformer.getLayer()?.batchDraw();
    }
    this.canvasService.selectedShape = null;
    this.cdRef.detectChanges();
  }

  cancelListLayout(): void {
    this.listLayoutService.cancelListLayout();
    if (this.canvasService.transformer) {
      this.canvasService.transformer.nodes([]);
      this.canvasService.transformer.getLayer()?.batchDraw();
    }
    this.canvasService.selectedShape = null;
    this.cdRef.detectChanges();
  }

  applyListLayout(): void {
    if (this.canvasService.layer && this.canvasService.transformer) {
      const success = this.listLayoutService.applyListLayout(
        this.canvasWidth,
        this.canvasHeight,
        this.canvasService.layer,
        this.canvasService.transformer,
      );

      if (!success) {
        this.toastr.warning(
          "Please select at least two elements.",
          "List Layout",
        );
      } else {
        this.cdRef.detectChanges();
      }
    }
  }

  // Dimension methods
  onPaperSizeChange(event: Event): void {
    const sizeName = (event.target as HTMLSelectElement).value;
    this.canvasService.dimensions.setPaperSize(sizeName);
  }

  onOrientationChange(event: Event): void {
    const orientation = (event.target as HTMLSelectElement).value as
      | "portrait"
      | "landscape";
    this.canvasService.dimensions.setPaperOrientation(orientation);
  }

  setPaperOrientation(orientation: "portrait" | "landscape"): void {
    this.canvasService.dimensions.setPaperOrientation(orientation);
  }

  toggleOrientation(): void {
    const currentOrientation = this.paperOrientation;
    this.canvasService.dimensions.setPaperOrientation(
      currentOrientation === "portrait" ? "landscape" : "portrait",
    );
  }

  onMmInputChange(): void {
    // This method is called from template, but the actual logic
    // is handled by the setters for canvasWidthMm and canvasHeightMm
  }

  onDpiInputChange(value: any): void {
    const newDpi = Number(value);
    this.canvasService.dimensions.setDPI(newDpi);
  }

  validateDpiInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    
    // Enforce limits
    if (value < 72) {
      input.value = '72';
      this.canvasService.dimensions.setDPI(72);
    } else if (value > 600) {
      input.value = '600';
      this.canvasService.dimensions.setDPI(600);
    }
  }

  // Canvas utility methods
  clearCanvas(clearRegistry = true): void {
    this.canvasService.clearCanvas(
      clearRegistry,
      this.placeholderRegistry,
      this.placeholderContainerRef,
    );
  }

  deleteSelectedShape(): void {
    if (!this.selectedShape) return;

    // Handle component-based placeholders
    if (this.selectedShape instanceof Konva.Group) {
      this.placeholderRegistry.forEach((compRef, key) => {
        if (compRef?.instance?.placeholderGroup === this.selectedShape) {
          try {
            compRef.destroy();
          } catch (err) {
            console.warn("Error destroying placeholder component:", err);
          }
          this.placeholderRegistry.delete(key);
        }
      });
    }

    this.canvasService.removeElement(this.selectedShape);
    this.canvasService.selectedShape = null;
    this.canvasService.transformer?.nodes([]);
    this.editorContextService.setContextType("none");
  }

  // Save functionality
  saveToLocalStorage(): void {
    // Clear any selection effects before serializing
    this.listLayoutService.prepareForSave();

    const documentState = this.canvasService.serializeCanvasState(
      this.placeholderRegistry,
    );
    console.log("Document state serialized");
  }

  openSaveModal(): void {
    if (!this.canvasService.stage || !this.canvasService.layer) {
      this.toastr.error("Editor is not ready.", "Error");
      return;
    }

    // Clear any selection effects before serializing
    this.listLayoutService.prepareForSave();

    const canvasState = this.canvasService.serializeCanvasState(
      this.placeholderRegistry,
    );
    if (!canvasState) {
      this.toastr.error(
        "Could not prepare document state for saving.",
        "Error",
      );
      return;
    }

    this.currentDocumentData = {
      ...(this.isEditingDocument && this.currentDocumentData
        ? this.currentDocumentData
        : {}),
      canvas_state: canvasState,
      name:
        this.isEditingDocument && this.currentDocumentData
          ? this.currentDocumentData.name
          : "",
      description:
        this.isEditingDocument && this.currentDocumentData
          ? this.currentDocumentData.description
          : "",
      is_published:
        this.isEditingDocument && this.currentDocumentData
          ? this.currentDocumentData.is_published
          : false,
    };

    this.isSaveModalVisible = true;
    this.cdRef.detectChanges();
  }

  handleCancelSave(): void {
    this.isSaveModalVisible = false;
  }

  handleSave(formData: DocumentFormData): void {
    // Clear any selection effects before serializing for final save
    this.listLayoutService.prepareForSave();

    const canvasState = this.canvasService.serializeCanvasState(
      this.placeholderRegistry,
    );
    if (!canvasState) {
      this.documentSaveModal.onSaveError("Could not prepare document state for saving.");
      return;
    }

    const payload: any = {
      name: formData.name,
      description: formData.description,
      is_published: formData.is_published,
      canvas_state: JSON.stringify(canvasState),
    };

    if (formData.clientId && Number(formData.clientId) > 0) {
      payload.client_id = Number(formData.clientId);
    }

    if (this.isEditingDocument && this.documentId) {
      const updatePayload = {
        ...payload,
        version: this.currentDocumentData?.version,
      };

      this.subscription.add(
        this.documentService
          .updateDocument(Number(this.documentId), updatePayload)
          .subscribe({
            next: (updatedDocument) => {
              this.documentSaveModal.onSaveSuccess();
              this.isSaveModalVisible = false;
              this.toastr.success(
                "Document updated successfully!",
                "Save Successful",
              );
            // Navigate back to the management page labels tab after updating
            console.log('Updated document response:', updatedDocument);
            this.router.navigate(["/management"], { 
              queryParams: { tab: 'labels' },
              replaceUrl: true 
            });
            },
            error: (err) => {
              console.error("Error updating document:", err);
              const errorMessage = err.error?.message || "Failed to update document.";
              this.documentSaveModal.onSaveError(errorMessage);
              this.toastr.error(errorMessage, "Save Error");
            },
          }),
      );
    } else {
      this.subscription.add(
        this.documentService.createDocument(payload).subscribe({
          next: (newDocument) => {
            this.documentSaveModal.onSaveSuccess();
            this.isSaveModalVisible = false;
            this.toastr.success(
              "Document created successfully!",
              "Save Successful",
            );
            // Navigate back to the management page labels tab after creation
            console.log('New document response:', newDocument);
            this.router.navigate(["/management"], { 
              queryParams: { tab: 'labels' },
              replaceUrl: true 
            });
          },
          error: (err) => {
            console.error("Error creating document:", err);
            const errorMessage = err.error?.message || "Failed to create document.";
            this.documentSaveModal.onSaveError(errorMessage);
            this.toastr.error(errorMessage, "Save Error");
          },
        }),
      );
    }
  }

  // Drag and drop
  onDragStart(
    event: DragEvent,
    itemType: string,
    placeholderId?: string,
  ): void {
    this.dragDropState.draggedItemType = itemType;
    this.dragDropState.draggedPlaceholderId = placeholderId || null;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", itemType);
    }
  }

  private setupDragDropListeners(): void {
    if (!this.canvasService.stage) return;

    const container = this.canvasService.stage.container();

    container.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    container.addEventListener("drop", (event) => {
      event.preventDefault();

      if (!this.dragDropState.draggedItemType || !this.canvasService.stage)
        return;

      this.canvasService.stage.setPointersPositions(event);
      const pos = this.canvasService.stage.getPointerPosition();
      if (!pos) return;

      // Ensure Angular change detection runs after handling the drop
      this.ngZone.run(() => {
        this.handleDrop(pos.x, pos.y);
        this.cdRef.detectChanges();
      });
    });
  }

  private handleDrop(x: number, y: number): void {
    const { draggedItemType, draggedPlaceholderId } = this.dragDropState;

    switch (draggedItemType) {
      case "text":
        const textNode = this.shapeService.createText(x, y);
        this.canvasService.addElement(textNode);
        this.setupTextNodeEvents(textNode);
        this.textEditorService.autoResizeTextNode(textNode, true);
        // Force immediate update of hasElements flag
        this.canvasService.forceUpdateHasElementsFlag();
        this.cdRef.detectChanges();
        break;

      case "placeholder":
        if (draggedPlaceholderId) {
          this.handlePlaceholderDrop(x, y, draggedPlaceholderId);
        }
        break;

      case "image":
        this.handleImageDrop(x, y);
        break;

      case "filled-rectangle":
        this.createFilledRectangle(x, y);
        break;

      case "outlined-rectangle":
        this.createOutlinedRectangle(x, y);
        break;

      case "line":
        this.createLine(x, y);
        break;
    }

    // Clear drag state
    this.dragDropState.draggedItemType = null;
    this.dragDropState.draggedPlaceholderId = null;
    this.updateLayoutAfterContentChange();
  }

  private handlePlaceholderDrop(
    x: number,
    y: number,
    placeholderId: string,
  ): void {
    if (placeholderId === "test.results") {
      this.createTestResultsPlaceholder(x, y);
    } else if (placeholderId === "device.qrcode") {
      this.createQRCodePlaceholder(x, y);
    } else if (this.placeholderContainerRef) {
      this.createComponentBasedPlaceholder(placeholderId, { x, y });
    }
  }

  private handleImageDrop(x: number, y: number): void {
    const clientLogoSrc = this.logoService.getClientLogoUrl();
    const imageSrc = clientLogoSrc || "/assets/img/brand/user.png";

    this.shapeService
      .createImage(x, y, imageSrc, 50, 50, !!clientLogoSrc)
      .then((imageNode) => {
        this.canvasService.addElement(imageNode);
        this.setupImageNodeEvents(imageNode);
        // Force immediate update of hasElements flag
        this.canvasService.forceUpdateHasElementsFlag();
        this.cdRef.detectChanges();
      });
  }

  // Placeholder creation methods
  createTestResultsPlaceholder(x: number, y: number): void {
    if (this.placeholderContainerRef) {
      this.createComponentBasedPlaceholder("test.results", { x, y });
    }
  }

  createQRCodePlaceholder(x: number, y: number): void {
    if (this.placeholderContainerRef) {
      this.createComponentBasedPlaceholder("device.qrcode", { x, y });
    }
  }

  createComponentBasedPlaceholder(
    placeholderId: string,
    pos: PositionData,
    stateInfo?: any,
  ): void {
    if (!this.placeholderContainerRef) {
      console.error("Placeholder container not initialized");
      return;
    }

    const instanceId = `${placeholderId}-${Date.now()}`;

    try {
      let placeholderPosition: PositionData = {
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      };

      // Set default dimensions if not provided
      if (!placeholderPosition.width || !placeholderPosition.height) {
        if (placeholderId === "test.results") {
          placeholderPosition.width = SHAPE_DEFAULTS.TEST_RESULTS.width;
          placeholderPosition.height = SHAPE_DEFAULTS.TEST_RESULTS.height;
        } else if (placeholderId === "device.qrcode") {
          placeholderPosition.width = SHAPE_DEFAULTS.QR_CODE.size;
          placeholderPosition.height = SHAPE_DEFAULTS.QR_CODE.size;
        } else {
          placeholderPosition.width = 200;
          placeholderPosition.height = 50;
        }
      }

      const placeholderRef = this.placeholderFactoryService.createPlaceholder(
        this.placeholderContainerRef,
        "placeholder",
        placeholderId,
        null,
        placeholderPosition,
        this.canvasService.layer!,
        this.canvasService.transformer!,
      );

      this.placeholderRegistry.set(instanceId, placeholderRef);

      if (placeholderRef?.instance) {
        placeholderRef.instance.placeholderCreated.subscribe(
          (placeholderImage: Konva.Image) => {
            console.log('Placeholder created:', placeholderId, placeholderImage);
            // Notify canvas service and update UI within Angular zone
            this.ngZone.run(() => {
              this.canvasService.addElement(placeholderImage as any);
              this.canvasService.forceUpdateHasElementsFlag();
              this.cdRef.detectChanges();
            });

            placeholderImage.on("click tap", () =>
              this.selectShape(placeholderImage),
            );
            this.setupPlaceholderTooltip(placeholderImage, placeholderId);
            placeholderImage.on("dblclick dbltap", (e) => {
              this.showPlaceholderInfoDialog(placeholderImage);
              e.cancelBubble = true;
              if (e.evt) e.evt.stopPropagation();
            });
            
            // Ensure flag is updated after any async image/text sizing completes
            setTimeout(() => {
              this.ngZone.run(() => {
                this.canvasService.forceUpdateHasElementsFlag();
                this.cdRef.detectChanges();
              });
            }, 100);
          },
        );

        if (stateInfo) {
          placeholderRef.instance.state = {
            ...placeholderRef.instance.state,
            ...stateInfo,
          };
        }
      }
    } catch (error) {
      console.error("Error creating component-based placeholder:", error);
    }
  }

  setupPlaceholderTooltip(
    placeholderNode: Konva.Node,
    placeholderId: string,
  ): void {
    placeholderNode.on("mouseover", () => {
      // Get the element's position in the canvas
      const stage = this.canvasService.stage;
      if (!stage) return;
      
      const nodeAbsolutePosition = placeholderNode.getAbsolutePosition();
      const stageContainer = stage.container();
      const containerRect = stageContainer.getBoundingClientRect();
      
      // Calculate tooltip position relative to the element, not the mouse
      const tooltipX = containerRect.left + nodeAbsolutePosition.x;
      const tooltipY = containerRect.top + nodeAbsolutePosition.y - 35; // Position above the element

      const tooltipContainer = document.createElement("div");
      tooltipContainer.className = "konva-tooltip";
      tooltipContainer.style.position = "absolute";
      tooltipContainer.style.top = `${tooltipY}px`;
      tooltipContainer.style.left = `${tooltipX}px`;
      tooltipContainer.style.padding = "5px 10px";
      tooltipContainer.style.backgroundColor = "rgba(0,0,0,0.85)";
      tooltipContainer.style.color = "white";
      tooltipContainer.style.borderRadius = "4px";
      tooltipContainer.style.fontSize = "12px";
      tooltipContainer.style.pointerEvents = "none";
      tooltipContainer.style.zIndex = "1000";
      tooltipContainer.style.maxWidth = "200px";
      tooltipContainer.style.wordWrap = "break-word";
      tooltipContainer.style.whiteSpace = "nowrap";
      tooltipContainer.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";

      tooltipContainer.textContent =
        this.placeholderService.getPlaceholderDisplayText(placeholderId);
      
      // Adjust position if tooltip would go off-screen
      document.body.appendChild(tooltipContainer);
      const tooltipRect = tooltipContainer.getBoundingClientRect();
      
      if (tooltipRect.right > window.innerWidth) {
        tooltipContainer.style.left = `${tooltipX - tooltipRect.width}px`;
      }
      if (tooltipRect.top < 0) {
        tooltipContainer.style.top = `${containerRect.top + nodeAbsolutePosition.y + (placeholderNode.height?.() || 30) + 5}px`;
      }
      
      placeholderNode.attrs.tooltipElement = tooltipContainer;
    });

    placeholderNode.on("mousemove", () => {
      // Update tooltip position if element moves
      const tooltipElement = placeholderNode.attrs.tooltipElement;
      if (!tooltipElement || !this.canvasService.stage) return;
      
      const nodeAbsolutePosition = placeholderNode.getAbsolutePosition();
      const stageContainer = this.canvasService.stage.container();
      const containerRect = stageContainer.getBoundingClientRect();
      
      const tooltipX = containerRect.left + nodeAbsolutePosition.x;
      const tooltipY = containerRect.top + nodeAbsolutePosition.y - 35;
      
      tooltipElement.style.left = `${tooltipX}px`;
      tooltipElement.style.top = `${tooltipY}px`;
    });

    placeholderNode.on("mouseout", () => {
      if (placeholderNode.attrs.tooltipElement) {
        document.body.removeChild(placeholderNode.attrs.tooltipElement);
        delete placeholderNode.attrs.tooltipElement;
      }
    });
  }

  showPlaceholderInfoDialog(
    placeholderNode: Konva.Text | Konva.Group | Konva.Image,
  ): void {
    const placeholderId = this.getPlaceholderId(placeholderNode);
    if (!placeholderId) return;

    // Create and show dialog (implementation similar to original)
    // This would be the same dialog creation logic as in the original component
  }

  // Placeholder helper methods
  getPlaceholderId(node: Konva.Node): string | null {
    return this.previewService.getPlaceholderId(node);
  }

  getPlaceholderDisplayText(placeholderId: string | null): string {
    return this.previewService.getPlaceholderDisplayText(placeholderId);
  }

  getPlaceholderSampleValue(placeholderId: string | null): string {
    return this.previewService.getPlaceholderSampleValue(placeholderId);
  }

  // Utility methods
  updateFilteredPlaceholders(): void {
    const searchTerm = this.placeholderSearchTerm.toLowerCase().trim();
    const filteredList = this.allPlaceholders.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.id.toLowerCase().includes(searchTerm),
    );

    const categorized: { [key: string]: any[] } = {};
    filteredList.forEach((p) => {
      const category = p.id.split(".")[0] || "Other";
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(p);
    });

    this.filteredCategorizedPlaceholders = Object.keys(categorized)
      .sort()
      .map((category) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        items: categorized[category],
      }));
  }

  adjustSidebarHeight(): void {
    if (this.mainContentCard && this.sidebarCard) {
      const mainHeight = this.mainContentCard.nativeElement.offsetHeight;
      this.renderer.setStyle(
        this.sidebarCard.nativeElement,
        "height",
        `${mainHeight}px`,
      );
      this.renderer.setStyle(
        this.sidebarCard.nativeElement,
        "overflow-y",
        "auto",
      );
      this.renderer.setStyle(
        this.mainContentCard.nativeElement,
        "min-height",
        "600px",
      );
      this.renderer.setStyle(
        this.sidebarCard.nativeElement,
        "min-height",
        "600px",
      );
    }
  }

  updateLayoutAfterContentChange(): void {
    setTimeout(() => {
      this.adjustSidebarHeight();
    }, 100);
  }

  handleWindowResize(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      this.canvasService.updateStageSize();
    }, 150);
  }

  getContainerStyle() {
    return this.canvasService.getContainerStyle();
  }

  // Template helper methods for backward compatibility
  getPlaceholderWidth(): number {
    if (this.selectedShape instanceof Konva.Group) {
      return this.shapeService.getShapeWidth(this.selectedShape);
    }
    return 150;
  }

  setPlaceholderWidth(event: Event): void {
    const width = parseInt((event.target as HTMLInputElement).value, 10);
    if (this.selectedShape instanceof Konva.Group) {
      this.shapeService.setShapeWidth(this.selectedShape, width);
      this.canvasService.layer?.batchDraw();
    }
  }

  getPlaceholderHeight(): number {
    if (this.selectedShape instanceof Konva.Group) {
      return this.shapeService.getShapeHeight(this.selectedShape);
    }
    return 150;
  }

  setPlaceholderHeight(event: Event): void {
    const height = parseInt((event.target as HTMLInputElement).value, 10);
    if (this.selectedShape instanceof Konva.Group) {
      this.shapeService.setShapeHeight(this.selectedShape, height);
      this.canvasService.layer?.batchDraw();
    }
  }

  getPlaceholderFontSize(): number {
    return this.getSelectedShapeFontSize() || 18;
  }

  setPlaceholderFontSize(event: Event): void {
    this.setFontSize(event);
  }

  updateSelectedShapeColor(color: string): void {
    if (this.selectedShape) {
      this.shapeService.updateShapeColor(this.selectedShape, color);
      this.canvasService.layer?.batchDraw();
    }
  }

  /**
   * Helper methods for working with grouped text nodes after list layout
   */

  /**
   * Checks if the currently selected shape is a list group created after applying list layout
   * @returns true if a list group is selected, false otherwise
   */
  private isGroupSelected(): boolean {
    const isGroup =
      this.selectedShape instanceof Konva.Group &&
      this.selectedShape.name() === "list-group-layout";
    if (isGroup) {
      console.log("[Debug] List group selected for editing");
    }
    return isGroup;
  }

  /**
   * Extracts all text nodes from a list group, including text nodes within placeholder groups
   * @param group The list group to extract text nodes from
   * @returns Array of text nodes found in the group
   */
  private getTextNodesFromGroup(group: Konva.Group): Konva.Text[] {
    const textNodes: Konva.Text[] = [];
    group.children.forEach((child) => {
      if (child instanceof Konva.Text) {
        textNodes.push(child);
      } else if (child instanceof Konva.Group) {
        // Handle placeholder groups that might contain text nodes
        const textChild = child.findOne(".placeholder-text");
        if (textChild instanceof Konva.Text) {
          textNodes.push(textChild);
        }
      }
    });
    return textNodes;
  }

  /**
   * Applies a callback function to all text nodes within a selected list group
   * This enables batch operations like font size, color, and style changes on grouped elements
   * @param callback Function to apply to each text node in the group
   */
  private updateGroupTextNodes(callback: (textNode: Konva.Text) => void): void {
    if (this.isGroupSelected()) {
      const group = this.selectedShape as Konva.Group;
      const textNodes = this.getTextNodesFromGroup(group);
      console.log(`[Debug] Updating ${textNodes.length} text nodes in group`);
      textNodes.forEach(callback);
      this.canvasService.layer?.draw();
    }
  }

  ngOnDestroy(): void {
    // Cleanup preview mode
    if (this.previewService.isPreviewMode && this.canvasService.layer) {
      this.previewService.togglePreviewMode(this.canvasService.layer);
    }

    // Clean up subscriptions
    this.subscription.unsubscribe();
    if (this.contextSubscription) {
      this.contextSubscription.unsubscribe();
    }

    // Destroy placeholder components
    this.placeholderRegistry.forEach((ref) => {
      try {
        ref.destroy();
      } catch (error) {
        console.warn('Error destroying placeholder component:', error);
      }
    });
    this.placeholderRegistry.clear();

    // Clean up services
    this.previewService.cleanup();
    this.listLayoutService.cleanup();

    // Reset editor context
    this.editorContextService.setContextType("none");

    // Close save modal if open
    this.isSaveModalVisible = false;

    // Restore layout and remove any editor-specific classes
    this.layoutService.setFullScreenMode(false);
    this.renderer.removeClass(document.body, "document-editor-fullscreen");
    
    // Remove any modal overlay or editor-specific elements
    const editorModals = document.querySelectorAll('.konva-tooltip, .editor-modal, .editor-overlay');
    editorModals.forEach(modal => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    });

    // Remove event listeners
    window.removeEventListener("resize", this.handleWindowResize.bind(this));
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);

    // Destroy canvas
    this.canvasService.destroy();
    
    // Force garbage collection of any remaining references
    this.cdRef.detectChanges();
  }
}