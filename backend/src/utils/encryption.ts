/**
 * Encryption Utility Module
 * 
 * Provides AES-256-GCM encryption for sensitive data like API keys and secrets.
 * Uses authenticated encryption to ensure both confidentiality and integrity.
 * 
 * IMPORTANT: Requires ENCRYPTION_KEY environment variable (64 hex chars = 32 bytes)
 * Generate with: openssl rand -hex 32
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;  // 16 bytes for AES-GCM
const AUTH_TAG_LENGTH = 16;  // 16 bytes auth tag

/**
 * Encrypts a plaintext string using AES-256-GCM
 * 
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded string in format: iv:authTag:ciphertext
 * @throws Error if ENCRYPTION_KEY is not properly configured
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string (format: iv:authTag:ciphertext)
 * 
 * @param encryptedData - The encrypted string to decrypt
 * @returns The original plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, or invalid format)
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, ciphertext] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    if (iv.length !== IV_LENGTH) {
        throw new Error('Invalid IV length');
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid auth tag length');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Checks if a string appears to be encrypted (has the expected format)
 * 
 * @param data - The string to check
 * @returns true if the string matches the encrypted format
 */
export function isEncrypted(data: string): boolean {
    const parts = data.split(':');
    if (parts.length !== 3) return false;

    try {
        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
    } catch {
        return false;
    }
}

/**
 * Gets the encryption key from environment variable
 * 
 * @returns Buffer containing the 32-byte encryption key
 * @throws Error if key is missing or invalid
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error(
            'ENCRYPTION_KEY environment variable is not set. ' +
            'Generate one with: openssl rand -hex 32'
        );
    }

    if (key.length !== 64) {
        throw new Error(
            'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
            'Generate one with: openssl rand -hex 32'
        );
    }

    // Validate hex format
    if (!/^[a-fA-F0-9]{64}$/.test(key)) {
        throw new Error('ENCRYPTION_KEY must contain only hexadecimal characters');
    }

    return Buffer.from(key, 'hex');
}

/**
 * Validates that the encryption key is properly configured
 * 
 * @returns true if encryption is properly configured
 * @throws Error with details if not configured
 */
export function validateEncryptionConfig(): boolean {
    getEncryptionKey(); // This will throw if not configured
    return true;
}
