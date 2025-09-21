import crypto from 'crypto';
import { ApiKey, ApiKeyValidationResult } from './types';

export class ApiKeyService {
  private static readonly API_KEY_LENGTH = 64;
  private static readonly PREFIX_LENGTH = 8;
  private static readonly HASH_ALGORITHM = 'sha256';
  
  /**
   * Generates a new secure API key with prefix
   * Format: ck_live_[8-char-prefix]_[56-char-random]
   */
  static generateApiKey(): { key: string; prefix: string; hash: string } {
    // Generate random bytes for the key
    const randomBytes = crypto.randomBytes(this.API_KEY_LENGTH);
    const keyPart = randomBytes.toString('hex');
    
    // Generate prefix for easy identification
    const prefixBytes = crypto.randomBytes(this.PREFIX_LENGTH / 2);
    const prefix = prefixBytes.toString('hex');
    
    // Construct the full key
    const fullKey = `ck_live_${prefix}_${keyPart}`;
    
    // Hash the key for secure storage
    const hash = this.hashApiKey(fullKey);
    
    return {
      key: fullKey,
      prefix: `ck_live_${prefix}`,
      hash
    };
  }

  /**
   * Hashes an API key using SHA-256
   */
  static hashApiKey(key: string): string {
    return crypto
      .createHash(this.HASH_ALGORITHM)
      .update(key)
      .digest('hex');
  }

  /**
   * Validates API key format
   */
  static validateKeyFormat(key: string): boolean {
    // Check if key matches the expected format: ck_live_[prefix]_[key]
    const keyPattern = /^ck_live_[a-f0-9]{8}_[a-f0-9]{128}$/;
    return keyPattern.test(key);
  }

  /**
   * Extracts prefix from API key
   */
  static extractPrefix(key: string): string | null {
    const match = key.match(/^(ck_live_[a-f0-9]{8})_/);
    return match ? match[1] : null;
  }

  // Permission system removed - all API keys have full access

  /**
   * Checks if an API key has expired
   */
  static isExpired(apiKey: ApiKey): boolean {
    if (!apiKey.expires_at) {
      return false; // No expiration set
    }
    
    return new Date() > apiKey.expires_at;
  }

  /**
   * Checks if an API key is active and valid
   */
  static isActive(apiKey: ApiKey): boolean {
    return apiKey.is_active && 
           !apiKey.revoked_at && 
           !this.isExpired(apiKey);
  }

  /**
   * Generates a secure random string for various purposes
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Rate limiting calculation
   */
  static calculateRateLimit(
    usageCount: number,
    rateLimit: number,
    timeWindowStart: Date
  ): { allowed: boolean; resetTime: Date; remaining: number } {
    const now = new Date();
    const windowStartHour = new Date(timeWindowStart);
    windowStartHour.setMinutes(0, 0, 0);
    
    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);
    
    // If we're in a new hour window, reset the count
    const isNewWindow = currentHour.getTime() > windowStartHour.getTime();
    const currentUsage = isNewWindow ? 0 : usageCount;
    
    const remaining = Math.max(0, rateLimit - currentUsage - 1);
    const resetTime = new Date(currentHour);
    resetTime.setHours(resetTime.getHours() + 1);
    
    return {
      allowed: currentUsage < rateLimit,
      resetTime,
      remaining
    };
  }

  /**
   * Sanitizes API key data for public display (removes sensitive information)
   */
  static sanitizeApiKey(apiKey: ApiKey): Omit<ApiKey, 'key_hash'> & { key_display: string } {
    const { key_hash, ...sanitized } = apiKey;
    return {
      ...sanitized,
      key_display: `${apiKey.key_prefix}_***`
    };
  }

  /**
   * Validates API key creation request
   */
  static validateCreateRequest(data: {
    name: string;
    rate_limit?: number;
    expires_at?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    }
    if (data.name && data.name.length > 255) {
      errors.push('Name must not exceed 255 characters');
    }

    // Validate rate limit
    if (data.rate_limit !== undefined && (data.rate_limit < 1 || data.rate_limit > 10000)) {
      errors.push('Rate limit must be between 1 and 10000');
    }

    // Validate expiration date
    if (data.expires_at) {
      const expiryDate = new Date(data.expires_at);
      if (isNaN(expiryDate.getTime())) {
        errors.push('Invalid expiration date format');
      } else if (expiryDate <= new Date()) {
        errors.push('Expiration date must be in the future');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates audit log data for API key operations
   */
  static generateAuditData(
    operation: 'create' | 'update' | 'revoke' | 'access',
    apiKeyId: number,
    userId: number,
    details: Record<string, any> = {}
  ): Record<string, any> {
    return {
      operation,
      api_key_id: apiKeyId,
      user_id: userId,
      timestamp: new Date().toISOString(),
      details,
      ip_address: details.ip_address || null,
      user_agent: details.user_agent || null
    };
  }
}