import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';

interface UploadedFile {
  url: string;
  fileName: string;
  originalName: string;
  size: number;
  type: string;
}

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <!-- File Input -->
      <div class="relative">
        <input
          type="file"
          #fileInput
          class="file-input file-input-bordered w-full"
          [class.file-input-error]="error()"
          [disabled]="disabled() || uploading()"
          [accept]="accept()"
          (change)="onFileSelected($event)"
        />
        @if (uploading()) {
          <div class="absolute inset-0 bg-base-100/50 flex items-center justify-center">
            <span class="loading loading-spinner loading-sm"></span>
          </div>
        }
      </div>

      <!-- Upload Progress -->
      @if (uploading()) {
        <div class="text-sm text-base-content/60">
          Uploading {{ selectedFileName() }}...
        </div>
      }

      <!-- Error Message -->
      @if (error()) {
        <div class="text-sm text-error">
          {{ error() }}
        </div>
      }

      <!-- Uploaded File Display -->
      @if (uploadedFile() && !uploading()) {
        <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">{{ uploadedFile()?.originalName }}</div>
              <div class="text-xs text-base-content/60">{{ formatFileSize(uploadedFile()?.size || 0) }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <a
              [href]="uploadedFile()?.url"
              target="_blank"
              class="btn btn-ghost btn-xs"
              title="View file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </a>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-error"
              title="Remove file"
              (click)="removeFile()"
              [disabled]="disabled()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent implements ControlValueAccessor {
  private readonly api = inject(ApiService);

  // Inputs
  accept = input<string>('.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif');
  folder = input<string>('purchases');
  maxSize = input<number>(10 * 1024 * 1024); // 10MB default

  // State
  uploading = signal(false);
  error = signal<string | null>(null);
  uploadedFile = signal<UploadedFile | null>(null);
  selectedFileName = signal<string>('');
  disabled = signal(false);

  // ControlValueAccessor
  private onChange = (value: string | null) => {};
  private onTouched = () => {};

  writeValue(value: string | null): void {
    if (value && typeof value === 'string') {
      // If we receive a URL, we need to parse it or treat it as an existing file
      // For now, we'll just store the URL
      this.uploadedFile.set({
        url: value,
        fileName: this.extractFileNameFromUrl(value),
        originalName: this.extractFileNameFromUrl(value),
        size: 0,
        type: ''
      });
    } else {
      this.uploadedFile.set(null);
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    this.error.set(null);
    this.selectedFileName.set(file.name);

    // Validate file size
    if (file.size > this.maxSize()) {
      this.error.set(`File size must be less than ${this.formatFileSize(this.maxSize())}`);
      return;
    }

    // Upload file
    this.uploadFile(file);
  }

  private uploadFile(file: File): void {
    this.uploading.set(true);
    this.error.set(null);

    this.api.uploadFile(file, this.folder()).subscribe({
      next: (response) => {
        this.uploading.set(false);
        if (response.data) {
          this.uploadedFile.set(response.data);
          this.onChange(response.data.url);
          this.onTouched();
        } else {
          this.error.set('Upload failed');
        }
      },
      error: (error) => {
        this.uploading.set(false);
        this.error.set(error.error?.error || 'Upload failed');
        console.error('Upload error:', error);
      }
    });
  }

  removeFile(): void {
    const file = this.uploadedFile();
    if (file) {
      // Optionally delete from S3
      // this.api.deleteFile(file.fileName).subscribe();
      
      this.uploadedFile.set(null);
      this.onChange(null);
      this.onTouched();
    }
  }

  private extractFileNameFromUrl(url: string): string {
    return url.split('/').pop() || 'file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
