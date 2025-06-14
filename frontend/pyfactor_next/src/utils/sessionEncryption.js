import crypto from 'crypto';

// Use environment variable or generate a stable key based on a secret
const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || 
  crypto.createHash('sha256').update(
    process.env.AUTH0_CLIENT_SECRET || 'default-dev-key'
  ).digest();

const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts text using AES-256-CBC
 */
export function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Return iv + encrypted content as base64
    return iv.toString('base64') + ':' + encrypted.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts text encrypted with encrypt()
 */
export function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'base64');
    const encryptedText = Buffer.from(textParts.join(':'), 'base64');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}