import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  Renderer2,
  ViewChild,
  ElementRef,
  HostListener,
  signal,
  computed,
  effect,
} from "@angular/core";
import { Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { WorkflowService } from "../../core/services/workflow.service";
import { DocumentService } from "../../core/services/document.service";
import { INodeType } from "./components/node-palette/node-palette.component";
import { ModalAction } from "../../shared/components/generic-modal/generic-modal.component";
import {
  INode,
  IHandleMouseDownEvent,
  INodeMouseEvent,
} from "./decision-node/decision-node.component";
import { getAuthUserData } from "../../core/utils/helper";
import { CommonModule, NgForOf, NgIf } from "@angular/common";
import { NodePaletteComponent } from "./components/node-palette/node-palette.component";
import { DecisionNodeComponent } from "./decision-node/decision-node.component";
import { TripleDecisionNodeComponent } from "./triple-decision-node/triple-decision-node.component";
import { StandardNodeComponent } from "./standard-node/standard-node.component";
import { YesNoDecisionNodeComponent } from "./yes-no-decision-node/yes-no-decision-node.component";
import { GenericModalComponent } from "../../shared/components/generic-modal/generic-modal.component";
import { LucideAngularModule } from 'lucide-angular';
import {
  ArrowLeft,
  Save,
  Unlink,
  Trash2,
  Maximize2,
  Home,
  Grid,
  Minus,
  Plus,
} from 'lucide-angular';

// Interfaces (reconstructed based on usage)
interface IPoint {
  x: number;
  y: number;
}

interface IEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // e.g., node1_out, node1_out_pass
  targetHandle?: string; // e.g., node2_in
  data?: { label?: string };
}

interface IWorkflowState {
  nodes: INode[];
  edges: IEdge[];
}

interface IWorkflow {
  id?: string | number;
  name?: string;
  description?: string;
  canvas_state?: IWorkflowState;
  position_x?: number;
  position_y?: number;
  scale?: number;
  viewport_position_x?: number;
  viewport_position_y?: number;
  viewport_scale?: number;
  grid_visible?: boolean;
  grid_size?: number;
  is_published?: boolean;
  // Legacy properties for backward compatibility (will be removed)
  position?: IPoint;
  viewportPosition?: IPoint;
  viewportScale?: number;
  gridVisible?: boolean;
  gridSize?: number;
  isPublished?: boolean;
}

interface IContextMenuAction {
  label: string;
  icon?: string;
  action: () => void;
}

@Component({
  selector: "app-workflow-editor",
  templateUrl: "./workflow-editor.component.html",
  styles: [],
  standalone: true,
  imports: [
    CommonModule,
    NgForOf,
    NgIf,
    LucideAngularModule,
    GenericModalComponent,
    NodePaletteComponent,
    DecisionNodeComponent,
    YesNoDecisionNodeComponent,
    TripleDecisionNodeComponent,
    StandardNodeComponent
  ],
})
export class WorkflowEditorComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  // Icon constants for template
  ArrowLeft = ArrowLeft;
  Save = Save;
  Unlink = Unlink;
  Trash2 = Trash2;
  Maximize2 = Maximize2;
  Home = Home;
  Grid = Grid;
  Minus = Minus;
  Plus = Plus;

  // Add jsPlumbInstance declaration with any type to avoid TypeScript errors with dynamic import
  jsPlumbInstance: any = null;
  jsPlumbInitPromise: Promise<void> | null = null; // Promise to track initialization

  nodes: INode[] = [];
  edges: IEdge[] = [];

  // Static node types (excluding labels)
  staticNodeTypes: INodeType[] = [
    { id: "connect_iphone", label: "Start: Connect iPhone", color: "#4CAF50" },
    { id: "connect_airpods", label: "Start: Connect Airpods", color: "#388E3C" },
    {
      id: "airpods_oem_test",
      label: "OEM",
      color: "#673AB7",
      type: "yes_no_decision",
    },
    {
      id: "airpods_audio_test",
      label: "Audio Test",
      color: "#E91E63",
      type: "decision",
    },
    { id: "disconnect_airpods", label: "Disconnect Airpods", color: "#795548" },
    {
      id: "start_test",
      label: "Start Test",
      color: "#FF9800",
      type: "decision",
    },
    { id: "activate_device", label: "Activate the device", color: "#2196F3" },
    { id: "push_wifi", label: "Push a WiFi profile", color: "#9C27B0" },
    { id: "erase_device", label: "Erase the device", color: "#F44336" },
    { id: "use_app", label: "Use the app", color: "#00BCD4", type: "decision" },
    {
      id: "check_if_locked",
      label: "Check If Locked",
      color: "#FFC107",
      type: "triple-decision",
    },
    { id: "restore", label: "Restore", color: "#607D8B" },
    {
      id: "restore_keep_data",
      label: "Restore (Keep customer data)",
      color: "#607D8B",
    },
    { id: "manual_input_lpn", label: "Manual Input: LPN", color: "#8BC34A" },
    {
      id: "check_restore_mode",
      label: "Check if in restore mode",
      color: "#009688",
      type: "yes_no_decision",
    },
  ];

  // nodeTypes will hold static nodes + dynamically loaded label nodes
  nodeTypes: INodeType[] = [...this.staticNodeTypes];

  selectedNode: INode | null = null;
  selectedEdge: IEdge | null = null;

  lastNodePosition: IPoint = { x: 100, y: 100 };
  draggingNodeType: INodeType | null = null;

  // Node dragging state
  isDraggingNode: boolean = false;
  draggedNodeId: string | null = null;
  dragStartPosition: IPoint = { x: 0, y: 0 };
  nodeStartPosition: IPoint = { x: 0, y: 0 };

  // Connection dragging state
  isConnecting: boolean = false;
  connectionSource: string | null = null;
  connectionSourceHandleSuffix: string | null = null; // Added back: Store suffix like _out, _out_pass, _out_fail
  connectionSourcePosition: IPoint = { x: 0, y: 0 };
  connectionTarget: string | null = null;
  connectionMousePosition: IPoint = { x: 0, y: 0 };

  // Edge disconnection state
  isDraggingEdge = false;
  draggedEdgeId: string | null = null;
  draggedEdgeSource: string | null = null;
  draggedEdgeSourceHandleSuffix: string | null = null; // Added back: Store suffix for edge drag
  draggedEdgeTarget: string | null = null;
  draggedEdgeStartPosition: IPoint = { x: 0, y: 0 };

  // *** NEW: Infinite Canvas Viewport Management ***
  viewportPosition: IPoint = { x: 0, y: 0 };
  viewportScale: number = 1;
  gridVisible: boolean = true;
  gridSize: number = 20;

  // Pan state
  isPanning: boolean = false;
  panStartPosition: IPoint = { x: 0, y: 0 };
  panStartViewport: IPoint = { x: 0, y: 0 };

  // Zoom constraints
  public minZoom: number = 0.1;
  public maxZoom: number = 3;
  public zoomStep: number = 0.05; // Reduced from 0.1 to 0.05 for smoother zooming

  // NEW: Performance optimization for decision node edges
  private handlePositionCache: Map<string, IPoint> = new Map();
  private isOptimizedPanMode: boolean = false;
  private isViewportTransforming: boolean = false;
  private resizeObserver: ResizeObserver | null = null;

  // Edge labels lookup for Pass/Fail paths and triple decision paths
  edgeLabelMap: { [key: string]: string } = {
    _out_pass: "Pass",
    _out_fail: "Fail",
    _out_unlocked: "Unlocked",
    _out_icloud: "iCloud",
    _out_mdm: "MDM",
    _out_yes: "Yes",
    _out_no: "No",
  };

  // Double click state
  lastClickTime: number = 0;
  lastClickPosition: IPoint = { x: 0, y: 0 };
  lastSelectedNodeType: INodeType | null = null;

  // Client ID for the current workflow
  currentClientId: string | null = null;

  // Context Menu Logic
  contextMenuVisible: boolean = false;
  contextMenuItems: IContextMenuAction[] = [];
  contextMenuPosition: IPoint = { x: 0, y: 0 };

  // --- Variables for workflow save/load with backend integration ---
  isSaveModalVisible: boolean = false;
  currentWorkflowId: string | null = null;
  currentWorkflowData: IWorkflow | null = null;
  // Remove clientOptions since client ID is not necessary
  // Signal-based form state (no @angular/forms)
  name = signal<string>("");
  description = signal<string>("");
  // Remove clientIdSignal since client ID is not necessary
  nameTouched = signal<boolean>(false);
  isFormValid = computed(() => this.name().trim().length > 0);
  modalActions: ModalAction[] = [];

  /**
   * Get actual DOM position of handle for debugging/verification
   */
  private getActualHandlePosition(
    nodeId: string,
    handleSuffix: string,
  ): IPoint | null {
    const handleId = nodeId + handleSuffix;
    const handleElement = document.getElementById(handleId);

    if (!handleElement) {
      console.warn(`Handle element not found: ${handleId}`);
      return null;
    }

    const rect = handleElement.getBoundingClientRect();
    const flowContainer = document.querySelector(".flow-container");
    if (!flowContainer) return null;

    const containerRect = flowContainer.getBoundingClientRect();

    // Get screen coordinates relative to container
    const screenX = rect.left + rect.width / 2 - containerRect.left;
    const screenY = rect.top + rect.height / 2 - containerRect.top;

    // Convert to world coordinates
    const worldPos = this.screenToWorld({ x: screenX, y: screenY });

    console.log(
      `Actual DOM position for ${handleId}: screen(${screenX}, ${screenY}) -> world(${worldPos.x}, ${worldPos.y})`,
    );
    return worldPos;
  }

  /**
   * OPTIMIZED: Get handle position with caching for performance during viewport transformations
   */
  private getOptimizedHandlePosition(
    nodeId: string,
    handleSuffix: string,
  ): IPoint | null {
    const cacheKey = `${nodeId}${handleSuffix}`;

    // During viewport transformations (pan/zoom), use cached calculated positions for better performance
    if (this.isOptimizedPanMode || this.isViewportTransforming) {
      const cachedPosition = this.handlePositionCache.get(cacheKey);
      if (cachedPosition) {
        return cachedPosition;
      }
    }

    // Get the node to determine if it's a decision node
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const isDecisionNode =
      node.data?.type === "start_test" ||
      node.data?.type === "use_app" ||
      node.data?.type === "check_if_locked" ||
      node.data?.type === "check_restore_mode" ||
      node.data?.type === "airpods_oem_test" ||
      node.data?.type === "airpods_audio_test";

    let position: IPoint;

    if (!this.isOptimizedPanMode && !this.isViewportTransforming) {
      // For static viewport, try DOM position first for precision (works for all node types)
      const domPosition = this.getActualHandlePosition(nodeId, handleSuffix);
      if (domPosition) {
        // Cache the position for potential viewport transformations
        this.handlePositionCache.set(cacheKey, domPosition);
        return domPosition;
      }
    }

    // During viewport transformations, always use calculated positions for consistency
    // This ensures smooth updates during zoom/pan operations

    // Fall back to calculated position (always used during viewport transformations)
    position = this.calculateHandlePosition(node, handleSuffix);

    // Cache the calculated position
    this.handlePositionCache.set(cacheKey, position);

    return position;
  }

  /**
   * Clear handle position cache (call when nodes move significantly)
   */
  private clearHandlePositionCache(): void {
    this.handlePositionCache.clear();
  }

  /**
   * Clear handle position cache for a specific node (call when node content changes)
   */
  private clearNodeHandlePositionCache(nodeId: string): void {
    // Remove all cache entries for this node
    const keysToDelete: string[] = [];
    this.handlePositionCache.forEach((value, key) => {
      if (key.startsWith(nodeId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.handlePositionCache.delete(key));
  }

  /**
   * Get actual node dimensions from DOM
   */
  private getActualNodeDimensions(
    nodeId: string,
  ): { width: number; height: number } | null {
    const nodeElement = document.getElementById(nodeId + "_node");
    if (!nodeElement) {
      console.warn(`Node element not found: ${nodeId}_node`);
      return null;
    }

    const rect = nodeElement.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Calculate handle position based on node type and handle suffix
   */
  private calculateHandlePosition(node: INode, handleSuffix: string): IPoint {
    // Get actual node dimensions from DOM
    const actualDimensions = this.getActualNodeDimensions(node.id);

    // Unscale dimensions to get world-space size. Fallback values are already in world-space.
    const standardNodeWidth = actualDimensions
      ? actualDimensions.width / this.viewportScale
      : 120;
    const standardNodeHeight = actualDimensions
      ? actualDimensions.height / this.viewportScale
      : 40;

    // Decision node dimensions (diamond) - these are fixed since they're rotated squares
    const decisionNodeWidth = 100;
    const decisionNodeHeight = 100;

    // Determine node type based on node data (using node ID)
    const nodeType = node.data?.type;

    // Calculate handle position based on node type
    if (
      nodeType === "start_test" ||
      nodeType === "use_app" ||
      nodeType === "airpods_audio_test"
    ) {
      // Standard decision node (Pass/Fail)
      return this.calculateDecisionNodeHandlePosition(
        node,
        handleSuffix,
        decisionNodeWidth,
        decisionNodeHeight,
      );
    } else if (nodeType === "check_if_locked") {
      // Triple decision node (Unlocked/iCloud/MDM)
      return this.calculateTripleDecisionNodeHandlePosition(
        node,
        handleSuffix,
        decisionNodeWidth,
        decisionNodeHeight,
      );
    } else if (
      nodeType === "check_restore_mode" ||
      nodeType === "airpods_oem_test"
    ) {
      // Yes/No decision node
      return this.calculateYesNoDecisionNodeHandlePosition(
        node,
        handleSuffix,
        decisionNodeWidth,
        decisionNodeHeight,
      );
    } else {
      // Standard rectangular node - use actual dimensions
      return this.calculateStandardNodeHandlePosition(
        node,
        handleSuffix,
        standardNodeWidth,
        standardNodeHeight,
      );
    }
  }

  /**
   * Calculate handle position for standard rectangular nodes
   */
  private calculateStandardNodeHandlePosition(
    node: INode,
    handleSuffix: string,
    nodeWidth: number,
    nodeHeight: number,
  ): IPoint {
    if (handleSuffix === "_in") {
      // Input handle: 12px to the left of node, centered vertically (center of 12px handle)
      return {
        x: node.position.x - 6, // Center of handle that extends 12px from node edge
        y: node.position.y + nodeHeight / 2,
      };
    } else {
      // Output handle: 12px to the right of node, centered vertically (center of 12px handle)
      return {
        x: node.position.x + nodeWidth + 6, // Center of handle that extends 12px from node edge
        y: node.position.y + nodeHeight / 2,
      };
    }
  }

  /**
   * Calculate handle position for decision nodes (Pass/Fail)
   * Note: This accounts for the 45-degree rotation transform
   */
  private calculateDecisionNodeHandlePosition(
    node: INode,
    handleSuffix: string,
    nodeWidth: number,
    nodeHeight: number,
  ): IPoint {
    // Decision nodes are rotated 45 degrees, so we need to account for this in our calculations
    const centerX = node.position.x + nodeWidth / 2;
    const centerY = node.position.y + nodeHeight / 2;

    if (handleSuffix === "_in") {
      // Input handle: left side of the diamond
      // After 45-degree rotation, left becomes top-left
      const offsetX = -nodeWidth / 2 - 7; // 7px is half of 14px handle width
      const offsetY = 0;

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else if (handleSuffix === "_out_pass") {
      // Pass handle: top-right side of the diamond (30% from top)
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = -nodeHeight * 0.2; // 30% from top = -20% from center

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else if (handleSuffix === "_out_fail") {
      // Fail handle: bottom-right side of the diamond (70% from top)
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = nodeHeight * 0.2; // 70% from top = +20% from center

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else {
      // Default to center right for unknown suffixes
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = 0;

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    }
  }

  /**
   * Calculate handle position for triple decision nodes (Unlocked/iCloud/MDM)
   * Note: This accounts for the 45-degree rotation transform
   */
  private calculateTripleDecisionNodeHandlePosition(
    node: INode,
    handleSuffix: string,
    nodeWidth: number,
    nodeHeight: number,
  ): IPoint {
    // Triple decision nodes are also rotated 45 degrees
    const centerX = node.position.x + nodeWidth / 2;
    const centerY = node.position.y + nodeHeight / 2;

    if (handleSuffix === "_in") {
      // Input handle: left side of the diamond
      const offsetX = -nodeWidth / 2 - 7;
      const offsetY = 0;

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else if (handleSuffix === "_out_unlocked") {
      // Unlocked handle: top-right side (20% from top)
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = -nodeHeight * 0.3; // 20% from top = -30% from center

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else if (handleSuffix === "_out_icloud") {
      // iCloud handle: middle-right side (50% from top)
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = 0; // 50% from top = 0% from center

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else if (handleSuffix === "_out_mdm") {
      // MDM handle: bottom-right side (80% from top)
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = nodeHeight * 0.3; // 80% from top = +30% from center

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else {
      // Default to center right for unknown suffixes
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = 0;

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    }
  }

  /**
   * Calculate handle position for Yes/No decision nodes
   * Note: This accounts for the 45-degree rotation transform
   */
  private calculateYesNoDecisionNodeHandlePosition(
    node: INode,
    handleSuffix: string,
    nodeWidth: number,
    nodeHeight: number,
  ): IPoint {
    // Yes/No decision nodes are also rotated 45 degrees
    const centerX = node.position.x + nodeWidth / 2;
    const centerY = node.position.y + nodeHeight / 2;

    if (handleSuffix === "_in") {
      // Input handle: left side of the diamond
      const offsetX = -nodeWidth / 2 - 7;
      const offsetY = 0;

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else if (handleSuffix === "_out_yes") {
      // Yes handle: top-right side (30% from top)
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = -nodeHeight * 0.2; // 30% from top = -20% from center

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else if (handleSuffix === "_out_no") {
      // No handle: bottom-right side (70% from top)
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = nodeHeight * 0.2; // 70% from top = +20% from center

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    } else {
      // Default to center right for unknown suffixes
      const offsetX = nodeWidth / 2 + 7;
      const offsetY = 0;

      // Apply rotation transformation
      const rotatedX =
        centerX +
        offsetX * Math.cos(Math.PI / 4) -
        offsetY * Math.sin(Math.PI / 4);
      const rotatedY =
        centerY +
        offsetX * Math.sin(Math.PI / 4) +
        offsetY * Math.cos(Math.PI / 4);

      return { x: rotatedX, y: rotatedY };
    }
  }

  // *** NEW: Transform Utilities ***

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPoint: IPoint): IPoint {
    return {
      x: (screenPoint.x - this.viewportPosition.x) / this.viewportScale,
      y: (screenPoint.y - this.viewportPosition.y) / this.viewportScale,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldPoint: IPoint): IPoint {
    return {
      x: worldPoint.x * this.viewportScale + this.viewportPosition.x,
      y: worldPoint.y * this.viewportScale + this.viewportPosition.y,
    };
  }

  /**
   * Get CSS transform string for canvas
   */
  getCanvasTransform(): string {
    return `translate(${this.viewportPosition.x}px, ${this.viewportPosition.y}px) scale(${this.viewportScale})`;
  }

  /**
   * Get grid pattern offset based on viewport
   */
  getGridOffset(): IPoint {
    const scaledGridSize = this.gridSize * this.viewportScale;
    return {
      x:
        ((this.viewportPosition.x % scaledGridSize) + scaledGridSize) %
        scaledGridSize,
      y:
        ((this.viewportPosition.y % scaledGridSize) + scaledGridSize) %
        scaledGridSize,
    };
  }

  /**
   * Set viewport position and scale
   */
  setViewport(position: IPoint, scale: number, updateUI: boolean = true): void {
    // Mark viewport as transforming for optimized edge calculations
    this.isViewportTransforming = true;

    this.viewportPosition = { ...position };
    this.viewportScale = Math.max(this.minZoom, Math.min(this.maxZoom, scale));

    // Update currentWorkflowData with new snake_case fields if available
    if (this.currentWorkflowData) {
      this.currentWorkflowData.viewport_position_x = position.x;
      this.currentWorkflowData.viewport_position_y = position.y;
      this.currentWorkflowData.viewport_scale = this.viewportScale;
      this.currentWorkflowData.position_x = position.x;
      this.currentWorkflowData.position_y = position.y;
      this.currentWorkflowData.scale = this.viewportScale;
    }

    if (updateUI) {
      this.updateCanvasTransform();
    }

    // Reset transformation flag after a brief delay to allow DOM updates
    setTimeout(() => {
      this.isViewportTransforming = false;
    }, 16); // One frame at 60fps
  }

  /**
   * Update canvas transform and trigger connection updates
   */
  updateCanvasTransform(): void {
    // Trigger change detection to update template bindings
    this.changeDetectorRef.detectChanges();

    // Update connection paths immediately during viewport transformations for smoother performance
    if (this.isOptimizedPanMode || this.isViewportTransforming) {
      this.updateConnectionPaths();
    } else {
      // Use setTimeout for static operations to ensure DOM is ready
      setTimeout(() => {
        this.updateConnectionPaths();
      }, 0);
    }
  }

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private renderer: Renderer2,
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private toastr: ToastrService,
    private documentService: DocumentService, // Inject DocumentService
  ) {
    console.log("WorkflowEditorComponent: Constructor called");
    effect(() => {
      // This effect will automatically run when any of its dependencies (signals) change.
      // Dependencies: this.isFormValid() (which depends on this.name()) and this.isSaveModalVisible.
      if (!this.isSaveModalVisible) return;

      const isValid = this.isFormValid();
      console.log('Form validity changed:', isValid, 'Name value:', this.name());
      
      // Update modal actions with current validation state
      this.updateModalActionsValidation(isValid);
    });
  }

  /**
   * Update modal actions validation state
   */
  private updateModalActionsValidation(isValid: boolean): void {
    if (this.modalActions.length === 0) return;
    
    const saveIndex = this.modalActions.findIndex(a => a.action === 'save');
    if (saveIndex > -1) {
      // Create new array to trigger change detection
      const newActions = [...this.modalActions];
      newActions[saveIndex] = { ...newActions[saveIndex], disabled: !isValid };
      this.modalActions = newActions;
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Handle name input changes and update validation state
   */
  onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.name.set(target.value || '');
    
    // Update validation state immediately
    if (this.isSaveModalVisible) {
      this.updateModalActionsValidation(this.isFormValid());
    }
  }

  /**
   * Handle description input changes
   */
  onDescriptionInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.description.set(target.value || '');
  }

  ngOnInit(): void {
    console.log("WorkflowEditorComponent: ngOnInit started");
    this.renderer.addClass(document.body, "workflow-editor-fullscreen");

    const clientId = localStorage.getItem("clientId");
    console.log(
      "WorkflowEditorComponent: ngOnInit - Client ID from localStorage:",
      clientId,
    );
    if (clientId) {
      this.currentClientId = clientId; // Keep as string here
      this.loadLabelNodes(); // Load labels early if client ID is known
    } else {
      // If no client ID, still ensure nodeTypes are initialized
      this.nodeTypes = [...this.staticNodeTypes];
      this.changeDetectorRef.detectChanges();
    }

    // Initialize ResizeObserver to detect node dimension changes
    this.initializeResizeObserver();

    console.log("WorkflowEditorComponent: ngOnInit finished setup");
  }

  ngOnDestroy(): void {
    console.log("WorkflowEditorComponent: ngOnDestroy called");
    this.renderer.removeClass(document.body, "workflow-editor-fullscreen");
    // Clean up global listeners if they were attached
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);

    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  ngAfterViewInit(): void {
    console.log("WorkflowEditorComponent: ngAfterViewInit started");

    // Defer jsPlumb initialization slightly to ensure DOM is fully ready
    setTimeout(() => {
      console.log(
        "WorkflowEditorComponent: ngAfterViewInit - Attempting jsPlumb initialization inside setTimeout",
      );
      this.jsPlumbInitPromise = this.initializeJsPlumb();

      // Once jsPlumb is initialized, load workflow data and update paths
      this.jsPlumbInitPromise
        .then(() => {
          console.log(
            "WorkflowEditorComponent: ngAfterViewInit - jsPlumb initialized successfully.",
          );

          // Now load workflow based on route params
          this.route.paramMap.subscribe((params) => {
            const id = params.get("id");
            console.log(
              "WorkflowEditorComponent: ngAfterViewInit - Route parameter ID:",
              id,
            );
            if (id) {
              this.loadWorkflowFromServer(id);
            } else {
              console.log(
                "WorkflowEditorComponent: ngAfterViewInit - No ID found, initializing new workflow.",
              );
              this.loadWorkflow(); // Call loadWorkflow for new/empty case
            }
          });

          // Note: Connection paths will be updated after workflow loading is complete
          // No need to call updateConnectionPaths here as it's handled in loadWorkflowFromServer
        })
        .catch((error) => {
          // Handle initialization error (e.g., container still not found for some reason)
          console.error(
            "WorkflowEditorComponent: ngAfterViewInit - Failed to initialize jsPlumb:",
            error,
          );
          this.showToast("Error initializing workflow editor canvas", "error");
        });
    }, 0); // Zero delay setTimeout

    console.log("WorkflowEditorComponent: ngAfterViewInit finished");
  }

  // --- Initialization ---

  initializeJsPlumb(): Promise<void> {
    // Return existing promise if initialization is already in progress or done
    if (this.jsPlumbInitPromise) {
      console.log(
        "jsPlumb initialization already requested, returning existing promise.",
      );
      return this.jsPlumbInitPromise;
    }

    console.log("Initializing jsPlumb...");
    return new Promise((resolve, reject) => {
      if (this.jsPlumbInstance) {
        console.log("jsPlumb already initialized (instance exists)");
        resolve();
        return;
      }

      import("@jsplumb/browser-ui")
        .then((jsPlumbModule) => {
          const container = document.querySelector(
            ".flow-container",
          ) as HTMLElement;
          if (!container) {
            console.warn(
              "Flow container not found in DOM during jsPlumb init.",
            );
            // Reject the promise if the container isn't found, as jsPlumb cannot be initialized.
            reject(new Error("Flow container not found"));
            return;
          }
          try {
            const instance = jsPlumbModule.newInstance({
              container: container,
              connector: {
                type: "Flowchart",
                options: { stub: 30, gap: 5, cornerRadius: 5 },
              },
              endpoint: { type: "Dot", options: { radius: 5 } },
              paintStyle: { stroke: "#567567", strokeWidth: 2 },
              hoverPaintStyle: { stroke: "#5c96bc", strokeWidth: 2 },
              endpointStyle: { fill: "#567567" },
            });
            this.jsPlumbInstance = instance;
            console.log("jsPlumb instance created successfully");
            // Resolve the promise once the instance is created
            resolve();
          } catch (initError) {
            console.error("Error calling jsPlumb newInstance:", initError);
            reject(initError);
          }
        })
        .catch((error) => {
          console.error("Error importing or initializing jsPlumb:", error);
          // Reject the promise on import error
          reject(error);
        });
    });
  }

  // Placeholder for @foblex/flow integration if needed
  onFlowInit(): void {
    console.log("Flow initialized (placeholder)");
    if (!this.jsPlumbInstance) {
      this.initializeJsPlumb();
    }
  }

  loadLabelNodes(): void {
    if (!this.currentClientId) {
      console.warn("Cannot load label nodes without a client ID.");
      this.nodeTypes = [...this.staticNodeTypes];
      this.changeDetectorRef.detectChanges();
      return;
    }
    console.log(`Loading label nodes for client ID: ${this.currentClientId}`);
    // Convert clientId to number for the service call
    const clientIdNumber = parseInt(this.currentClientId, 10);
    if (isNaN(clientIdNumber)) {
      console.error("Invalid client ID format:", this.currentClientId);
      this.showToast("Invalid Client ID", "error");
      this.nodeTypes = [...this.staticNodeTypes];
      this.changeDetectorRef.detectChanges();
      return;
    }
    const isAdmin = getAuthUserData()?.roleSlug === "admin";
    const clientId = isAdmin ? this.currentClientId : clientIdNumber;
    console.log("clientId", clientId, this.currentWorkflowData);

    this.documentService
      .getDocuments({
        page: 1,
        limit: 100,
        sortBy: "name",
        sortDirection: "asc",
        client_id:
          typeof clientId === "string" ? parseInt(clientId, 10) : clientId,
      })
      .subscribe({
        next: (response) => {
          const labels = response.data;
          console.log(`Found ${labels.length} labels for client.`);
          const labelNodeTypes: INodeType[] = labels.map((label: any) => ({
            id: `print_label_${label.id}`,
            label: `Print label: "${label.name}"`,
            color: "#795548",
            type: "print_label",
          }));
          this.nodeTypes = [...this.staticNodeTypes, ...labelNodeTypes];
          this.changeDetectorRef.detectChanges();
          console.log("Updated nodeTypes with dynamic labels:", this.nodeTypes);
        },
        error: (error) => {
          console.error("Error loading labels (documents):", error);
          this.showToast("Error loading label nodes", "error");
          this.nodeTypes = [...this.staticNodeTypes];
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  clearWorkflow(): void {
    console.log("Clearing workflow...");

    // Stop observing all nodes
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // jsPlumb cleanup would go here if used extensively for connections/endpoints
    // For now, just reset internal state
    this.nodes = [];
    this.edges = [];
    this.selectedNode = null;
    this.selectedEdge = null;
    this.nodeTypes = [...this.staticNodeTypes]; // Reset to static types
    this.currentClientId = null; // Reset client ID
    this.changeDetectorRef.detectChanges(); // Update view
  }

  loadWorkflow(): void {
    // Fallback for empty/new workflow
    console.log("Initializing empty workflow canvas...");
    this.clearWorkflow();
    this.nodes = [];
    this.edges = [];
    this.currentWorkflowId = null; // Ensure ID is reset for new workflow
    this.currentWorkflowData = {
      // Initialize minimal data for a new workflow
      canvas_state: { nodes: [], edges: [] },
      position: { x: 0, y: 0 },
      scale: 1,
    };
    this.changeDetectorRef.detectChanges();
    // No need for waitForJsPlumb here, as this is called after init completes in ngOnInit
    console.log("Empty workflow canvas initialized successfully");
    // Initial path update will be handled by ngAfterViewInit
  }

  // --- Navigation & Basic Actions ---
  goBack(): void {
    this.location.back();
  }

  showToast(
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ): void {
    const options = {
      closeButton: true,
      positionClass: "toast-top-right",
      timeOut: 5000,
      progressBar: true,
    };
    switch (type) {
      case "success":
        this.toastr.success(message, "Success", options);
        break;
      case "error":
        this.toastr.error(message, "Error", options);
        break;
      case "warning":
        this.toastr.warning(message, "Warning", options);
        break;
      case "info":
      default:
        this.toastr.info(message, "Information", options);
        break;
    }
  }

  // --- Node Management ---
  addNode(nodeType: INodeType, position?: IPoint): void {
    this.lastSelectedNodeType = nodeType;
    const nodePosition = position
      ? { x: position.x, y: position.y }
      : {
          x: ((this.lastNodePosition.x + 50) % 400) + 100,
          y: this.lastNodePosition.y + (this.lastNodePosition.x > 400 ? 80 : 0),
        };
    this.lastNodePosition = { ...nodePosition };

    const newNode: INode = {
      id: "node_" + Date.now(),
      label: nodeType.label,
      data: { type: nodeType.id },
      position: nodePosition,
      config: {
        style: {
          backgroundColor: nodeType.color,
          borderColor: "rgba(0,0,0,0.2)",
          color: "#fff",
          fontSize: "12px",
          fontFamily: "Arial",
        },
      },
    };
    this.nodes = [...this.nodes, newNode];
    console.log(`Added node "${nodeType.label}" at`, nodePosition);
    this.changeDetectorRef.detectChanges(); // Ensure view updates

    // Observe the new node for resize changes
    setTimeout(() => {
      const nodeElement = document.getElementById(newNode.id + "_node");
      if (nodeElement && this.resizeObserver) {
        this.resizeObserver.observe(nodeElement);
      }
      this.updateConnectionPaths(); // Update connections after node is rendered
    }, 50);
  }

  onNodeSelect(event: MouseEvent, node: INode): void {
    event.stopPropagation(); // Stop event propagation here
    console.log("Node selected:", node.id);
    this.selectedNode = node;
    this.selectedEdge = null; // Deselect edge
    this.updateConnectionPaths(); // Redraw to remove edge selection style
  }

  deleteSelectedNode(): void {
    if (this.selectedNode) {
      const nodeId = this.selectedNode.id;
      console.log("Deleting node:", nodeId);

      // Stop observing the deleted node
      const nodeElement = document.getElementById(nodeId + "_node");
      if (nodeElement && this.resizeObserver) {
        this.resizeObserver.unobserve(nodeElement);
      }

      this.nodes = this.nodes.filter((node) => node.id !== nodeId);
      this.edges = this.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      );
      this.selectedNode = null;
      this.updateConnectionPaths();
    }
  }

  // --- Connection Management ---
  createConnection(
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandleSuffix: string | null,
  ): void {
    const suffix = sourceHandleSuffix || "_out";
    console.log(
      "Attempting to create connection with source handle suffix:",
      suffix,
    );

    const sourceNode = this.nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) {
      console.error(`Source node ${sourceNodeId} not found`);
      return;
    }

    // Determine the actual source handle ID based on node type and suffix
    let sourceHandleId: string;
    const isDecisionNode =
      sourceNode.data.type === "start_test" ||
      sourceNode.data.type === "use_app" ||
      sourceNode.data.type === "check_restore_mode" ||
      sourceNode.data.type === "airpods_audio_test";
    const isYesNoDecisionNode =
      sourceNode.data.type === "check_restore_mode" ||
      sourceNode.data.type === "airpods_oem_test";
    const isTripleDecisionNode = sourceNode.data.type === "check_if_locked";

    if (isDecisionNode) {
      if (["_out_pass", "_out_fail"].includes(suffix)) {
        sourceHandleId = `${sourceNodeId}${suffix}`;
      } else {
        console.warn(
          `Invalid handle suffix '${suffix}' for decision node ${sourceNodeId}. Defaulting to _out.`,
        );
        sourceHandleId = `${sourceNodeId}_out`; // Fallback, though ideally shouldn't happen
      }
    } else if (isYesNoDecisionNode) {
      if (["_out_yes", "_out_no"].includes(suffix)) {
        sourceHandleId = `${sourceNodeId}${suffix}`;
      } else {
        console.warn(
          `Invalid handle suffix '${suffix}' for yes/no decision node ${sourceNodeId}. Defaulting to _out.`,
        );
        sourceHandleId = `${sourceNodeId}_out`; // Fallback, though ideally shouldn't happen
      }
    } else if (isTripleDecisionNode) {
      if (
        suffix === "_out_unlocked" ||
        suffix === "_out_icloud" ||
        suffix === "_out_mdm"
      ) {
        sourceHandleId = `${sourceNodeId}${suffix}`;
      } else {
        console.warn(
          `Invalid handle suffix '${suffix}' for triple decision node ${sourceNodeId}. Defaulting to _out.`,
        );
        sourceHandleId = `${sourceNodeId}_out`; // Fallback, though ideally shouldn't happen
      }
    } else {
      sourceHandleId = `${sourceNodeId}_out`; // Standard nodes only have _out
    }

    const targetHandleId = `${targetNodeId}_in`;

    // Check if this specific connection already exists (same source handle to same target handle)
    const connectionExists = this.edges.some(
      (edge) =>
        edge.sourceHandle === sourceHandleId &&
        edge.targetHandle === targetHandleId,
    );

    if (connectionExists) {
      console.log("Connection already exists:", {
        sourceHandleId,
        targetHandleId,
      });
      return;
    }

    let edgeLabel =
      isDecisionNode || isYesNoDecisionNode || isTripleDecisionNode
        ? this.edgeLabelMap[suffix]
        : undefined;

    const newEdge: IEdge = {
      id: "edge_" + Date.now(),
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: sourceHandleId, // Store the specific handle ID
      targetHandle: targetHandleId, // Assume standard target handle
      data: { label: edgeLabel },
    };

    this.edges = [...this.edges, newEdge];
    console.log("Created new connection:", newEdge);
    setTimeout(() => this.updateConnectionPaths(), 50); // Increased delay slightly
  }

  onConnectionClick(event: MouseEvent, edge: IEdge): void {
    event.stopPropagation(); // Stop event propagation here
    console.log("Connection clicked:", edge.id);
    this.selectedEdge = edge;
    this.selectedNode = null; // Deselect node
    this.updateConnectionPaths(); // Redraw to apply edge selection style
  }

  deleteSelectedConnection(): void {
    if (this.selectedEdge) {
      const edgeId = this.selectedEdge.id;
      console.log("Deleting connection:", edgeId);
      this.edges = this.edges.filter((edge) => edge.id !== edgeId);
      this.selectedEdge = null;
      this.updateConnectionPaths();
    }
  }

  // --- Drag and Drop ---

  onNodeDragStart(nodeType: INodeType): void {
    console.log("Node palette drag start:", nodeType.label);
    this.draggingNodeType = nodeType;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    (event.currentTarget as HTMLElement).classList.add("drag-over");
  }

  onDragLeave(event: DragEvent): void {
    (event.currentTarget as HTMLElement).classList.remove("drag-over");
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const flowContainer = event.currentTarget as HTMLElement;
    flowContainer.classList.remove("drag-over");

    const rect = flowContainer.getBoundingClientRect();
    const screenX = Math.max(0, event.clientX - rect.left);
    const screenY = Math.max(0, event.clientY - rect.top);

    // Convert screen coordinates to world coordinates using the new viewport system
    const worldPosition = this.screenToWorld({ x: screenX, y: screenY });

    console.log(
      "Drop coordinates - screen:",
      { x: screenX, y: screenY },
      "world:",
      worldPosition,
    );

    let nodeType: INodeType | null = this.draggingNodeType;
    if (!nodeType && event.dataTransfer) {
      try {
        const data = event.dataTransfer.getData("application/json");
        if (data) {
          nodeType = JSON.parse(data) as INodeType;
        }
      } catch (e) {
        console.error("Error parsing dragged node data:", e);
      }
    }

    if (nodeType) {
      console.log("Adding node at world position:", worldPosition);
      this.addNode(nodeType, worldPosition);
      this.draggingNodeType = null;
      this.updateLastNodePosition(worldPosition);
    } else {
      console.warn("No valid node type found for drop event");
    }
  }

  // --- Node Dragging Internals ---
  onNodeDragDown(event: MouseEvent, node: INode): void {
    console.log("➡️ [onNodeDragDown] Event Target:", event.target);
    console.log(
      "➡️ [onNodeDragDown] Node:",
      node.id,
      "Current isDraggingNode:",
      this.isDraggingNode,
    );
    if (event.button !== 0) return; // Only left click

    const target = event.target as HTMLElement;

    // More specific check: Only return if the *direct target* has the 'node-handle' class
    if (target && target.classList.contains("node-handle")) {
      console.log(
        "➡️ [onNodeDragDown] Clicked directly on a handle, returning.",
      );
      return;
    }

    event.preventDefault(); // Restore default prevention
    event.stopPropagation(); // Restore propagation stop

    console.log("➡️ [onNodeDragDown] Proceeding to set drag state...");
    // Set dragging state
    this.isDraggingNode = true;
    this.draggedNodeId = node.id;
    this.dragStartPosition = { x: event.clientX, y: event.clientY };
    this.nodeStartPosition = { ...node.position };

    // Select the node
    this.onNodeSelect(event, node);

    console.log(
      "⚠️ DRAG INITIATED for node:",
      node.id,
      "from:",
      this.nodeStartPosition,
      "at cursor:",
      this.dragStartPosition,
    );
    this.changeDetectorRef.detectChanges();
  }

  handleNodeDragMove(event: MouseEvent): void {
    // console.log('⚠️ [handleNodeDragMove] Moving node:', this.draggedNodeId); // Keep this commented for now to reduce noise
    if (!this.isDraggingNode || !this.draggedNodeId) {
      // console.log('Not dragging any node'); // Reduced console noise
      return;
    }

    // Calculate the mouse movement delta, accounting for viewport scale
    const dx = (event.clientX - this.dragStartPosition.x) / this.viewportScale;
    const dy = (event.clientY - this.dragStartPosition.y) / this.viewportScale;

    // Find the node we're dragging
    const nodeIndex = this.nodes.findIndex((n) => n.id === this.draggedNodeId);
    if (nodeIndex === -1) {
      console.error(
        `[handleNodeDragMove] Node not found: ${this.draggedNodeId}`,
      );
      return;
    }

    // Direct position calculation in world coordinates
    const newPosition: IPoint = {
      x: this.nodeStartPosition.x + dx,
      y: this.nodeStartPosition.y + dy,
    };

    // console.log('⚠️ Node movement delta (scaled):', dx, dy, 'New position:', newPosition); // Reduced console noise

    // Create a new nodes array to trigger change detection
    const updatedNodes = [...this.nodes];
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      position: newPosition,
    };

    // Update the nodes array
    this.nodes = updatedNodes;

    // Update connections and force change detection
    this.updateNodeConnections(this.draggedNodeId);
    this.changeDetectorRef.detectChanges();
  }

  handleNodeDragEnd(event: MouseEvent): void {
    // Check if we are actually dragging *this specific type* of thing
    if (!this.isDraggingNode) {
      return;
    }

    console.log(
      "➡️ [handleNodeDragEnd] Ending node drag. Current isDraggingNode:",
      this.isDraggingNode,
    );

    // Find the node and log its final position
    const node = this.nodes.find((n) => n.id === this.draggedNodeId);
    if (node) {
      console.log(
        "⚠️ DRAG ENDED for node:",
        node.id,
        "final position:",
        node.position,
      );
    }

    // Reset drag state
    this.isDraggingNode = false;
    this.draggedNodeId = null;

    // Force UI update
    this.changeDetectorRef.detectChanges();
  }

  updateNodeConnections(nodeId: string): void {
    // Clear cache for the moved node to ensure accurate positions
    this.clearNodeHandlePositionCache(nodeId);

    this.edges.forEach((edge) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.updateConnectionPath(edge);
      }
    });
  }

  // --- Connection Dragging Internals ---
  onConnectionHandleMouseDown(
    event: MouseEvent,
    nodeId: string,
    handleElement: HTMLElement,
    handleSuffix?: string,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    let extractedSuffix = handleSuffix;
    if (!extractedSuffix) {
      const handleId = handleElement.id;
      if (handleId.endsWith("_in")) extractedSuffix = "_in";
      else if (handleId.endsWith("_out_pass")) extractedSuffix = "_out_pass";
      else if (handleId.endsWith("_out_fail")) extractedSuffix = "_out_fail";
      else if (handleId.endsWith("_out_yes")) extractedSuffix = "_out_yes";
      else if (handleId.endsWith("_out_no")) extractedSuffix = "_out_no";
    }

    console.log("Handle mouse down:", { nodeId, suffix: extractedSuffix });

    const allowedOutputSuffixes = [
      "_out",
      "_out_pass",
      "_out_fail",
      "_out_unlocked",
      "_out_icloud",
      "_out_mdm",
      "_out_yes",
      "_out_no",
    ];
    if (!extractedSuffix || !allowedOutputSuffixes.includes(extractedSuffix)) {
      console.log(
        "Cannot start connection from this handle type:",
        extractedSuffix,
      );
      return;
    }

    this.isConnecting = true;
    this.connectionSource = nodeId;
    this.connectionSourceHandleSuffix = extractedSuffix;

    // Calculate handle position using optimized method
    const sourceNode = this.nodes.find((n) => n.id === nodeId);
    if (!sourceNode) return;

    const handlePosition =
      this.getOptimizedHandlePosition(nodeId, extractedSuffix) ||
      this.calculateHandlePosition(sourceNode, extractedSuffix);

    this.connectionSourcePosition = handlePosition;
    this.connectionMousePosition = { ...this.connectionSourcePosition }; // Initial position

    handleElement.classList.add("dragging");
    console.log(
      `Started connection from node: ${nodeId}, handle suffix: ${extractedSuffix}`,
    );
  }

  handleConnectionDragMove(event: MouseEvent): void {
    if (!this.isConnecting) return;

    const flowContainer = document.querySelector(
      ".flow-container",
    ) as HTMLElement;
    if (!flowContainer) return;
    const containerRect = flowContainer.getBoundingClientRect();

    // Get screen coordinates and convert to world coordinates
    const screenPosition = {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top,
    };

    this.connectionMousePosition = this.screenToWorld(screenPosition);

    this.checkForConnectionTarget(event);
    this.updateConnectionLine(); // Draw the temporary line
  }

  handleConnectionDragEnd(event: MouseEvent): void {
    // Clean up the temporary connection path
    const tempPath = document.getElementById("temp-connection-path");
    tempPath?.remove();

    console.log("Connection drag end:", {
      source: this.connectionSource,
      target: this.connectionTarget,
      suffix: this.connectionSourceHandleSuffix,
    });

    if (this.connectionSource && this.connectionTarget) {
      this.createConnection(
        this.connectionSource,
        this.connectionTarget,
        this.connectionSourceHandleSuffix,
      );
    }

    // Cleanup handle classes
    if (this.connectionSource && this.connectionSourceHandleSuffix) {
      const sourceHandle = document.getElementById(
        this.connectionSource + this.connectionSourceHandleSuffix,
      );
      sourceHandle?.classList.remove("dragging");
    }
    if (this.connectionTarget) {
      const targetHandle = document.getElementById(
        this.connectionTarget + "_in",
      );
      targetHandle?.classList.remove("connection-target");
    }

    this.isConnecting = false;
    this.connectionSource = null;
    this.connectionSourceHandleSuffix = null;
    this.connectionTarget = null;
  }

  checkForConnectionTarget(event: MouseEvent): void {
    const element = document.elementFromPoint(
      event.clientX,
      event.clientY,
    ) as HTMLElement;

    // Reset previous target
    if (this.connectionTarget) {
      const prevTargetHandle = document.getElementById(
        this.connectionTarget + "_in",
      );
      prevTargetHandle?.classList.remove("connection-target");
      this.connectionTarget = null;
    }

    if (
      element &&
      element.classList.contains("node-handle") &&
      element.id.endsWith("_in")
    ) {
      const targetNodeId = element.id.replace("_in", "");
      if (targetNodeId !== this.connectionSource) {
        // Prevent self-connection
        this.connectionTarget = targetNodeId;
        element.classList.add("connection-target");
        console.log("Connection target acquired:", targetNodeId);
      }
    }
  }

  updateConnectionLine(): void {
    // Use the existing connections SVG layer for the temporary line
    const connectionsLayer = document.querySelector(
      ".connections-layer",
    ) as SVGSVGElement | null;
    if (!connectionsLayer) return;

    let tempPath = document.getElementById(
      "temp-connection-path",
    ) as unknown as SVGPathElement | null;
    const svgNS = "http://www.w3.org/2000/svg";

    if (!tempPath) {
      tempPath = document.createElementNS(svgNS, "path");
      tempPath.id = "temp-connection-path";
      tempPath.setAttribute("stroke", "#3498db");
      tempPath.setAttribute("stroke-width", "2");
      tempPath.setAttribute("fill", "none");
      tempPath.setAttribute("stroke-dasharray", "5,5");
      tempPath.setAttribute("pointer-events", "none");
      connectionsLayer.appendChild(tempPath);
    }

    // Use world coordinates directly (no offset needed)
    const sourceX = this.connectionSourcePosition.x;
    const sourceY = this.connectionSourcePosition.y;
    const targetX = this.connectionMousePosition.x;
    const targetY = this.connectionMousePosition.y;

    // Use the new path calculation method with 20px rightward offset
    const pathData = this.calculatePathData(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
    );

    tempPath.setAttribute("d", pathData);
  }

  // --- Edge Dragging Internals (Reconnecting/Disconnecting) ---
  onEdgeDragStart(event: MouseEvent, edge: IEdge): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    this.isDraggingEdge = true;
    this.draggedEdgeId = edge.id;
    this.draggedEdgeSource = edge.source;
    this.draggedEdgeSourceHandleSuffix =
      edge.sourceHandle?.replace(edge.source, "") || "_out";
    this.draggedEdgeTarget = edge.target;
    this.draggedEdgeStartPosition = { x: event.clientX, y: event.clientY };
    this.selectedEdge = edge;
    this.selectedNode = null;

    const pathElement = document.getElementById("connection-" + edge.id);
    pathElement?.classList.add("selected", "dragging");

    console.log("Started dragging edge:", edge.id);
  }

  handleEdgeDragMove(event: MouseEvent): void {
    if (
      !this.isDraggingEdge ||
      !this.draggedEdgeId ||
      !this.draggedEdgeSource ||
      !this.draggedEdgeSourceHandleSuffix
    )
      return;

    const path = document.getElementById(
      "connection-" + this.draggedEdgeId,
    ) as unknown as SVGPathElement | null;
    if (!path) return;

    const flowContainer = document.querySelector(
      ".flow-container",
    ) as HTMLElement;
    if (!flowContainer) return;
    const containerRect = flowContainer.getBoundingClientRect();

    // Get source node and handle information
    const sourceNode = this.nodes.find((n) => n.id === this.draggedEdgeSource);
    if (!sourceNode) return;

    const sourceHandle = document.getElementById(
      this.draggedEdgeSource + this.draggedEdgeSourceHandleSuffix,
    );
    if (!sourceHandle) return;

    // Calculate source position using optimized method
    const sourcePosition =
      this.getOptimizedHandlePosition(
        this.draggedEdgeSource,
        this.draggedEdgeSourceHandleSuffix,
      ) ||
      this.calculateHandlePosition(
        sourceNode,
        this.draggedEdgeSourceHandleSuffix,
      );

    const sourceWorldX = sourcePosition.x;
    const sourceWorldY = sourcePosition.y;

    // Calculate target position in world coordinates
    const screenX = event.clientX - containerRect.left;
    const screenY = event.clientY - containerRect.top;
    const mouseWorldPosition = this.screenToWorld({ x: screenX, y: screenY });
    let targetWorldX = mouseWorldPosition.x;
    let targetWorldY = mouseWorldPosition.y;

    const elementUnderMouse = document.elementFromPoint(
      event.clientX,
      event.clientY,
    ) as HTMLElement | null;
    const isOverInputHandle =
      elementUnderMouse?.classList.contains("node-handle") &&
      elementUnderMouse.id.endsWith("_in");
    let potentialTargetId: string | null = null;

    if (isOverInputHandle && elementUnderMouse) {
      potentialTargetId = elementUnderMouse.id.replace("_in", "");
      if (potentialTargetId !== this.draggedEdgeSource) {
        // Calculate target handle position using optimized method
        const targetNode = this.nodes.find((n) => n.id === potentialTargetId);
        if (targetNode) {
          const targetPosition =
            this.getOptimizedHandlePosition(potentialTargetId, "_in") ||
            this.calculateHandlePosition(targetNode, "_in");

          targetWorldX = targetPosition.x;
          targetWorldY = targetPosition.y;
        }
      } else {
        potentialTargetId = null; // Cannot reconnect to self
      }
    }

    // Use world coordinates directly (no offset needed)
    const sourceX = sourceWorldX;
    const sourceY = sourceWorldY;
    const targetX = targetWorldX;
    const targetY = targetWorldY;

    // Use the new path calculation method with 20px rightward offset
    const pathData = this.calculatePathData(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
    );

    path.setAttribute("d", pathData);

    // Update visual state (disconnectable/reconnectable)
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - this.draggedEdgeStartPosition.x, 2) +
        Math.pow(event.clientY - this.draggedEdgeStartPosition.y, 2),
    );
    const threshold = 50;
    path.classList.remove("disconnectable", "reconnectable");
    document
      .querySelectorAll(".node-handle.connection-target")
      .forEach((h) => h.classList.remove("connection-target"));

    if (dragDistance > threshold) {
      if (potentialTargetId) {
        path.classList.add("reconnectable");
        elementUnderMouse?.classList.add("connection-target"); // Optional chaining
      } else {
        path.classList.add("disconnectable");
      }
    }
  }

  handleEdgeDragEnd(event: MouseEvent): void {
    if (
      !this.isDraggingEdge ||
      !this.draggedEdgeId ||
      !this.draggedEdgeSource ||
      !this.draggedEdgeSourceHandleSuffix
    )
      return;

    const path = document.getElementById("connection-" + this.draggedEdgeId);
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - this.draggedEdgeStartPosition.x, 2) +
        Math.pow(event.clientY - this.draggedEdgeStartPosition.y, 2),
    );
    const threshold = 50;

    const elementUnderMouse = document.elementFromPoint(
      event.clientX,
      event.clientY,
    ) as HTMLElement | null;
    const isOverInputHandle =
      elementUnderMouse?.classList.contains("node-handle") &&
      elementUnderMouse.id.endsWith("_in");
    let newTargetId: string | null = null;

    if (isOverInputHandle && elementUnderMouse) {
      newTargetId = elementUnderMouse.id.replace("_in", "");
      if (newTargetId === this.draggedEdgeSource) {
        newTargetId = null; // Cannot connect to self
      }
    }

    // Remove highlights
    path?.classList.remove("dragging", "disconnectable", "reconnectable");
    document
      .querySelectorAll(".node-handle.connection-target")
      .forEach((h) => h.classList.remove("connection-target"));

    const edgeIndex = this.edges.findIndex((e) => e.id === this.draggedEdgeId);
    if (edgeIndex === -1) {
      console.error("Dragged edge not found in edges array!");
      this.resetEdgeDragState();
      return;
    }

    if (newTargetId && dragDistance > threshold) {
      // Reconnect
      console.log(
        `Reconnecting edge ${this.draggedEdgeId} from ${this.draggedEdgeSource} to ${newTargetId}`,
      );
      const originalEdge = this.edges[edgeIndex];
      const sourceHandleId =
        originalEdge.sourceHandle ||
        `${this.draggedEdgeSource}${this.draggedEdgeSourceHandleSuffix}`;
      const targetHandleId = `${newTargetId}_in`;

      // Check if this exact connection already exists
      const connectionExists = this.edges.some(
        (edge) =>
          edge.sourceHandle === sourceHandleId &&
          edge.targetHandle === targetHandleId,
      );

      if (!connectionExists) {
        const updatedEdges = [...this.edges];
        updatedEdges[edgeIndex] = {
          ...originalEdge,
          target: newTargetId,
          targetHandle: targetHandleId,
        };
        this.edges = updatedEdges;
        this.selectedEdge = updatedEdges[edgeIndex]; // Keep reconnected edge selected
        console.log("Edge reconnected", updatedEdges[edgeIndex]);
      } else {
        console.log(
          "Connection to target already exists, cancelling reconnect.",
        );
        this.selectedEdge = originalEdge; // Re-select original if reconnect failed
      }
    } else if (dragDistance > threshold) {
      // Disconnect (Delete)
      console.log("Disconnecting edge:", this.draggedEdgeId);
      this.deleteSelectedConnection(); // This resets selectedEdge to null
    } else {
      // Drag didn't meet threshold, keep edge selected
      this.selectedEdge = this.edges[edgeIndex];
    }

    this.updateConnectionPaths(); // Redraw all connections
    this.resetEdgeDragState();
  }

  resetEdgeDragState(): void {
    this.isDraggingEdge = false;
    this.draggedEdgeId = null;
    this.draggedEdgeSource = null;
    this.draggedEdgeSourceHandleSuffix = null;
    this.draggedEdgeTarget = null;
  }

  // --- Connection Path Updates ---
  updateConnectionPaths(): void {
    console.log(`Updating ${this.edges.length} connection paths.`);
    console.log('Current edges:', this.edges);
    console.log('Current nodes:', this.nodes);
    
    // Check if SVG layer exists
    const svgLayer = document.querySelector('.connections-layer');
    console.log('SVG connections layer found:', svgLayer);
    
    this.edges.forEach((edge) => this.updateConnectionPath(edge));
    this.changeDetectorRef.detectChanges(); // Necessary if path data is bound in template
  }

  /**
   * Calculate path data with proper bends and no direction reversals
   * Always starts right, then uses vertical movement to change levels, then horizontal to target
   */
  private calculatePathData(
    sourcePosition: IPoint,
    targetPosition: IPoint,
  ): string {
    const startRightX = sourcePosition.x + 20;
    const startRightY = sourcePosition.y;

    const isTargetToRight = targetPosition.x > startRightX;

    let pathData: string;

    if (isTargetToRight) {
      // Target is to the right
      const verticalX =
        startRightX + Math.abs(targetPosition.x - startRightX) / 2;
      pathData =
        `M ${sourcePosition.x},${sourcePosition.y} ` +
        `L ${startRightX},${startRightY} ` +
        `L ${verticalX},${startRightY} ` +
        `L ${verticalX},${targetPosition.y} ` +
        `L ${targetPosition.x},${targetPosition.y}`;
    } else {
      // Target is to the left
      const verticalX = startRightX + 30; // Go a bit further right before going up/down

      // Determine if we should go up or down
      const isTargetAbove = targetPosition.y < startRightY;
      const verticalOffset = isTargetAbove ? -40 : 40; // Adjust as needed

      const bendY = startRightY + verticalOffset;

      pathData =
        `M ${sourcePosition.x},${sourcePosition.y} ` +
        `L ${startRightX},${startRightY} ` +
        `L ${verticalX},${startRightY} ` +
        `L ${verticalX},${bendY} ` + // Move up or down to clear node
        `L ${targetPosition.x - 30},${bendY} ` + // Move left towards target, stopping short
        `L ${targetPosition.x - 30},${targetPosition.y} ` + // Move vertically to target Y
        `L ${targetPosition.x},${targetPosition.y}`; // Final horizontal to target
    }

    return pathData;
  }

  updateConnectionPath(edge: IEdge): void {
    console.log(`Updating connection path for edge: ${edge.id}, source: ${edge.source}, target: ${edge.target}`);
    
    const sourceNode = this.nodes.find((n) => n.id === edge.source);
    const targetNode = this.nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      console.warn(
        `Nodes not found for edge ${edge.id}. Source: ${edge.source}, Target: ${edge.target}`,
      );
      return;
    }

    // Use the stored handle IDs, fallback if necessary
    const sourceHandleId = edge.sourceHandle || `${edge.source}_out`;
    const targetHandleId = edge.targetHandle || `${edge.target}_in`;

    const sourceHandle = document.getElementById(sourceHandleId);
    const targetHandle = document.getElementById(targetHandleId);

    if (!sourceHandle || !targetHandle) {
      // It might take a moment for handles to render, especially for new nodes
      console.warn(
        `Handles not found for edge ${edge.id}. Source ID: ${sourceHandleId}, Target ID: ${targetHandleId}. Retrying update might be needed if elements appear later.`,
      );
      return;
    }

    // Extract handle suffixes for position calculation
    const sourceHandleSuffix = sourceHandleId.replace(edge.source, "");
    const targetHandleSuffix = targetHandleId.replace(edge.target, "");

    // Use optimized handle position calculation for better performance
    let sourcePosition: IPoint;
    let targetPosition: IPoint;

    // Get optimized handle positions (uses cache during pan operations)
    sourcePosition =
      this.getOptimizedHandlePosition(edge.source, sourceHandleSuffix) ||
      this.calculateHandlePosition(sourceNode, sourceHandleSuffix);

    targetPosition =
      this.getOptimizedHandlePosition(edge.target, targetHandleSuffix) ||
      this.calculateHandlePosition(targetNode, targetHandleSuffix);

    // Use the new path calculation method with 20px rightward offset
    const pathData = this.calculatePathData(sourcePosition, targetPosition);

    const pathElement = document.getElementById("connection-" + edge.id);
    console.log(`Looking for path element with ID: connection-${edge.id}, found:`, pathElement);
    
    if (pathElement) {
      console.log(`Setting path data for edge ${edge.id}:`, pathData);
      pathElement.setAttribute("d", pathData);
      // Update styles based on selection/dragging state
      pathElement.classList.toggle(
        "selected",
        this.selectedEdge?.id === edge.id,
      );
    } else {
      // Path element might not be in the DOM yet if edges were loaded before template rendering
      console.warn(
        `Path element 'connection-${edge.id}' not found for edge ${edge.id}. Ensure SVG elements are rendered before path updates.`,
      );
      
      // Let's check what SVG elements are actually in the DOM
      const allPaths = document.querySelectorAll('.connections-layer path');
      console.log(`Found ${allPaths.length} path elements in connections layer:`, Array.from(allPaths).map(p => p.id));
    }
  }

  // --- Canvas Interaction ---
  onCanvasClick(event: MouseEvent): void {
    if (
      this.isDraggingNode ||
      this.isConnecting ||
      this.isDraggingEdge ||
      this.isPanning
    ) {
      return;
    }

    const target = event.target as HTMLElement;
    const isNodeOrHandle = target.closest(
      ".custom-node, .decision-node, .node-handle, .connection-path",
    );

    if (!isNodeOrHandle) {
      console.log("Canvas clicked, clearing selections.");
      this.selectedNode = null;
      this.selectedEdge = null;
      this.updateConnectionPaths(); // Redraw to remove selection styles
    }

    // Double click logic
    const now = Date.now();
    const timeDiff = now - this.lastClickTime;
    const flowContainer = event.currentTarget as HTMLElement;
    const rect = flowContainer.getBoundingClientRect();
    const screenX = Math.max(0, event.clientX - rect.left);
    const screenY = Math.max(0, event.clientY - rect.top);
    const xDiff = Math.abs(screenX - this.lastClickPosition.x);
    const yDiff = Math.abs(screenY - this.lastClickPosition.y);

    if (timeDiff < 300 && xDiff < 10 && yDiff < 10 && !isNodeOrHandle) {
      console.log("Double-click detected on canvas at screen coords", {
        screenX,
        screenY,
      });

      // Convert screen coordinates to world coordinates for infinite canvas
      const worldPosition = this.screenToWorld({ x: screenX, y: screenY });
      console.log("Double-click world position:", worldPosition);

      if (this.lastSelectedNodeType) {
        this.addNode(this.lastSelectedNodeType, worldPosition);
      } else if (this.nodeTypes.length > 0) {
        this.addNode(this.nodeTypes[0], worldPosition); // Default to first type
      }
      this.lastClickTime = 0; // Reset double-click timer
      return;
    }

    this.lastClickTime = now;
    this.lastClickPosition = { x: screenX, y: screenY };
  }

  // Enhanced canvas mouse down handler for pan detection
  onCanvasMouseDown(event: MouseEvent): void {
    console.log("🖱️ Canvas mouse down at:", event.clientX, event.clientY);

    // Only start panning if we're not doing other operations
    if (!this.isDraggingNode && !this.isConnecting && !this.isDraggingEdge) {
      this.onCanvasPanStart(event);
    }
  }

  // --- Context Menu ---
  onConnectionContextMenu(event: MouseEvent, edge: IEdge): void {
    event.preventDefault();
    event.stopPropagation();
    this.onConnectionClick(event, edge); // Select the edge
    const menuItems: IContextMenuAction[] = [
      {
        label: "Delete Connection",
        icon: "unlink",
        action: () => this.deleteSelectedConnection(),
      },
    ];
    this.showContextMenu(event, menuItems);
  }

  showContextMenu(event: MouseEvent, items: IContextMenuAction[]): void {
    this.contextMenuItems = items;
    this.contextMenuPosition = { x: event.clientX + 5, y: event.clientY + 5 };
    this.contextMenuVisible = true;
    this.changeDetectorRef.detectChanges();
  }

  hideContextMenu(): void {
    this.contextMenuVisible = false;
    this.contextMenuItems = [];
    this.changeDetectorRef.detectChanges();
  }

  // Handle generic modal actions
  onModalAction(action: string): void {
    if (action === 'cancel') {
      this.closeSaveModal();
      return;
    }
    if (action === 'save') {
      this.nameTouched.set(true);
      if (!this.isFormValid()) return;
      this.handleSaveWorkflow({
        name: this.name(),
        description: this.description() || '',
      });
    }
  }

  executeContextMenuAction(action: () => void): void {
    action();
    this.hideContextMenu();
  }

  // --- Global Event Handlers ---
  @HostListener("document:mousemove", ["$event"])
  onMouseMove = (event: MouseEvent): void => {
    // Disable for debugging performance
    // console.log('[onMouseMove] Mouse position:', event.clientX, event.clientY);
    console.log(
      `➡️ [onMouseMove] State check: isDraggingNode=${this.isDraggingNode}, isConnecting=${this.isConnecting}, isDraggingEdge=${this.isDraggingEdge}, isPanning=${this.isPanning}`,
    );

    if (this.isDraggingNode) {
      // console.log('[onMouseMove] Dragging node:', this.draggedNodeId, 'to:', event.clientX, event.clientY); // Keep commented to reduce noise
      this.handleNodeDragMove(event);
    } else if (this.isConnecting) {
      this.handleConnectionDragMove(event);
    } else if (this.isDraggingEdge) {
      this.handleEdgeDragMove(event);
    } else if (this.isPanning) {
      this.onCanvasPanMove(event);
    }
  };

  @HostListener("document:mouseup", ["$event"])
  onMouseUp = (event: MouseEvent): void => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `➡️ [onMouseUp @ ${timestamp}] State check: isDraggingNode=${this.isDraggingNode}, isConnecting=${this.isConnecting}, isDraggingEdge=${this.isDraggingEdge}, isPanning=${this.isPanning}`,
    );
    if (this.isDraggingNode) {
      this.handleNodeDragEnd(event);
    }
    if (this.isConnecting) {
      this.handleConnectionDragEnd(event);
    }
    if (this.isDraggingEdge) {
      this.handleEdgeDragEnd(event);
    }
    if (this.isPanning) {
      this.onCanvasPanEnd();
    }
  };

  // Close context menu on outside click
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (this.contextMenuVisible) {
      const targetElement = event.target as HTMLElement;
      if (!targetElement.closest(".context-menu")) {
        this.hideContextMenu();
      }
    }
  }

  // Keyboard shortcuts
  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Delete" || event.key === "Backspace") {
      if (this.selectedEdge) {
        this.deleteSelectedConnection();
      } else if (this.selectedNode) {
        this.deleteSelectedNode();
      }
    }
  }

  // --- Save/Load Workflow ---
  openSaveModal(): void {
    const hasStartNode = this.nodes.some(
      (node) => node.data.type === "connect_iphone",
    );
    if (!hasStartNode) {
      this.showToast(
        "Workflow must contain a 'Start: Connect iPhone' node before saving.",
        "error",
      );
      return;
    }
    this.prepareWorkflowData();
    if (!this.currentWorkflowData) {
      this.showToast("Failed to prepare workflow data for saving.", "error");
      return;
    }
    // Initialize signal form values
    this.name.set(this.currentWorkflowData.name || "");
    this.description.set(this.currentWorkflowData.description || "");
  
    this.nameTouched.set(false);
    
    // Configure modal actions with initial validation state
    this.modalActions = [
      { label: "Cancel", variant: "ghost", action: "cancel" },
      { label: this.currentWorkflowId ? "Update" : "Save", variant: "primary", action: "save", disabled: !this.isFormValid() },
    ];
    
    // Show modal after actions are configured
    this.isSaveModalVisible = true;
    
    // Force validation update after modal is shown
    setTimeout(() => {
      this.updateModalActionsValidation(this.isFormValid());
    }, 0);
  }

  closeSaveModal(): void {
    this.isSaveModalVisible = false;
  }

  prepareWorkflowData(): void {
    try {
      const nodesSnapshot = this.nodes.map((node) => ({
        // Deep copy might be needed
        ...node,
        position: { ...node.position },
        data: { ...node.data },
        config: node.config
          ? {
              ...node.config,
              style: node.config.style ? { ...node.config.style } : undefined,
            }
          : undefined,
      }));

      const edgesSnapshot = this.edges.map((edge) => ({
        // Deep copy
        ...edge,
        data: edge.data ? { ...edge.data } : undefined,
      }));

      // Get current viewport state (prefer new properties, fallback to old ones)
      const currentPosition =
        this.currentWorkflowData?.viewportPosition ||
        this.currentWorkflowData?.position ||
        this.viewportPosition;
      const currentScale =
        this.currentWorkflowData?.viewportScale ||
        this.currentWorkflowData?.scale ||
        this.viewportScale;

      const existingData = this.currentWorkflowData || {
        canvas_state: { nodes: [], edges: [] },
      }; // Base existing data

      this.currentWorkflowData = {
        ...existingData, // Preserve existing name, desc, client_id etc.
        id: this.currentWorkflowId || undefined,
        // New snake_case properties for database
        position_x: currentPosition.x,
        position_y: currentPosition.y,
        scale: currentScale,
        viewport_position_x: this.viewportPosition.x,
        viewport_position_y: this.viewportPosition.y,
        viewport_scale: this.viewportScale,
        grid_visible: this.gridVisible,
        grid_size: this.gridSize,
        is_published: true,
        // Backward compatibility properties (legacy)
        position: currentPosition,
        viewportPosition: { ...this.viewportPosition },
        viewportScale: this.viewportScale,
        gridVisible: this.gridVisible,
        gridSize: this.gridSize,
        canvas_state: {
          nodes: nodesSnapshot,
          edges: edgesSnapshot,
        },
      };
      console.log(
        "Prepared workflow data for saving",
        this.currentWorkflowData,
      );
    } catch (error) {
      console.error("Error preparing workflow data:", error);
      this.showToast("Error preparing workflow", "error");
      this.currentWorkflowData = null; // Invalidate data on error
    }
  }

  saveWorkflow(): void {
    // Likely just calls prepareWorkflowData, actual save triggered by modal
    console.log("Preparing workflow data (saveWorkflow called)...");
    this.prepareWorkflowData();
    // The actual saving happens in handleSaveWorkflow
  }

  handleSaveWorkflow(formData: {
    name: string;
    description: string;
  }): void {
    if (!formData.name) {
      this.showToast("Workflow name is required.", "error");
      return;
    }
    console.log("Handling workflow save:", formData);
    if (!this.currentWorkflowData || !this.currentWorkflowData.canvas_state) {
      // Check canvas_state too
      this.showToast("Workflow data not prepared correctly", "error");
      return;
    }

    // Construct the data payload, ensuring all required fields are present
    const saveData: IWorkflow = {
      name: formData.name,
      description: formData.description,
      canvas_state: this.currentWorkflowData.canvas_state,
      // New snake_case properties for database
      position_x: this.currentWorkflowData.position_x ?? 0,
      position_y: this.currentWorkflowData.position_y ?? 0,
      scale: this.currentWorkflowData.scale || 1,
      viewport_position_x: this.currentWorkflowData.viewport_position_x ?? 0,
      viewport_position_y: this.currentWorkflowData.viewport_position_y ?? 0,
      viewport_scale: this.currentWorkflowData.viewport_scale || 1,
      grid_visible: this.currentWorkflowData.grid_visible ?? true,
      grid_size: this.currentWorkflowData.grid_size || 20,
      is_published: true,
      // Backward compatibility properties (legacy)
      position: this.currentWorkflowData.position || { x: 0, y: 0 },
      viewportPosition: this.currentWorkflowData.viewportPosition || { x: 0, y: 0 },
      viewportScale: this.currentWorkflowData.viewportScale || 1,
      gridVisible: this.currentWorkflowData.gridVisible ?? true,
      gridSize: this.currentWorkflowData.gridSize || 20,
      isPublished: true,
    };

    if (this.currentWorkflowId) {
      this.updateExistingWorkflow(this.currentWorkflowId, saveData);
    } else {
      this.createNewWorkflow(saveData);
    }
  }

  createNewWorkflow(workflowData: IWorkflow): void {
    this.workflowService.createWorkflow(workflowData).subscribe({
      next: (response: any) => {
        console.log("Workflow created successfully:", response);
        this.showToast("Workflow saved successfully", "success");
        this.closeSaveModal();
        // Navigate back to the workflows list after successful creation
        this.router.navigate(["/workflows"]);
      },
      error: (error: any) => {
        console.error("Error creating workflow:", error);
        this.showToast(
          "Error creating workflow: " +
            (error?.error?.message || "Unknown error"),
          "error",
        );
      },
    });
  }

  updateExistingWorkflow(id: string, workflowData: IWorkflow): void {
    this.workflowService.updateWorkflow(id, workflowData).subscribe({
      next: (response: any) => {
        console.log("Workflow updated successfully:", response);
        this.showToast("Workflow updated successfully", "success");
        this.closeSaveModal();
        // Navigate back to the workflows list after successful update
        this.router.navigate(["/workflows"]);
      },
      error: (error: any) => {
        console.error("Error updating workflow:", error);
        this.showToast(
          "Error updating workflow: " +
            (error?.error?.message || "Unknown error"),
          "error",
        );
      },
    });
  }

  loadWorkflowFromServer(id: string): void {
    console.log(`Loading workflow ID ${id}...`);
    // Use the updated IWorkflow interface for the subscription type
    this.workflowService.getWorkflow(id).subscribe({
      next: (workflow: IWorkflow | null) => {
        console.log('✅ HTTP Response received:', workflow);
        console.log('Response type:', typeof workflow);
        console.log('Response keys:', workflow ? Object.keys(workflow) : 'null');
        // Use adjusted IWorkflow
        // Check for workflow AND canvas_state before proceeding
        if (!workflow || !workflow.canvas_state) {
          this.showToast("Workflow not found or has invalid data", "error");
          this.loadWorkflow(); // fallback: load an empty workflow
          return;
        }

        // Check if this is actually label template data (not workflow data)
        const canvasState = workflow.canvas_state as any; // Type assertion to handle different data structures
        if (canvasState.version && canvasState.canvas && 
            (!canvasState.nodes || !Array.isArray(canvasState.nodes))) {
          console.warn('Detected label template data instead of workflow data');
          this.showToast("This appears to be label template data, not workflow data. Please use the label template editor.", "warning");
          this.loadWorkflow(); // fallback: load an empty workflow
          return;
        }

        // Validate that canvas_state has the expected workflow structure
        if (!canvasState.nodes || !Array.isArray(canvasState.nodes) ||
            !canvasState.edges || !Array.isArray(canvasState.edges)) {
          console.warn('Canvas state does not have expected workflow structure:', canvasState);
          this.showToast("Invalid workflow data structure. Canvas state must contain nodes and edges arrays.", "error");
          this.loadWorkflow(); // fallback: load an empty workflow
          return;
        }

        this.currentWorkflowId = workflow.id?.toString() ?? null;
        // Note: clientId is not part of the workflow schema, it's stored in localStorage
        this.loadLabelNodes(); // Load labels based on client ID from localStorage

        // Now safe to access canvas_state
        console.log('Loading canvas state:', canvasState);
        this.nodes = canvasState.nodes.map((node: any) => ({ ...node }));
        this.edges = canvasState.edges.map((edge: any) => ({ ...edge }));
        
        console.log(`Loaded ${this.nodes.length} nodes:`, this.nodes);
        console.log(`Loaded ${this.edges.length} edges:`, this.edges);

        // Store the loaded data
        this.currentWorkflowData = { ...workflow };

        // Load viewport settings (prefer new snake_case properties, fallback to old ones)
        let viewportPosition: IPoint;
        if (workflow.viewport_position_x !== null && workflow.viewport_position_x !== undefined && 
            workflow.viewport_position_y !== null && workflow.viewport_position_y !== undefined) {
          viewportPosition = { x: workflow.viewport_position_x, y: workflow.viewport_position_y };
        } else if (workflow.viewportPosition) {
          viewportPosition = workflow.viewportPosition;
        } else if (workflow.position) {
          viewportPosition = workflow.position;
        } else {
          viewportPosition = { x: 0, y: 0 };
        }
        
        const viewportScale = (workflow.viewport_scale !== null ? workflow.viewport_scale : workflow.viewportScale || workflow.scale) || 1;
        const gridVisible = (workflow.grid_visible !== null ? workflow.grid_visible : workflow.gridVisible) ?? true;
        const gridSize = (workflow.grid_size !== null ? workflow.grid_size : workflow.gridSize) || 20;

        // Update viewport state
        this.gridVisible = gridVisible;
        this.gridSize = gridSize;

        // Apply canvas transform
        this.applyCanvasTransform(viewportPosition, viewportScale);

        this.changeDetectorRef.detectChanges();
        console.log(
          `Loaded ${this.nodes.length} nodes and ${this.edges.length} edges`,
        );

        // Force change detection to ensure nodes are rendered
        this.changeDetectorRef.detectChanges();
        
        // Wait for DOM to be fully rendered before setting up observers and connections
        setTimeout(() => {
          // First, ensure all nodes are properly rendered
          this.nodes.forEach((node) => {
            const nodeElement = document.getElementById(node.id + "_node");
            if (nodeElement && this.resizeObserver) {
              this.resizeObserver.observe(nodeElement);
            }
          });
          
          // Force another change detection to ensure everything is rendered
          this.changeDetectorRef.detectChanges();
          
          // Wait a bit more for any final rendering
          setTimeout(() => {
            console.log("Updating connection paths after load...");
            
            // Check if SVG layer is ready
            const svgLayer = document.querySelector('.connections-layer');
            if (svgLayer) {
              console.log('SVG layer is ready, updating connections...');
              this.updateConnectionPaths();
            } else {
              console.warn('SVG layer not ready yet, retrying...');
              // Retry after a bit more time
              setTimeout(() => {
                this.updateConnectionPaths();
              }, 100);
            }
            
            // Final change detection to ensure connections are visible
            this.changeDetectorRef.detectChanges();
          }, 100);
        }, 200);
      },
      error: (error: any) => {
        console.error("❌ Error loading workflow from server:", error);
        console.error("Error details:", {
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText,
          url: error?.url,
          response: error?.error
        });
        this.showToast("Error loading workflow from server", "error");
        this.loadWorkflow();
      },
      complete: () => {
        console.log("✅ Observable completed");
      }
    });
  }

  // Helper to apply loaded canvas transform
  applyCanvasTransform(position: IPoint, scale: number): void {
    // Update the new viewport system
    this.setViewport(position, scale, false);

    // Update backward compatibility properties
    if (this.currentWorkflowData) {
      this.currentWorkflowData.position = { ...position };
      this.currentWorkflowData.scale = scale;

      // Also update the new properties for consistency
      this.currentWorkflowData.viewportPosition = { ...position };
      this.currentWorkflowData.viewportScale = scale;
      
      // Update new snake_case properties
      this.currentWorkflowData.position_x = position.x;
      this.currentWorkflowData.position_y = position.y;
      this.currentWorkflowData.viewport_position_x = position.x;
      this.currentWorkflowData.viewport_position_y = position.y;
      this.currentWorkflowData.viewport_scale = scale;

      console.log("Applying loaded transform:", { position, scale });
      this.updateCanvasTransform(); // Use the new method
    }
  }

  // *** NEW: Pan and Zoom Event Handlers ***

  /**
   * Handle mouse wheel for zooming
   */
  @HostListener("wheel", ["$event"])
  onWheel(event: WheelEvent): void {
    if (
      event.target &&
      (event.target as HTMLElement).closest(".flow-container")
    ) {
      event.preventDefault();

      // Get mouse position relative to canvas
      const canvasRect = (event.target as HTMLElement)
        .closest(".flow-container")
        ?.getBoundingClientRect();
      if (!canvasRect) return;

      const mouseX = event.clientX - canvasRect.left;
      const mouseY = event.clientY - canvasRect.top;

      // Calculate zoom delta - use a smaller step for wheel zooming (more granular)
      const wheelZoomStep = this.zoomStep * 0.5; // Half the button zoom step for smoother wheel zooming
      const zoomDelta = event.deltaY > 0 ? -wheelZoomStep : wheelZoomStep;
      const newScale = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.viewportScale + zoomDelta),
      );

      if (newScale !== this.viewportScale) {
        // Calculate new position to zoom towards cursor
        const scaleRatio = newScale / this.viewportScale;
        const newX = mouseX - (mouseX - this.viewportPosition.x) * scaleRatio;
        const newY = mouseY - (mouseY - this.viewportPosition.y) * scaleRatio;

        // Clear cache on scale changes to ensure accuracy at different zoom levels
        this.clearHandlePositionCache();

        this.setViewport({ x: newX, y: newY }, newScale);
      }
    }
  }

  /**
   * Handle pan start on canvas
   */
  onCanvasPanStart(event: MouseEvent): void {
    // Check if clicked on empty canvas area (not on nodes or handles)
    const target = event.target as HTMLElement;
    if (
      target.classList.contains("flow-container") ||
      target.classList.contains("connections-layer")
    ) {
      this.isPanning = true;
      this.isOptimizedPanMode = true; // Enable optimized pan mode for better performance
      this.panStartPosition = { x: event.clientX, y: event.clientY };
      this.panStartViewport = { ...this.viewportPosition };

      // Update cursor
      const flowContainer = document.querySelector(
        ".flow-container",
      ) as HTMLElement;
      if (flowContainer) {
        flowContainer.style.cursor = "grabbing";
      }
    }
  }

  /**
   * Handle pan move
   */
  onCanvasPanMove(event: MouseEvent): void {
    if (this.isPanning) {
      const deltaX = event.clientX - this.panStartPosition.x;
      const deltaY = event.clientY - this.panStartPosition.y;

      const newPosition = {
        x: this.panStartViewport.x + deltaX,
        y: this.panStartViewport.y + deltaY,
      };

      this.setViewport(newPosition, this.viewportScale);
    }
  }

  /**
   * Handle pan end
   */
  onCanvasPanEnd(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.isOptimizedPanMode = false; // Disable optimized pan mode
      this.isViewportTransforming = false; // Ensure viewport transforming flag is reset

      // Reset cursor
      const flowContainer = document.querySelector(
        ".flow-container",
      ) as HTMLElement;
      if (flowContainer) {
        flowContainer.style.cursor = "grab";
      }

      // Clear cache after pan to ensure fresh calculations on next precision operation
      this.clearHandlePositionCache();
    }
  }

  /**
   * Fit all content to view
   */
  fitToContent(): void {
    if (this.nodes.length === 0) return;

    // Calculate bounding box of all nodes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.nodes.forEach((node) => {
      const nodeWidth = 120; // Approximate node width
      const nodeHeight = 40; // Approximate node height

      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + nodeWidth);
      maxY = Math.max(maxY, node.position.y + nodeHeight);
    });

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate scale to fit
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const containerElement = document.querySelector(
      ".flow-container",
    ) as HTMLElement;
    if (!containerElement) return;

    const containerWidth = containerElement.clientWidth;
    const containerHeight = containerElement.clientHeight;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1

    // Calculate position to center content
    const centerX = (containerWidth - contentWidth * scale) / 2;
    const centerY = (containerHeight - contentHeight * scale) / 2;

    this.setViewport(
      { x: centerX - minX * scale, y: centerY - minY * scale },
      scale,
    );
  }

  /**
   * Reset viewport to default
   */
  resetViewport(): void {
    this.setViewport({ x: 0, y: 0 }, 1);
  }

  /**
   * Update the last node position for positioning new nodes
   */
  updateLastNodePosition(position: IPoint): void {
    this.lastNodePosition = { ...position };
  }

  /**
   * Handle node content changes that might affect node dimensions
   * This should be called when node content changes (e.g., text updates)
   */
  onNodeContentChanged(nodeId: string): void {
    // Clear cache for this node since its dimensions might have changed
    this.clearNodeHandlePositionCache(nodeId);

    // Update all connections involving this node
    this.edges.forEach((edge) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.updateConnectionPath(edge);
      }
    });
  }

  /**
   * Initialize ResizeObserver to detect node dimension changes
   */
  private initializeResizeObserver(): void {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const nodeElement = entry.target as HTMLElement;
          const nodeId = nodeElement.id?.replace("_node", "");

          if (nodeId) {
            // Debounce the update to avoid excessive calls
            setTimeout(() => {
              this.onNodeContentChanged(nodeId);
            }, 100);
          }
        });
      });
    }
  }

  /**
   * Zoom in by one step
   */
  zoomIn(): void {
    const newScale = Math.min(this.maxZoom, this.viewportScale + this.zoomStep);
    if (newScale !== this.viewportScale) {
      this.setViewport(this.viewportPosition, newScale);
    }
  }

  /**
   * Zoom out by one step
   */
  zoomOut(): void {
    const newScale = Math.max(this.minZoom, this.viewportScale - this.zoomStep);
    if (newScale !== this.viewportScale) {
      this.setViewport(this.viewportPosition, newScale);
    }
  }
}
