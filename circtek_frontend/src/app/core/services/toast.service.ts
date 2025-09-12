import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  timeOut?: number;
  closeButton?: boolean;
  progressBar?: boolean;
  preventDuplicates?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastr = inject(ToastrService);

  // Standard toast configuration for consistent positioning and styling
  private readonly defaultOptions: ToastOptions = {
    timeOut: 5000,
    closeButton: true,
    progressBar: true,
    preventDuplicates: true,
  };

  // Standard positioning - using top-right for better UX
  private readonly positionClass = 'toast-top-right';

  /**
   * Show a success toast notification
   */
  success(message: string, title: string = 'Success', options?: ToastOptions): void {
    this.toastr.success(message, title, {
      ...this.defaultOptions,
      ...options,
      positionClass: this.positionClass,
    });
  }

  /**
   * Show an error toast notification
   */
  error(message: string, title: string = 'Error', options?: ToastOptions): void {
    this.toastr.error(message, title, {
      ...this.defaultOptions,
      ...options,
      positionClass: this.positionClass,
    });
  }

  /**
   * Show a warning toast notification
   */
  warning(message: string, title: string = 'Warning', options?: ToastOptions): void {
    this.toastr.warning(message, title, {
      ...this.defaultOptions,
      ...options,
      positionClass: this.positionClass,
    });
  }

  /**
   * Show an info toast notification
   */
  info(message: string, title: string = 'Information', options?: ToastOptions): void {
    this.toastr.info(message, title, {
      ...this.defaultOptions,
      ...options,
      positionClass: this.positionClass,
    });
  }

  /**
   * Generic method to show toast with type
   */
  show(message: string, type: ToastType, title?: string, options?: ToastOptions): void {
    switch (type) {
      case 'success':
        this.success(message, title, options);
        break;
      case 'error':
        this.error(message, title, options);
        break;
      case 'warning':
        this.warning(message, title, options);
        break;
      case 'info':
      default:
        this.info(message, title, options);
        break;
    }
  }

  /**
   * Show delete success message with consistent formatting
   */
  deleteSuccess(entityName: string): void {
    this.success(`${entityName} deleted successfully!`, 'Delete Successful');
  }

  /**
   * Show delete error message with consistent formatting
   */
  deleteError(entityName: string): void {
    this.error(`Failed to delete ${entityName.toLowerCase()}. Please try again.`, 'Delete Failed');
  }

  /**
   * Show save success message with consistent formatting
   */
  saveSuccess(entityName: string, action: 'created' | 'updated' = 'updated'): void {
    this.success(`${entityName} ${action} successfully!`, 'Success');
  }

  /**
   * Show save error message with consistent formatting
   */
  saveError(entityName: string, action: 'create' | 'update' = 'update'): void {
    this.error(`Failed to ${action} ${entityName.toLowerCase()}. Please try again.`, 'Save Failed');
  }

  /**
   * Show assignment success message with consistent formatting
   */
  assignmentSuccess(entityName: string): void {
    this.success(`${entityName} assigned successfully!`, 'Assignment Successful');
  }

  /**
   * Show assignment error message with consistent formatting
   */
  assignmentError(entityName: string): void {
    this.error(`Failed to assign ${entityName.toLowerCase()}. Please try again.`, 'Assignment Failed');
  }

  /**
   * Show unassignment success message with consistent formatting
   */
  unassignmentSuccess(entityName: string): void {
    this.success(`${entityName} unassigned successfully!`, 'Unassignment Successful');
  }

  /**
   * Show unassignment error message with consistent formatting
   */
  unassignmentError(entityName: string): void {
    this.error(`Failed to unassign ${entityName.toLowerCase()}. Please try again.`, 'Unassignment Failed');
  }

  /**
   * Show loading error message with consistent formatting
   */
  loadingError(resource: string): void {
    this.error(`Failed to load ${resource.toLowerCase()}. Please refresh the page.`, 'Loading Error');
  }

  /**
   * Show validation error message with consistent formatting
   */
  validationError(message: string): void {
    this.error(message, 'Validation Error');
  }
}
