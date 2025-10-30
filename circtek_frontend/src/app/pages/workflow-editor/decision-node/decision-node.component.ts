import { Component, OnInit, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaces based on usage (assuming structure from WorkflowEditorComponent)
export interface INode {
  id: string;
  label: string;
  position: { x: number; y: number };
  data: { type: string; [key: string]: any };
  config?: {
    style?: {
      backgroundColor?: string;
      borderColor?: string;
      color?: string;
      fontSize?: string;
      fontFamily?: string;
    };
    [key: string]: any;
  };
}

export interface INodeMouseEvent {
  event: MouseEvent;
  node: INode;
}

export interface IHandleMouseDownEvent {
  event: MouseEvent;
  nodeId: string;
  handleElement: HTMLElement;
  handleSuffix: string; // _in, _out_pass, _out_fail
}

@Component({
  selector: 'app-decision-node',
  standalone: true,
  imports: [CommonModule], // Needed for standalone components using common directives
  template: `
    <div class="relative rotate-45 w-[100px] h-[100px] flex justify-center items-center p-2.5 bg-primary border-2 border-black/20 rounded-[2px] shadow cursor-grab select-none z-10 transition-all duration-200 hover:-translate-y-0.5"
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
      <div class="-rotate-45 w-[90%] max-h-[90%] text-center font-bold break-words">
        {{ node?.label }}
      </div>
      <!-- Input Handle -->
      <div class="node-handle absolute w-[14px] h-[14px] bg-white border-2 border-gray-700 rounded-full cursor-pointer z-20 -rotate-45 transition left-[-14px] top-1/2 -translate-y-1/2"
           [id]="node?.id + '_in'"
           (mousedown)="onHandleMouseDown($event, '_in')">
      </div>
      <!-- Pass Output Handle -->
      <div class="node-handle absolute w-[14px] h-[14px] bg-success border-2 border-gray-700 rounded-full cursor-pointer z-20 -rotate-45 transition right-[-14px] top-[30%]"
           [id]="node?.id + '_out_pass'"
           title="Pass Path"
           (mousedown)="onHandleMouseDown($event, '_out_pass')">
           <span class="absolute text-[10px] font-bold text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">P</span>
      </div>
      <!-- Fail Output Handle -->
      <div class="node-handle absolute w-[14px] h-[14px] bg-error border-2 border-gray-700 rounded-full cursor-pointer z-20 -rotate-45 transition right-[-14px] top-[70%]"
            [id]="node?.id + '_out_fail'"
            title="Fail Path"
           (mousedown)="onHandleMouseDown($event, '_out_fail')">
           <span class="absolute text-[10px] font-bold text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">F</span>
      </div>
    </div>
  `,
  styles: []
})
export class DecisionNodeComponent implements OnInit {
  @Input() node!: INode; // Assuming INode structure
  @Input() isSelected: boolean = false;

  @Output() nodeClick = new EventEmitter<INode>();
  @Output() nodeMouseDown = new EventEmitter<INodeMouseEvent>();
  @Output() handleMouseDown = new EventEmitter<IHandleMouseDownEvent>();

  constructor(public elementRef: ElementRef<HTMLElement>) { }

  ngOnInit(): void {
    // Setup any initialization logic here
  }

  onNodeClick(event: MouseEvent): void {
   
    event.stopPropagation();
    this.nodeClick.emit(this.node);
  }

  onNodeMouseDown(event: MouseEvent): void {
   
    event.stopPropagation();
    this.nodeMouseDown.emit({ event, node: this.node });
  }

  onHandleMouseDown(event: MouseEvent, handleSuffix: string): void {
   
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
