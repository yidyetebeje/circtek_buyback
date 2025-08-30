import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ModalAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'error' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  action: string;
}

@Component({
  selector: 'app-generic-modal',
  imports: [CommonModule],
  templateUrl: './generic-modal.component.html',
  styleUrls: ['./generic-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericModalComponent {
  // Inputs
  isOpen = input<boolean>(false);
  title = input<string>('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  closable = input<boolean>(true);
  actions = input<ModalAction[]>([]);

  // Outputs
  close = output<void>();
  actionClick = output<string>();

  onClose(): void {
    if (this.closable()) {
      this.close.emit();
    }
  }

  onActionClick(action: string): void {
    this.actionClick.emit(action);
  }

  getModalSizeClass(): string {
    const sizeMap = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl'
    };
    return sizeMap[this.size()];
  }

  getButtonClass(action: ModalAction): string {
    const baseClass = 'btn';
    const variantMap = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      accent: 'btn-accent',
      error: 'btn-error',
      ghost: 'btn-ghost'
    };
    
    const variantClass = action.variant ? variantMap[action.variant] : '';
    const disabledClass = action.disabled ? 'btn-disabled' : '';
    
    return [baseClass, variantClass, disabledClass].filter(Boolean).join(' ');
  }
}
