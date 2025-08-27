/**
 * Lightweight Crypto Utilities for Secure Session Management
 * 
 * Provides browser-native encryption without external dependencies
 * Uses Web Crypto API for industry-standard security
 */

class CryptoUtils {
    constructor() {
        this.isWebCryptoSupported = typeof crypto !== 'undefined' && 
                                    typeof crypto.subtle !== 'undefined';
    }

    /**
     * Generate cryptographically secure random bytes
     */
    generateSecureRandom(length) {
        if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
            // Fallback for environments without crypto
            const array = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }
        
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    }

    /**
     * Convert bytes to hex string
     */
    bytesToHex(bytes) {
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Convert hex string to bytes
     */
    hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    /**
     * Generate a secure key for session encryption
     */
    generateSecureKey() {
        const keyBytes = this.generateSecureRandom(32); // 256-bit key
        return this.bytesToHex(keyBytes);
    }

    /**
     * Generate secure IV for AES encryption
     */
    generateSecureIV() {
        const ivBytes = this.generateSecureRandom(16); // 128-bit IV
        return this.bytesToHex(ivBytes);
    }

    /**
     * Encrypt data using Web Crypto API (AES-GCM)
     */
    async encryptDataWebCrypto(data, keyHex) {
        if (!this.isWebCryptoSupported) {
            throw new Error('Web Crypto API not supported');
        }

        try {
            const iv = this.generateSecureRandom(12); // 96-bit IV for GCM
            const keyBytes = this.hexToBytes(keyHex);
            
            // Import the key
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );

            // Encrypt the data
            const encoder = new TextEncoder();
            const dataBytes = encoder.encode(JSON.stringify(data));
            
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                dataBytes
            );

            return {
                encrypted: this.bytesToHex(new Uint8Array(encrypted)),
                iv: this.bytesToHex(iv)
            };
        } catch (error) {
            console.error('[CryptoUtils] Web Crypto encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }

    /**
     * Decrypt data using Web Crypto API (AES-GCM)
     */
    async decryptDataWebCrypto(encryptedHex, ivHex, keyHex) {
        if (!this.isWebCryptoSupported) {
            throw new Error('Web Crypto API not supported');
        }

        try {
            const keyBytes = this.hexToBytes(keyHex);
            const encryptedBytes = this.hexToBytes(encryptedHex);
            const ivBytes = this.hexToBytes(ivHex);
            
            // Import the key
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // Decrypt the data
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: ivBytes
                },
                cryptoKey,
                encryptedBytes
            );

            const decoder = new TextDecoder();
            const decryptedString = decoder.decode(decrypted);
            return JSON.parse(decryptedString);
        } catch (error) {
            console.error('[CryptoUtils] Web Crypto decryption failed:', error);
            throw new Error('Decryption failed');
        }
    }

    /**
     * Fallback encryption using a simple XOR cipher (NOT secure, only for demo)
     */
    encryptDataFallback(data, keyHex) {
        console.warn('[CryptoUtils] Using fallback encryption - NOT SECURE for production');
        
        const dataString = JSON.stringify(data);
        const keyBytes = this.hexToBytes(keyHex);
        const dataBytes = new TextEncoder().encode(dataString);
        const iv = this.generateSecureIV();
        
        // Simple XOR encryption (NOT secure)
        const encrypted = new Uint8Array(dataBytes.length);
        for (let i = 0; i < dataBytes.length; i++) {
            encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        return {
            encrypted: this.bytesToHex(encrypted),
            iv: iv
        };
    }

    /**
     * Fallback decryption using simple XOR cipher
     */
    decryptDataFallback(encryptedHex, ivHex, keyHex) {
        console.warn('[CryptoUtils] Using fallback decryption - NOT SECURE for production');
        
        const keyBytes = this.hexToBytes(keyHex);
        const encryptedBytes = this.hexToBytes(encryptedHex);
        
        // Simple XOR decryption
        const decrypted = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        const decryptedString = new TextDecoder().decode(decrypted);
        return JSON.parse(decryptedString);
    }

    /**
     * Encrypt data with automatic method selection
     */
    async encryptData(data, keyHex) {
        if (this.isWebCryptoSupported) {
            return await this.encryptDataWebCrypto(data, keyHex);
        } else {
            return this.encryptDataFallback(data, keyHex);
        }
    }

    /**
     * Decrypt data with automatic method selection
     */
    async decryptData(encryptedHex, ivHex, keyHex) {
        if (this.isWebCryptoSupported) {
            return await this.decryptDataWebCrypto(encryptedHex, ivHex, keyHex);
        } else {
            return this.decryptDataFallback(encryptedHex, ivHex, keyHex);
        }
    }

    /**
     * Hash data using Web Crypto API (SHA-256)
     */
    async hashData(data) {
        if (!this.isWebCryptoSupported) {
            // Simple fallback hash (NOT cryptographically secure)
            let hash = 0;
            const str = typeof data === 'string' ? data : JSON.stringify(data);
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString(36);
        }

        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data));
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
        const hashArray = new Uint8Array(hashBuffer);
        return this.bytesToHex(hashArray);
    }

    /**
     * Generate secure session token
     */
    generateSessionToken() {
        const tokenBytes = this.generateSecureRandom(32);
        return this.bytesToHex(tokenBytes);
    }

    /**
     * Validate crypto capabilities
     */
    validateCryptoCapabilities() {
        const capabilities = {
            webCryptoSupported: this.isWebCryptoSupported,
            secureRandomSupported: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
            aesGcmSupported: false,
            sha256Supported: false
        };

        // Test AES-GCM support
        if (this.isWebCryptoSupported) {
            try {
                capabilities.aesGcmSupported = crypto.subtle.importKey && crypto.subtle.encrypt;
                capabilities.sha256Supported = crypto.subtle.digest;
            } catch (error) {
                console.warn('[CryptoUtils] Crypto capability test failed:', error);
            }
        }

        return capabilities;
    }
}

// Create singleton instance
const cryptoUtils = new CryptoUtils();

// Export for ES modules
export default cryptoUtils;

// Export for CommonJS/UMD
if (typeof module !== 'undefined' && module.exports) {
    module.exports = cryptoUtils;
}

// Global export for direct script inclusion
if (typeof window !== 'undefined') {
    window.CryptoUtils = cryptoUtils;
}