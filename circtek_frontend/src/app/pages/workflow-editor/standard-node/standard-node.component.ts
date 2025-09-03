import { Component, OnInit, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode, INodeMouseEvent, IHandleMouseDownEvent } from '../decision-node/decision-node.component';

@Component({
  selector: 'app-standard-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative p-2.5 bg-white border border-gray-300 rounded shadow-sm min-w-[120px] min-h-[40px] flex items-center justify-center text-center transition hover:shadow-md cursor-grab select-none z-10"
         [class.selected]="isSelected"
         (click)="onNodeClick($event)"
         (mousedown)="onNodeMouseDown($event)"
         [style.background-color]="node?.config?.style?.backgroundColor"
         [style.border-color]="node?.config?.style?.borderColor"
         [style.color]="node?.config?.style?.color"
         [style.font-size]="node?.config?.style?.fontSize"
         [style.font-family]="node?.config?.style?.fontFamily"
         style="cursor: grab;"
         >
      <div class="w-full text-sm leading-tight break-words">
        {{ node?.label }}
      </div>
      <!-- Input Handle -->
      <div class="node-handle absolute w-3 h-3 bg-white border-2 border-gray-600 rounded-full left-[-12px] top-1/2 -translate-y-1/2"
           [id]="node?.id + '_in'"
           (mousedown)="onHandleMouseDown($event, '_in')">
      </div>
      <!-- Output Handle -->
      <div class="node-handle absolute w-3 h-3 bg-white border-2 border-gray-600 rounded-full right-[-12px] top-1/2 -translate-y-1/2"
           [id]="node?.id + '_out'"
           (mousedown)="onHandleMouseDown($event, '_out')">
      </div>
    </div>
  `,
  styles: []
})
export class StandardNodeComponent implements OnInit {
  @Input() node!: INode;
  @Input() isSelected: boolean = false;

  @Output() nodeClick = new EventEmitter<INode>();
  @Output() nodeMouseDown = new EventEmitter<INodeMouseEvent>();
  @Output() handleMouseDown = new EventEmitter<IHandleMouseDownEvent>();

  constructor(public elementRef: ElementRef<HTMLElement>) { }

  ngOnInit(): void {
    // No special initialization needed
    console.log('Standard node initialized:', this.node?.id);
  }

  onNodeClick(event: MouseEvent): void {
    console.log('🖱️ STANDARD NODE CLICKED:', this.node?.id);
    event.stopPropagation();
    this.nodeClick.emit(this.node);
  }

  onNodeMouseDown(event: MouseEvent): void {
    console.log('🖱️ STANDARD NODE MOUSE DOWN:', this.node?.id, event.target);
    event.stopPropagation();
    this.nodeMouseDown.emit({ event, node: this.node });
  }

  onHandleMouseDown(event: MouseEvent, handleSuffix: string): void {
    console.log('🖱️ Standard node handle mouse down:', this.node?.id, handleSuffix);
    event.stopPropagation();
    const handleElement = event.target as HTMLElement;
    this.handleMouseDown.emit({
      event,
      nodeId: this.node.id,
      handleElement,
      handleSuffix
    });
  }
} 