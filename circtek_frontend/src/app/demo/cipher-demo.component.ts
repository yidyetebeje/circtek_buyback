import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CipherService } from '../core/services/cipher.service';

@Component({
  selector: 'app-cipher-demo',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-6 max-w-4xl">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-6">Cipher Service Demo</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Input Section -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Input</h3>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Test ID</span>
                </label>
                <input 
                  type="number" 
                  [(ngModel)]="testId" 
                  (input)="encode()"
                  class="input input-bordered" 
                  placeholder="Enter test ID (e.g., 12345)"
                />
              </div>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Serial Number (optional)</span>
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="serialNumber" 
                  (input)="encode()"
                  class="input input-bordered" 
                  placeholder="Enter serial number (e.g., ABC123XYZ)"
                />
              </div>
              
              <button class="btn btn-primary" (click)="encode()">
                Encode
              </button>
            </div>
            
            <!-- Output Section -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Output</h3>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Encoded ID</span>
                </label>
                <textarea 
                  [value]="encodedId()" 
                  class="textarea textarea-bordered h-20" 
                  readonly
                  placeholder="Encoded ID will appear here"
                ></textarea>
                @if (encodedId()) {
                  <button 
                    class="btn btn-sm btn-ghost mt-2" 
                    (click)="copyToClipboard(encodedId())"
                  >
                    Copy to Clipboard
                  </button>
                }
              </div>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Decoded Test ID</span>
                </label>
                <input 
                  [value]="decodedId() || ''" 
                  class="input input-bordered" 
                  readonly
                  placeholder="Decoded ID will appear here"
                />
              </div>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Extracted Serial</span>
                </label>
                <input 
                  [value]="extractedSerial() || 'N/A'" 
                  class="input input-bordered" 
                  readonly
                  placeholder="Extracted serial will appear here"
                />
              </div>
            </div>
          </div>
          
          <!-- Test Section -->
          <div class="divider"></div>
          
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Test Decoding</h3>
            <p class="text-sm text-base-content/70">
              Paste an encoded ID here to test decoding:
            </p>
            
            <div class="form-control">
              <input 
                type="text" 
                [(ngModel)]="testEncodedId" 
                (input)="testDecode()"
                class="input input-bordered" 
                placeholder="Paste encoded ID here"
              />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="stat bg-base-200 rounded-lg">
                <div class="stat-title">Decoded ID</div>
                <div class="stat-value text-lg">{{ testDecodedId() || 'Invalid' }}</div>
              </div>
              
              <div class="stat bg-base-200 rounded-lg">
                <div class="stat-title">Extracted Serial</div>
                <div class="stat-value text-lg">{{ testExtractedSerial() || 'N/A' }}</div>
              </div>
              
              <div class="stat bg-base-200 rounded-lg">
                <div class="stat-title">Valid</div>
                <div class="stat-value text-lg">
                  @if (testEncodedId) {
                    @if (isValidEncoded()) {
                      <span class="text-success">✓</span>
                    } @else {
                      <span class="text-error">✗</span>
                    }
                  } @else {
                    <span class="text-base-content/50">-</span>
                  }
                </div>
              </div>
            </div>
          </div>
          
          <!-- Examples Section -->
          <div class="divider"></div>
          
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Example URLs</h3>
            <p class="text-sm text-base-content/70">
              Here's how the encoded IDs would look in actual URLs:
            </p>
            
            @if (encodedId()) {
              <div class="mockup-code">
                <pre><code>Original URL: /diagnostics/report/{{ testId }}</code></pre>
                <pre><code>Encoded URL:  /diagnostics/report/{{ encodedId() }}</code></pre>
              </div>
            }
          </div>
          
          <!-- Security Benefits -->
          <div class="divider"></div>
          
          <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 class="font-bold">Security Benefits:</h4>
              <ul class="list-disc list-inside text-sm mt-2">
                <li>Test IDs are not easily guessable from URLs</li>
                <li>Each encoding includes random padding for uniqueness</li>
                <li>Serial numbers are embedded for additional validation</li>
                <li>Backward compatibility with plain numeric IDs</li>
                <li>URL-safe encoding (no special characters)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CipherDemoComponent {
  private readonly cipherService = inject(CipherService);
  
  testId = 12345;
  serialNumber = 'ABC123XYZ';
  testEncodedId = '';
  
  encodedId = signal<string>('');
  decodedId = signal<number | null>(null);
  extractedSerial = signal<string | null>(null);
  
  testDecodedId = signal<number | null>(null);
  testExtractedSerial = signal<string | null>(null);
  isValidEncoded = signal<boolean>(false);
  
  constructor() {
    this.encode();
  }
  
  encode(): void {
    if (this.testId) {
      const encoded = this.cipherService.encodeTestId(
        this.testId, 
        this.serialNumber || undefined
      );
      this.encodedId.set(encoded);
      
      // Verify by decoding
      const decoded = this.cipherService.decodeTestId(encoded);
      this.decodedId.set(decoded);
      
      const extracted = this.cipherService.extractSerial(encoded);
      this.extractedSerial.set(extracted);
    }
  }
  
  testDecode(): void {
    if (this.testEncodedId) {
      const decoded = this.cipherService.decodeTestId(this.testEncodedId);
      this.testDecodedId.set(decoded);
      
      const extracted = this.cipherService.extractSerial(this.testEncodedId);
      this.testExtractedSerial.set(extracted);
      
      const isValid = this.cipherService.isValidEncodedId(this.testEncodedId);
      this.isValidEncoded.set(isValid);
    } else {
      this.testDecodedId.set(null);
      this.testExtractedSerial.set(null);
      this.isValidEncoded.set(false);
    }
  }
  
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
     
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }
}
