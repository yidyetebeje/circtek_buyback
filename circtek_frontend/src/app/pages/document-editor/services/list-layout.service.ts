import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import Konva from "konva";
import { ListLayoutState, NodeDimensions } from "../types/editor.types";
import { DEFAULT_VALUES } from "../constants/editor.constants";

@Injectable({
  providedIn: "root",
})
export class ListLayoutService {
  private listLayoutStateSubject = new BehaviorSubject<ListLayoutState>({
    isListModeActive: false,
    listSelectedNodes: [],
    listOrientation: "horizontal",
    listSeparator: 0,
    currentListGroup: null,
    isIndividualSelection: false,
  });

  // Snapshot for undo functionality
  private lastLayoutSnapshot: {
    positions: Map<Konva.Node, { x: number; y: number }>;
    texts: Map<Konva.Text, string>;
    createdNodes: Konva.Text[];
  } | null = null;

  public listLayoutState$ = this.listLayoutStateSubject.asObservable();

  constructor() {}

  get currentState(): ListLayoutState {
    return this.listLayoutStateSubject.value;
  }

  toggleListMode(): void {
    const currentState = this.currentState;
    const newIsActive = !currentState.isListModeActive;

    // Clear any previous selection highlights
    currentState.listSelectedNodes.forEach((n) => this.highlightNode(n, false));

    this.updateState({
      ...currentState,
      isListModeActive: newIsActive,
      listSelectedNodes: [],
      isIndividualSelection: false,
    });

    // Do NOT destroy list group when exiting list mode so that the user
    // can drag the resulting group around the canvas. They can still
    // double-click the group or use Cancel to ungroup if desired.
  }

  setListOrientation(orientation: "horizontal" | "vertical"): void {
    const currentState = this.currentState;
    this.updateState({
      ...currentState,
      listOrientation: orientation,
    });
  }

  setListSeparator(separator: number): void {
    const currentState = this.currentState;
    // Ensure separator is a valid number and not negative
    const validSeparator = isNaN(separator) ? 0 : Math.max(0, Math.min(500, separator));
    this.updateState({
      ...currentState,
      listSeparator: validSeparator,
    });
  }

  addNodeToSelection(node: Konva.Node): void {
    const currentState = this.currentState;
    const index = currentState.listSelectedNodes.indexOf(node);

    let newSelected: Konva.Node[];
    if (index === -1) {
      // Add
      newSelected = [...currentState.listSelectedNodes, node];
      this.highlightNode(node, true);
    } else {
      // Remove
      newSelected = currentState.listSelectedNodes.filter(
        (_, i) => i !== index,
      );
      this.highlightNode(node, false);
    }

    this.updateState({
      ...currentState,
      listSelectedNodes: newSelected,
    });
  }

  clearSelection(): void {
    const currentState = this.currentState;

    // Remove highlight from any previously selected nodes
    currentState.listSelectedNodes.forEach((n) => this.highlightNode(n, false));

    this.updateState({
      ...currentState,
      listSelectedNodes: [],
      isIndividualSelection: false,
    });
  }

  cancelListLayout(): void {
    // Remove highlight from selected nodes
    this.currentState.listSelectedNodes.forEach((n) =>
      this.highlightNode(n, false),
    );
    this.clearAllSelectionEffects();

    this.destroyCurrentListGroup();
    this.updateState({
      isListModeActive: false,
      listSelectedNodes: [],
      listOrientation: "horizontal",
      listSeparator: 0,
      currentListGroup: null,
      isIndividualSelection: false,
    });
  }

  applyListLayout(
    canvasWidth: number,
    canvasHeight: number,
    layer: Konva.Layer,
    transformer: Konva.Transformer,
  ): boolean {
    const currentState = this.currentState;

    if (currentState.listSelectedNodes.length < 2) {
      return false;
    }

    this.destroyCurrentListGroup();

    const nodes = [...currentState.listSelectedNodes];

    // Capture snapshot for undo (positions and original texts)
    const posMap = new Map<Konva.Node, { x: number; y: number }>();
    const textMap = new Map<Konva.Text, string>();
    const createdDelimiterNodes: Konva.Text[] = [];
    currentState.listSelectedNodes.forEach((n) => {
      posMap.set(n, { x: n.x(), y: n.y() });
      if (n instanceof Konva.Text) {
        textMap.set(n, n.text());
      }
    });
    this.lastLayoutSnapshot = {
      positions: posMap,
      texts: textMap,
      createdNodes: createdDelimiterNodes,
    };

    // Sort nodes based on current orientation for stable ordering
    if (currentState.listOrientation === "vertical") {
      nodes.sort((a, b) => a.y() - b.y());
    } else {
      nodes.sort((a, b) => a.x() - b.x());
    }

    // Get dimensions for all nodes and update text node properties
    const dims = nodes.map((n) => {
      const dimensions = this.getNodeDimensions(n);

      // Update text node's actual width/height properties for proper serialization
      if (n instanceof Konva.Text) {
        n.width(dimensions.width);
        n.height(dimensions.height);
      }
      return dimensions;
    });

    // Remove highlight before laying out
    nodes.forEach((n) => this.highlightNode(n, false));

    // Apply layout based on orientation
    if (currentState.listOrientation === "vertical") {
      this.applyVerticalLayout(
        nodes,
        dims,
        canvasWidth,
        canvasHeight,
        currentState.listSeparator,
        layer,
        createdDelimiterNodes,
      );
    } else {
      this.applyHorizontalLayout(
        nodes,
        dims,
        canvasWidth,
        canvasHeight,
        currentState.listSeparator,
        layer,
        createdDelimiterNodes,
      );
    }

    // Create a temporary draggable group
    const allNodes = [...nodes, ...createdDelimiterNodes];
    const listGroup = this.createListGroup(allNodes, layer);

    // Update state with the new group
    this.updateState({
      ...currentState,
      currentListGroup: listGroup,
    });

    // Set up transformer for the group
    transformer.nodes([listGroup]);
    layer.batchDraw();

    return true;
  }

  private applyVerticalLayout(
    nodes: Konva.Node[],
    dims: NodeDimensions[],
    canvasWidth: number,
    canvasHeight: number,
    separator: number,
    layer: Konva.Layer,
    createdDelimiterNodes: Konva.Text[],
  ): void {
    // Start from the topmost selected node's Y position
    const startY = Math.min(...nodes.map((n) => n.y()));
    // Start from the leftmost selected node's X position for alignment
    const startX = Math.min(...nodes.map((n) => n.x()));

    let yPos = startY;
    nodes.forEach((node, i) => {
      const { width, height } = dims[i];
      node.y(Math.max(0, yPos));
      node.x(Math.max(0, startX)); // Align to leftmost position
      yPos += height + separator;
    });
  }

  private applyHorizontalLayout(
    nodes: Konva.Node[],
    dims: NodeDimensions[],
    canvasWidth: number,
    canvasHeight: number,
    separator: number,
    layer: Konva.Layer,
    createdDelimiterNodes: Konva.Text[],
  ): void {
    // Start from the leftmost selected node's X position
    const startX = Math.min(...nodes.map((n) => n.x()));
    // Start from the topmost selected node's Y position for alignment
    const startY = Math.min(...nodes.map((n) => n.y()));

    let xPos = startX;
    nodes.forEach((node, i) => {
      const { width, height } = dims[i];
      node.x(Math.max(0, xPos));
      node.y(Math.max(0, startY)); // Align to topmost position
      xPos += width + separator;
    });
  }

  private createListGroup(
    nodes: Konva.Node[],
    layer: Konva.Layer,
  ): Konva.Group {
    const minX = Math.min(...nodes.map((n) => n.x()));
    const minY = Math.min(...nodes.map((n) => n.y()));

    const listGroup = new Konva.Group({
      x: minX,
      y: minY,
      name: "list-layout-group",
      draggable: true,
      id: "list-layout-group",
    });

    layer.add(listGroup);

    // Move nodes to the group and adjust their positions
    nodes.forEach((node) => {
      // Disable individual dragging so that drag acts on the group.
      node.draggable(false);

      // Forward pointer down to group for dragging from any child.
      const forwardDrag = () => {
        if (!listGroup.isDragging()) {
          listGroup.startDrag();
        }
      };
      node.on("mousedown.listgroup touchstart.listgroup", forwardDrag);

      node.moveTo(listGroup);
      node.x(node.x() - minX);
      node.y(node.y() - minY);
    });

    // Apply click-to-escape behavior using stage events
    const stage = layer.getStage();
    if (stage) {
      const outsideClick = (
        evt: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
      ) => {
        try {
          if (!listGroup || !listGroup.getStage()) return;
        } catch (e) {
          return;
        }
        if (
          evt.target === stage ||
          (evt.target &&
            !evt.target.isAncestorOf &&
            !listGroup.isAncestorOf(evt.target))
        ) {
         
          this.ungroupNodes(listGroup, layer);
          this.updateState({
            ...this.currentState,
            listSelectedNodes: [],
          });
        }
      };
      // Use capture phase to ensure this happens before other click handlers
      stage.on("click.outsidelistgroup tap.outsidelistgroup", outsideClick);

      // Clean up event listener when group is destroyed
      listGroup.on("destroy", () => {
        stage.off("click.outsidelistgroup tap.outsidelistgroup", outsideClick);
      });
    }

    return listGroup;
  }

  destroyCurrentListGroup(): void {
    if (this.currentState.currentListGroup) {
      // Clean up any delimiter nodes that were created
      const layer = this.currentState.currentListGroup.getLayer();
      if (layer) {
        layer
          .find(".delimiter-text")
          .forEach((node: Konva.Node) => node.destroy());
      }

      this.ungroupNodes(
        this.currentState.currentListGroup,
        this.currentState.currentListGroup.getLayer(),
      );
    }
  }

  private ungroupNodes(group: Konva.Group, layer: Konva.Layer | null): void {
    if (!group || !layer) return;
    try {
      if (!group.getStage()) return;
    } catch (e) {
      return;
    }

    const groupX = group.x();
    const groupY = group.y();

    // Move children back to layer and restore their absolute positions
    const children = [...group.getChildren()];
    children.forEach((child) => {
      child.moveTo(layer);
      child.x(child.x() + groupX);
      child.y(child.y() + groupY);
      child.draggable(true);
      child.off("mousedown.listgroup touchstart.listgroup");
    });

    group.destroy();
    layer.batchDraw();
  }

  selectIndividualShape(
    shape: Konva.Node,
    transformer: Konva.Transformer,
  ): boolean {
    const currentState = this.currentState;
    if (!currentState.isListModeActive) return false;

    if (
      currentState.currentListGroup &&
      currentState.currentListGroup.hasChildren()
    ) {
      // Destroy the current group to allow individual selection
      this.destroyCurrentListGroup();
      this.updateState({
        ...currentState,
        currentListGroup: null,
        isIndividualSelection: true,
      });
    }

    // Select the shape with transformer
    transformer.nodes([shape]);
    transformer.getLayer()?.batchDraw();
    return true;
  }

  handleShapeSelection(
    shape: Konva.Node,
    transformer: Konva.Transformer,
  ): boolean {
    const currentState = this.currentState;

    if (!currentState.isListModeActive) {
      return false; // Let normal selection handling proceed
    }

    // Check if this is a group created by list layout
    if (shape.name() === "list-layout-group" && shape instanceof Konva.Group) {
      // Don't add the group itself to the list selection - let normal transformer handle it
      transformer.nodes([shape]);
      transformer.getLayer()?.batchDraw();
      return false;
    }

    // If we're in individual selection mode, handle normally
    if (currentState.isIndividualSelection) {
      transformer.nodes([shape]);
      transformer.getLayer()?.batchDraw();
      return true;
    }

    // Otherwise, handle as list mode selection
    this.addNodeToSelection(shape);
    return true;
  }

  private getNodeDimensions(node: Konva.Node): NodeDimensions {
    // For text nodes, we need to get the actual rendered dimensions
    if (node instanceof Konva.Text) {
      return this.getTextNodeDimensions(node);
    }

    // For other node types, use the client rect which gives accurate bounding box
    const rect = node.getClientRect();
    return { width: rect.width, height: rect.height };
  }

  private getTextNodeDimensions(textNode: Konva.Text): NodeDimensions {
    // Create a temporary canvas to measure the actual text dimensions
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (context) {
      const fontSize = textNode.fontSize() || 16;
      const fontFamily = textNode.fontFamily() || "Arial";
      const fontStyle = textNode.fontStyle() || "normal";
      const fontWeight = fontStyle.includes("bold") ? "bold" : "normal";

      context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

      // Measure the text width
      const text = textNode.text() || "";
      const textMetrics = context.measureText(text);
      const textWidth = textMetrics.width;
      const padding = textNode.padding() || 0;

      // Calculate width with padding
      const actualWidth = Math.max(textWidth + padding * 2, textNode.width());

      // For height, we need to consider line wrapping
      const lines = text.split("\n");
      const lineHeight = fontSize * (textNode.lineHeight() || 1.2);
      let totalHeight = lines.length * lineHeight;

      // If text wrapping is enabled and we have a constrained width, calculate wrapped height
      if (textNode.wrap() !== "none" && textNode.width()) {
        const maxWidth = textNode.width() - padding * 2;
        let wrappedLines = 0;

        lines.forEach((line) => {
          if (line.trim() === "") {
            wrappedLines += 1;
          } else {
            const lineWidth = context.measureText(line).width;
            const linesForThisText = Math.ceil(lineWidth / maxWidth) || 1;
            wrappedLines += linesForThisText;
          }
        });

        totalHeight = wrappedLines * lineHeight;
      }

      const actualHeight = Math.max(
        totalHeight + padding * 2,
        textNode.height(),
      );

      return {
        width: actualWidth,
        height: actualHeight,
      };
    }

    // Fallback to node dimensions if canvas context not available
    return { width: textNode.width(), height: textNode.height() };
  }

  private updateState(newState: ListLayoutState): void {
    this.listLayoutStateSubject.next(newState);
  }

  private highlightNode(node: Konva.Node, highlighted: boolean): void {
    const applyHighlight = (target: Konva.Node) => {
      if (highlighted) {
        if (target instanceof Konva.Shape || target instanceof Konva.Text) {
          (target as any).stroke("#007bff");
          (target as any).strokeWidth(2);
        }
        if (target instanceof Konva.Text) {
          // For text, apply a different highlight since stroke might not be visible
          const originalFill = target.fill();
          target.setAttr("originalFill", originalFill);
          target.fill("#007bff");
        }
      } else {
        if (target instanceof Konva.Shape || target instanceof Konva.Text) {
          (target as any).stroke(undefined);
          (target as any).strokeWidth(0);
        }
        if (target instanceof Konva.Text) {
          // Restore original fill for text nodes
          const originalFill = target.getAttr("originalFill");
          if (originalFill) {
            target.fill(originalFill);
            target.setAttr("originalFill", undefined);
          }
        }
      }
    };

    if (node instanceof Konva.Group) {
      // Apply to all children in group
      node.getChildren().forEach((child) => applyHighlight(child));
    } else {
      applyHighlight(node);
    }

    node.getLayer()?.batchDraw();
  }

  undoLastLayout(layer: Konva.Layer, transformer: Konva.Transformer): boolean {
    if (!this.lastLayoutSnapshot) return false;

    const { positions, texts, createdNodes } = this.lastLayoutSnapshot;

    // Remove any created delimiter nodes
    createdNodes.forEach((node) => {
      try {
        if (node && node.getStage()) {
          node.destroy();
        }
      } catch (e) {
        // Node already destroyed
      }
    });

    // Restore original positions
    positions.forEach((pos, node) => {
      try {
        if (node && node.getStage()) {
          node.x(pos.x);
          node.y(pos.y);
        }
      } catch (e) {
        // Node already destroyed
      }
    });

    // Restore original text content
    texts.forEach((text, textNode) => {
      try {
        if (textNode && textNode.getStage()) {
          textNode.text(text);
        }
      } catch (e) {
        // Node already destroyed
      }
    });

    this.destroyCurrentListGroup();
    this.updateState({
      isListModeActive: false,
      listSelectedNodes: [],
      listOrientation: "horizontal",
      listSeparator: 0,
      currentListGroup: null,
      isIndividualSelection: false,
    });

    this.lastLayoutSnapshot = null;
    layer.batchDraw();
    return true;
  }

  clearAllSelectionEffects(): void {
    const currentState = this.currentState;

    // Remove highlight from any selected nodes
    currentState.listSelectedNodes.forEach((n) => this.highlightNode(n, false));

    // Clear the selection state
    this.updateState({
      ...currentState,
      listSelectedNodes: [],
      isIndividualSelection: false,
    });
  }

  prepareForSave(): void {
    // Clear all selection effects before saving
    this.clearAllSelectionEffects();

    // Optionally, you could also exit list mode entirely
    // but keeping the current list group intact if it exists
    const currentState = this.currentState;
    if (currentState.isListModeActive) {
      this.updateState({
        ...currentState,
        isListModeActive: false,
        listSelectedNodes: [],
        isIndividualSelection: false,
      });
    }
  }

  cleanup(): void {
    this.destroyCurrentListGroup();
    this.lastLayoutSnapshot = null;
  }

  // Utility methods for font and style operations
  getAllTextNodesFromSelection(): Konva.Text[] {
    const textNodes: Konva.Text[] = [];

    this.currentState.listSelectedNodes.forEach((node) => {
      if (node instanceof Konva.Text) {
        textNodes.push(node);
      } else if (node instanceof Konva.Group) {
        // Handle placeholder groups that might contain text nodes
        const textChild = node.findOne(".placeholder-text");
        if (textChild instanceof Konva.Text) {
          textNodes.push(textChild);
        }
      }
    });

    return textNodes;
  }

  getFirstTextNodeFontSize(): number | null {
    const textNodes = this.getAllTextNodesFromSelection();
    return textNodes.length > 0 ? textNodes[0].fontSize() : null;
  }

  getFirstTextNodeBoldStatus(): boolean {
    const textNodes = this.getAllTextNodesFromSelection();
    if (textNodes.length > 0) {
      const fontStyle = textNodes[0].fontStyle();
      const fontWeight = textNodes[0].attrs.fontWeight;
      return (
        fontStyle === "bold" ||
        fontWeight === "bold" ||
        (typeof fontWeight === "number" && fontWeight >= 700)
      );
    }
    return false;
  }

  getFirstTextNodeColor(): string {
    const textNodes = this.getAllTextNodesFromSelection();
    if (textNodes.length > 0) {
      const fill = textNodes[0].fill();
      return typeof fill === "string" ? fill : "#000000";
    }
    return "#000000";
  }

  updateAllTextNodesFontSize(
    fontSize: number,
    textEditorService: any,
    layer: Konva.Layer,
  ): void {
    const textNodes = this.getAllTextNodesFromSelection();
    textNodes.forEach((textNode) => {
      textNode.fontSize(fontSize);
      // Auto-resize the text node if the service is available
      if (textEditorService && textEditorService.autoResizeTextNode) {
        textEditorService.autoResizeTextNode(textNode, true);
      }
    });
    if (textNodes.length > 0) {
      layer.draw();
    }
  }

  updateAllTextNodesFontWeight(
    weight: "bold" | "normal",
    layer: Konva.Layer,
  ): void {
    const textNodes = this.getAllTextNodesFromSelection();
    textNodes.forEach((textNode) => {
      textNode.fontStyle(weight);
    });
    if (textNodes.length > 0) {
      layer.draw();
    }
  }

  updateAllTextNodesColor(color: string, layer: Konva.Layer): void {
    const textNodes = this.getAllTextNodesFromSelection();
    textNodes.forEach((textNode) => {
      textNode.fill(color);
    });
    if (textNodes.length > 0) {
      layer.batchDraw();
    }
  }
}
