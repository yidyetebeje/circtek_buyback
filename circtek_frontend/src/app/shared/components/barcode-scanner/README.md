# Barcode Scanner Component

A generic Angular component for handling barcode scanner input with IMEI/Serial number validation.

## Features

- **Automatic Barcode Scanner Detection**: Detects rapid keyboard input typical of barcode scanners
- **IMEI Validation**: Validates 15-digit IMEI numbers using Luhn algorithm
- **Serial Number Validation**: Validates alphanumeric serial numbers (6-20 characters)
- **Real-time Validation**: Provides immediate feedback with visual indicators
- **Auto-clear**: Optionally clears input after successful scan
- **Manual Input Support**: Works with both scanner and manual keyboard input
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Usage

### Basic Implementation

```typescript
import { BarcodeScannerComponent } from './shared/components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-my-component',
  imports: [BarcodeScannerComponent],
  template: `
    <app-barcode-scanner
      label="Device IMEI/Serial"
      placeholder="Scan or enter device identifier..."
      [required]="true"
      (scanned)="onScanResult($event)"
    />
  `
})
export class MyComponent {
  onScanResult(result: ScanResult): void {
    console.log('Scanned:', result);
    if (result.isValid) {
      // Handle valid scan
      this.processValidScan(result.value, result.type);
    } else {
      // Handle invalid scan
      this.showError('Invalid IMEI or serial number');
    }
  }
}
```

### Advanced Usage

```typescript
<app-barcode-scanner
  label="Device Identifier"
  placeholder="Scan barcode or enter manually..."
  [required]="true"
  [disabled]="isLoading"
  [autoClear]="false"
  (scanned)="onScanResult($event)"
/>
```

## API Reference

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Label text displayed above the input |
| `placeholder` | `string` | `'Scan or enter IMEI/Serial number...'` | Placeholder text |
| `required` | `boolean` | `false` | Whether the field is required |
| `disabled` | `boolean` | `false` | Whether the input is disabled |
| `autoClear` | `boolean` | `true` | Auto-clear input after successful scan |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `scanned` | `ScanResult` | Emitted when a value is scanned or entered |

### ScanResult Interface

```typescript
interface ScanResult {
  value: string;        // The cleaned input value
  isValid: boolean;     // Whether the value is valid
  type: 'imei' | 'serial' | 'unknown';  // Detected type
}
```

### Public Methods

| Method | Description |
|--------|-------------|
| `focus()` | Programmatically focus the input |
| `clear()` | Clear the input and reset validation state |

## Validation Rules

### IMEI Validation
- Must be exactly 15 digits
- Must pass Luhn algorithm checksum validation
- Spaces and dashes are automatically removed

### Serial Number Validation
- Must be 6-20 characters long
- Must contain only alphanumeric characters (A-Z, a-z, 0-9)
- Case insensitive

## Scanner Detection

The component automatically detects barcode scanner input by:
- Monitoring rapid keyboard input (< 100ms between characters)
- Detecting Enter key as scan completion
- Preventing interference with manual typing when input is focused

## Visual Feedback

- **Scanning State**: Shows spinner and "Scanning..." text
- **Valid Input**: Green border and checkmark icon with type indicator
- **Invalid Input**: Red border and X icon with error message
- **Help Text**: Shows validation rules when idle

## Styling

The component uses Tailwind CSS classes and can be customized via:
- CSS custom properties for colors
- Override component CSS classes
- DaisyUI theme variables

## Examples

### Valid Test Values

- **IMEI**: `123456789012345` (passes Luhn validation)
- **Serial**: `ABC123XYZ`, `SN123456789`, `DEV001`

### Invalid Test Values

- **IMEI**: `123456789012346` (fails Luhn validation)
- **Serial**: `AB1` (too short), `ABCD!@#$` (invalid characters)

## Integration Tips

1. **Form Integration**: Works seamlessly with Angular Reactive Forms
2. **Focus Management**: Call `focus()` method to programmatically focus
3. **Error Handling**: Listen to `scanned` output and check `isValid` property
4. **Performance**: Component uses OnPush change detection for optimal performance
5. **Accessibility**: Includes proper ARIA labels and keyboard navigation

## Browser Compatibility

- Modern browsers with ES2017+ support
- Requires keyboard event handling
- Works with physical barcode scanners that simulate keyboard input
