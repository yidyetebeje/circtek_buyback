import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Folder, Tag, ChevronDown, ChevronRight } from 'lucide-angular';

// Interface based on usage in the bundled code
export interface INodeType {
  id: string;
  label: string;
  color: string;
  type?: string; // Optional, seems used for 'decision'
}

@Component({
  selector: 'app-node-palette',
  templateUrl: './node-palette.component.html',
  styleUrls: ['./node-palette.component.scss'],
  standalone: true,
  imports: [CommonModule, LucideAngularModule]
})
export class NodePaletteComponent implements OnChanges {
  @Input() nodeTypes: INodeType[] = [];
  @Output() nodeSelected = new EventEmitter<INodeType>();
  @Output() nodeDragStart = new EventEmitter<INodeType>();

  // Icon constants for template
  Folder = Folder;
  Tag = Tag;
  ChevronDown = ChevronDown;
  ChevronRight = ChevronRight;

  // Categorized nodes
  workNodes: INodeType[] = [];
  labelNodes: INodeType[] = [];

  // Category expand/collapse state
  categoryState: { [key: string]: boolean } = {
    work: true, // Work category starts expanded to show it's interactive
    labels: false // Labels category starts collapsed
  };

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodeTypes'] && this.nodeTypes) {
      this.categorizeNodes();
    }
  }

  // Categorize nodes into work and labels
  categorizeNodes(): void {
    this.workNodes = this.nodeTypes.filter(node => !node.id.includes('print_label_'));
    this.labelNodes = this.nodeTypes.filter(node => node.id.includes('print_label_'));
  }

  // Toggle category expansion
  toggleCategory(category: string): void {
    this.categoryState[category] = !this.categoryState[category];
  }

  // Used to identify conditional nodes (test passed/failed)
  // Note: The original implementation checked against specific strings.
  // This version keeps that logic.
  isConditionalNode(nodeTypeId: string): boolean {
    // The bundle checks nodeType.id directly, let's assume nodeTypeId is passed
    // Based on the template usage, it seems `nodeType.id` was intended
    return nodeTypeId === 'test_passed' || nodeTypeId === 'test_failed' || nodeTypeId === 'start_test';
  }

  // Emit the selected node type to the parent component
  onNodeSelected(nodeType: INodeType): void {
    this.nodeSelected.emit(nodeType);
  }

  // Handle drag start event
  onDragStart(event: DragEvent, nodeType: INodeType): void {
    // Set the data being dragged
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify(nodeType));
      event.dataTransfer.effectAllowed = 'copy';
    }
    this.nodeDragStart.emit(nodeType);
  }
}
