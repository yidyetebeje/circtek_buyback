import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CipherService {
  private readonly SECRET_KEY = 'CIRCTEK_2024_SECURE';
  private readonly PADDING_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  /**
   * Encodes a test ID with serial number and padding for URL obfuscation
   * Format: serial + random_padding + test_id
   * Then applies simple cipher and base64 encoding
   */
  encodeTestId(testId: number, serialNumber?: string): string {
    try {
      // Use serial number or generate a random one if not provided
      const serial = serialNumber || this.generateRandomSerial();
      
      // Generate random padding (3-5 characters)
      const paddingLength = Math.floor(Math.random() * 3) + 3;
      const padding = this.generateRandomPadding(paddingLength);
      
      // Create the payload: serial|padding|testId
      const payload = `${serial}|${padding}|${testId}`;
      
      // Apply simple cipher
      const ciphered = this.applyCipher(payload);
      
      // Base64 encode and make URL safe
      const encoded = btoa(ciphered)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      return encoded;
    } catch (error) {
      console.error('Error encoding test ID:', error);
      // Fallback to original ID if encoding fails
      return testId.toString();
    }
  }

  /**
   * Decodes an encoded test ID back to the original test ID
   */
  decodeTestId(encodedId: string): number | null {
    try {
      // Handle both encoded and plain numeric IDs for backward compatibility
      if (/^\d+$/.test(encodedId)) {
        return parseInt(encodedId, 10);
      }

      // Restore base64 padding and characters
      let base64 = encodedId
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }
      
      // Decode from base64
      const ciphered = atob(base64);
      
      // Reverse the cipher
      const payload = this.reverseCipher(ciphered);
      
      // Extract test ID from payload: serial|padding|testId
      const parts = payload.split('|');
      if (parts.length !== 3) {
        throw new Error('Invalid payload format');
      }
      
      const testId = parseInt(parts[2], 10);
      if (isNaN(testId)) {
        throw new Error('Invalid test ID in payload');
      }
      
      return testId;
    } catch (error) {
      console.error('Error decoding test ID:', error);
      // Try to parse as plain number as fallback
      const numericId = parseInt(encodedId, 10);
      return isNaN(numericId) ? null : numericId;
    }
  }

  /**
   * Extracts serial number from encoded ID (useful for validation)
   */
  extractSerial(encodedId: string): string | null {
    try {
      // Handle plain numeric IDs
      if (/^\d+$/.test(encodedId)) {
        return null;
      }

      // Restore base64 padding and characters
      let base64 = encodedId
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      while (base64.length % 4) {
        base64 += '=';
      }
      
      const ciphered = atob(base64);
      const payload = this.reverseCipher(ciphered);
      const parts = payload.split('|');
      
      return parts.length >= 1 ? parts[0] : null;
    } catch (error) {
      console.error('Error extracting serial:', error);
      return null;
    }
  }

  private generateRandomSerial(): string {
    const length = 8 + Math.floor(Math.random() * 4); // 8-11 characters
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.PADDING_CHARS.charAt(Math.floor(Math.random() * this.PADDING_CHARS.length));
    }
    return result;
  }

  private generateRandomPadding(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.PADDING_CHARS.charAt(Math.floor(Math.random() * this.PADDING_CHARS.length));
    }
    return result;
  }

  private applyCipher(text: string): string {
    let result = '';
    const keyLength = this.SECRET_KEY.length;
    
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = this.SECRET_KEY.charCodeAt(i % keyLength);
      // Simple XOR cipher
      const cipheredChar = textChar ^ keyChar;
      result += String.fromCharCode(cipheredChar);
    }
    
    return result;
  }

  private reverseCipher(cipheredText: string): string {
    // XOR cipher is symmetric, so we use the same function
    return this.applyCipher(cipheredText);
  }

  /**
   * Validates if an encoded ID is properly formatted
   */
  isValidEncodedId(encodedId: string): boolean {
    if (!encodedId) return false;
    
    // Allow plain numeric IDs for backward compatibility
    if (/^\d+$/.test(encodedId)) {
      return true;
    }
    
    // Check if it's a valid base64-like string
    const base64Pattern = /^[A-Za-z0-9\-_]+$/;
    if (!base64Pattern.test(encodedId)) {
      return false;
    }
    
    // Try to decode and see if we get a valid test ID
    const testId = this.decodeTestId(encodedId);
    return testId !== null && testId > 0;
  }
}
