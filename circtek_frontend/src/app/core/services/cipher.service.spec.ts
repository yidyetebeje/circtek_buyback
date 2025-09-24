import { TestBed } from '@angular/core/testing';
import { CipherService } from './cipher.service';

describe('CipherService', () => {
  let service: CipherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CipherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('encodeTestId and decodeTestId', () => {
    it('should encode and decode test ID correctly', () => {
      const testId = 12345;
      const serialNumber = 'ABC123XYZ';
      
      const encoded = service.encodeTestId(testId, serialNumber);
      const decoded = service.decodeTestId(encoded);
      
      expect(decoded).toBe(testId);
      expect(encoded).not.toBe(testId.toString());
      expect(encoded.length).toBeGreaterThan(10); // Should be significantly longer than original
    });

    it('should encode and decode test ID without serial number', () => {
      const testId = 67890;
      
      const encoded = service.encodeTestId(testId);
      const decoded = service.decodeTestId(encoded);
      
      expect(decoded).toBe(testId);
      expect(encoded).not.toBe(testId.toString());
    });

    it('should handle plain numeric IDs for backward compatibility', () => {
      const testId = 12345;
      const decoded = service.decodeTestId(testId.toString());
      
      expect(decoded).toBe(testId);
    });

    it('should return null for invalid encoded IDs', () => {
      const invalidIds = ['', 'invalid', '!@#$%', 'abc-xyz'];
      
      invalidIds.forEach(id => {
        const decoded = service.decodeTestId(id);
        expect(decoded).toBeNull();
      });
    });

    it('should generate different encoded values for same test ID', () => {
      const testId = 12345;
      
      const encoded1 = service.encodeTestId(testId);
      const encoded2 = service.encodeTestId(testId);
      
      // Should be different due to random padding
      expect(encoded1).not.toBe(encoded2);
      
      // But both should decode to the same test ID
      expect(service.decodeTestId(encoded1)).toBe(testId);
      expect(service.decodeTestId(encoded2)).toBe(testId);
    });
  });

  describe('extractSerial', () => {
    it('should extract serial number from encoded ID', () => {
      const testId = 12345;
      const serialNumber = 'ABC123XYZ';
      
      const encoded = service.encodeTestId(testId, serialNumber);
      const extractedSerial = service.extractSerial(encoded);
      
      expect(extractedSerial).toBe(serialNumber);
    });

    it('should return null for plain numeric IDs', () => {
      const extractedSerial = service.extractSerial('12345');
      expect(extractedSerial).toBeNull();
    });
  });

  describe('isValidEncodedId', () => {
    it('should validate encoded IDs correctly', () => {
      const testId = 12345;
      const encoded = service.encodeTestId(testId);
      
      expect(service.isValidEncodedId(encoded)).toBe(true);
      expect(service.isValidEncodedId('12345')).toBe(true); // Plain numeric
      expect(service.isValidEncodedId('')).toBe(false);
      expect(service.isValidEncodedId('invalid')).toBe(false);
    });
  });

  describe('URL safety', () => {
    it('should generate URL-safe encoded IDs', () => {
      const testId = 12345;
      const encoded = service.encodeTestId(testId);
      
      // Should not contain URL-unsafe characters
      expect(encoded).not.toMatch(/[+/=]/);
      
      // Should only contain URL-safe base64 characters
      expect(encoded).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
  });

  describe('performance and security', () => {
    it('should handle large test IDs', () => {
      const largeTestId = 999999999;
      const encoded = service.encodeTestId(largeTestId);
      const decoded = service.decodeTestId(encoded);
      
      expect(decoded).toBe(largeTestId);
    });

    it('should obfuscate the original test ID', () => {
      const testId = 12345;
      const encoded = service.encodeTestId(testId);
      
      // The encoded string should not contain the original test ID
      expect(encoded).not.toContain(testId.toString());
      
      // Should be significantly different in length and content
      expect(encoded.length).toBeGreaterThan(testId.toString().length * 2);
    });
  });
});
