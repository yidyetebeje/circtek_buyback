import { Directive, Input, OnChanges, SimpleChanges, ViewContainerRef, ComponentRef, Type } from '@angular/core';

@Directive({
  selector: '[appCellHost]',
  standalone: true,
})
export class CellHostDirective implements OnChanges {
  @Input('appCellHost') componentType: Type<any> | undefined;
  @Input() componentData: any;

  private componentRef: ComponentRef<any> | undefined;

  constructor(private viewContainerRef: ViewContainerRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['componentType'] || changes['componentData']) {
      this.loadComponent();
    }
  }

  private loadComponent(): void {
    this.viewContainerRef.clear();

    if (this.componentType) {
      this.componentRef = this.viewContainerRef.createComponent(this.componentType);

      if (this.componentData && this.componentRef.instance) {
        // Pass data to the component's inputs
        Object.assign(this.componentRef.instance, this.componentData);
      }
    }
  }
}
