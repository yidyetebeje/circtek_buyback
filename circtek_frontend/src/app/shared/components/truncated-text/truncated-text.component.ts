import { ChangeDetectionStrategy, Component, input, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-truncated-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #container
      class="truncated-text-container relative overflow-hidden cursor-pointer group"
      [style.max-width]="maxWidth()"
      [title]="showTooltip() && isTextTruncated() ? text() : null"
    >
      <span 
        #textSpan
        class="truncated-text-content block whitespace-nowrap transition-transform duration-500 ease-in-out"
        [class.text-truncate]="!isHovered()"
        [class.animate-slide]="isHovered() && isTextTruncated()"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        {{ text() }}
      </span>
    </div>
  `,
  styles: [`
    .truncated-text-container {
      min-width: 0;
    }
    
    .text-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .animate-slide {
      animation: slideText 3s ease-in-out infinite;
    }
    
    @keyframes slideText {
      0%, 20% {
        transform: translateX(0);
      }
      50%, 70% {
        transform: translateX(calc(-100% + var(--container-width, 150px)));
      }
      90%, 100% {
        transform: translateX(0);
      }
    }
    
    /* Responsive behavior */
    .truncated-text-container:hover .truncated-text-content {
      overflow: visible;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TruncatedTextComponent implements AfterViewInit {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  @ViewChild('textSpan', { static: true }) textSpan!: ElementRef<HTMLSpanElement>;

  // Inputs
  text = input.required<string>();
  maxWidth = input<string>('200px');
  showTooltip = input<boolean>(true);
  
  // State
  private _isHovered = false;
  private _isTextTruncated = false;
  
  isHovered = () => this._isHovered;
  isTextTruncated = () => this._isTextTruncated;
  
  ngAfterViewInit() {
    this.checkIfTextIsTruncated();
  }
  
  private checkIfTextIsTruncated() {
    if (this.container && this.textSpan) {
      const containerWidth = this.container.nativeElement.offsetWidth;
      const textWidth = this.textSpan.nativeElement.scrollWidth;
      this._isTextTruncated = textWidth > containerWidth;
      
      // Set CSS custom property for animation
      if (this._isTextTruncated) {
        this.container.nativeElement.style.setProperty('--container-width', `${containerWidth}px`);
      }
    }
  }
  
  onMouseEnter() {
    this._isHovered = true;
  }
  
  onMouseLeave() {
    this._isHovered = false;
  }
}
