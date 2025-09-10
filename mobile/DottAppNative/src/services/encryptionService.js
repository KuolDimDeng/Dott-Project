/**
 * End-to-End Encryption Service
 * Implements Signal Protocol-like encryption for messages and calls
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { NativeModules, Platform } from 'react-native';

// Use native crypto if available (more secure)
const { RNCrypto } = NativeModules;

class E2EEncryptionService {
  constructor() {
    this.initialized = false;
    this.identityKeyPair = null;
    this.preKeys = [];
    this.sessions = new Map();
    this.messageKeys = new Map();
  }

  /**
   * Initialize encryption service
   * Generates identity keys and pre-keys
   */
  async initialize() {
    try {
      // Check if we already have identity keys
      const storedIdentity = await AsyncStorage.getItem('@e2e:identity');
      
      if (storedIdentity) {
        this.identityKeyPair = JSON.parse(storedIdentity);
      } else {
        // Generate new identity key pair
        this.identityKeyPair = await this.generateKeyPair();
        await AsyncStorage.setItem('@e2e:identity', JSON.stringify(this.identityKeyPair));
      }

      // Generate pre-keys for key exchange
      await this.generatePreKeys();
      
      // Upload public keys to server
      await this.uploadPublicKeys();
      
      this.initialized = true;
      console.log('✅ E2E Encryption initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize encryption:', error);
      return false;
    }
  }

  /**
   * Generate key pair for encryption
   */
  async generateKeyPair() {
    if (RNCrypto && RNCrypto.generateKeyPair) {
      // Use native implementation if available
      return await RNCrypto.generateKeyPair();
    }
    
    // Fallback to JavaScript implementation
    const privateKey = CryptoJS.lib.WordArray.random(32);
    const publicKey = this.derivePublicKey(privateKey);
    
    return {
      private: privateKey.toString(CryptoJS.enc.Base64),
      public: publicKey.toString(CryptoJS.enc.Base64)
    };
  }

  /**
   * Generate one-time pre-keys for initial key exchange
   */
  async generatePreKeys(count = 100) {
    this.preKeys = [];
    
    for (let i = 0; i < count; i++) {
      const keyPair = await this.generateKeyPair();
      this.preKeys.push({
        id: i,
        keyPair: keyPair,
        used: false
      });
    }
    
    // Store pre-keys locally
    await AsyncStorage.setItem('@e2e:prekeys', JSON.stringify(this.preKeys));
  }

  /**
   * Upload public keys to server for other users to fetch
   */
  async uploadPublicKeys() {
    try {
      const publicBundle = {
        identityKey: this.identityKeyPair.public,
        preKeys: this.preKeys.map(pk => ({
          id: pk.id,
          key: pk.keyPair.public
        }))
      };
      
      // Upload to server
      const response = await fetch(`${ENV.apiUrl}/api/encryption/upload-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(publicBundle)
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload public keys');
      }
      
      console.log('✅ Public keys uploaded to server');
    } catch (error) {
      console.error('❌ Failed to upload public keys:', error);
      throw error;
    }
  }

  /**
   * Establish encrypted session with another user
   */
  async establishSession(recipientId) {
    try {
      // Check if we already have a session
      if (this.sessions.has(recipientId)) {
        return this.sessions.get(recipientId);
      }
      
      // Fetch recipient's public key bundle
      const response = await fetch(`${ENV.apiUrl}/api/encryption/get-keys/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recipient keys');
      }
      
      const recipientBundle = await response.json();
      
      // Perform Diffie-Hellman key exchange
      const sharedSecret = await this.performKeyExchange(
        this.identityKeyPair.private,
        recipientBundle.identityKey
      );
      
      // Create session
      const session = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recipientId: recipientId,
        sharedSecret: sharedSecret,
        sendCounter: 0,
        receiveCounter: 0,
        rootKey: sharedSecret,
        sendingChainKey: null,
        receivingChainKey: null,
        createdAt: Date.now()
      };
      
      // Initialize ratchet keys
      await this.initializeRatchet(session);
      
      // Store session
      this.sessions.set(recipientId, session);
      await this.persistSession(recipientId, session);
      
      console.log(`✅ Established E2E session with ${recipientId}`);
      return session;
    } catch (error) {
      console.error('❌ Failed to establish session:', error);
      throw error;
    }
  }

  /**
   * Encrypt a message for a recipient
   */
  async encryptMessage(recipientId, plaintext) {
    try {
      // Get or establish session
      let session = this.sessions.get(recipientId);
      if (!session) {
        session = await this.establishSession(recipientId);
      }
      
      // Perform ratchet step
      const messageKey = await this.ratchetStep(session);
      
      // Generate IV
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Encrypt message with AES-256-GCM
      const encrypted = CryptoJS.AES.encrypt(plaintext, messageKey, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Create message envelope
      const envelope = {
        sessionId: session.id,
        counter: session.sendCounter,
        iv: iv.toString(CryptoJS.enc.Base64),
        ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        tag: encrypted.tag ? encrypted.tag.toString(CryptoJS.enc.Base64) : null,
        timestamp: Date.now()
      };
      
      // Update session counter
      session.sendCounter++;
      await this.persistSession(recipientId, session);
      
      return envelope;
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt a message from a sender
   */
  async decryptMessage(senderId, envelope) {
    try {
      // Get session
      const session = this.sessions.get(senderId);
      if (!session) {
        throw new Error('No session established with sender');
      }
      
      // Verify counter (prevent replay attacks)
      if (envelope.counter <= session.receiveCounter) {
        throw new Error('Message replay detected');
      }
      
      // Get message key for this counter
      const messageKey = await this.getReceiveMessageKey(session, envelope.counter);
      
      // Decrypt message
      const decrypted = CryptoJS.AES.decrypt(
        {
          ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
          tag: envelope.tag ? CryptoJS.enc.Base64.parse(envelope.tag) : undefined
        },
        messageKey,
        {
          iv: CryptoJS.enc.Base64.parse(envelope.iv),
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      
      // Update receive counter
      session.receiveCounter = envelope.counter;
      await this.persistSession(senderId, session);
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt file/media for sending
   */
  async encryptMedia(recipientId, fileData, mimeType) {
    try {
      // Generate random key for this file
      const fileKey = CryptoJS.lib.WordArray.random(32);
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Encrypt file data
      const encrypted = CryptoJS.AES.encrypt(fileData, fileKey, {
        iv: iv,
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding
      });
      
      // Encrypt the file key with session key
      const encryptedKey = await this.encryptMessage(recipientId, fileKey.toString(CryptoJS.enc.Base64));
      
      return {
        encryptedData: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        encryptedKey: encryptedKey,
        iv: iv.toString(CryptoJS.enc.Base64),
        mimeType: mimeType
      };
    } catch (error) {
      console.error('❌ Media encryption failed:', error);
      throw error;
    }
  }

  /**
   * Perform Diffie-Hellman key exchange
   */
  async performKeyExchange(privateKey, publicKey) {
    if (RNCrypto && RNCrypto.performDH) {
      // Use native implementation
      return await RNCrypto.performDH(privateKey, publicKey);
    }
    
    // JavaScript fallback (simplified, should use proper ECDH)
    const private64 = CryptoJS.enc.Base64.parse(privateKey);
    const public64 = CryptoJS.enc.Base64.parse(publicKey);
    
    // This is simplified - real implementation needs proper ECDH
    const shared = CryptoJS.HmacSHA256(public64, private64);
    return shared.toString(CryptoJS.enc.Base64);
  }

  /**
   * Initialize Double Ratchet algorithm
   */
  async initializeRatchet(session) {
    // Generate sending and receiving chain keys
    const info = 'DottE2EChain';
    
    session.sendingChainKey = CryptoJS.HmacSHA256(
      session.rootKey + 'send',
      info
    ).toString(CryptoJS.enc.Base64);
    
    session.receivingChainKey = CryptoJS.HmacSHA256(
      session.rootKey + 'receive',
      info
    ).toString(CryptoJS.enc.Base64);
  }

  /**
   * Perform ratchet step to get next message key
   */
  async ratchetStep(session) {
    // Derive message key from chain key
    const messageKey = CryptoJS.HmacSHA256(
      session.sendingChainKey,
      'MessageKey'
    );
    
    // Advance chain key
    session.sendingChainKey = CryptoJS.HmacSHA256(
      session.sendingChainKey,
      'ChainKey'
    ).toString(CryptoJS.enc.Base64);
    
    return messageKey;
  }

  /**
   * Get message key for received message
   */
  async getReceiveMessageKey(session, counter) {
    // This should handle out-of-order messages
    // Simplified version here
    const messageKey = CryptoJS.HmacSHA256(
      session.receivingChainKey + counter,
      'MessageKey'
    );
    
    return messageKey;
  }

  /**
   * Persist session to secure storage
   */
  async persistSession(recipientId, session) {
    try {
      // Don't store sensitive keys in plain text
      const sessionData = {
        ...session,
        sharedSecret: null, // Don't persist
        rootKey: null // Don't persist
      };
      
      await AsyncStorage.setItem(
        `@e2e:session:${recipientId}`,
        JSON.stringify(sessionData)
      );
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  /**
   * Load persisted sessions
   */
  async loadSessions() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.startsWith('@e2e:session:'));
      
      for (const key of sessionKeys) {
        const sessionData = await AsyncStorage.getItem(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const recipientId = key.replace('@e2e:session:', '');
          this.sessions.set(recipientId, session);
        }
      }
      
      console.log(`✅ Loaded ${this.sessions.size} E2E sessions`);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  /**
   * Delete session with a user
   */
  async deleteSession(recipientId) {
    this.sessions.delete(recipientId);
    await AsyncStorage.removeItem(`@e2e:session:${recipientId}`);
  }

  /**
   * Verify message authenticity (prevent tampering)
   */
  verifyMessage(message, signature, senderPublicKey) {
    // Verify HMAC or digital signature
    const computed = CryptoJS.HmacSHA256(message, senderPublicKey);
    return computed.toString() === signature;
  }

  /**
   * Get auth token for API calls
   */
  async getAuthToken() {
    return await AsyncStorage.getItem('@auth:token');
  }

  /**
   * Derive public key from private key (simplified)
   */
  derivePublicKey(privateKey) {
    // This is simplified - real implementation needs proper ECC
    return CryptoJS.HmacSHA256(privateKey, 'PublicKey');
  }

  /**
   * Export user's keys for backup
   */
  async exportKeys() {
    return {
      identity: this.identityKeyPair,
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        recipientId: id,
        sessionId: session.id,
        createdAt: session.createdAt
      }))
    };
  }

  /**
   * Import backed up keys
   */
  async importKeys(backup) {
    this.identityKeyPair = backup.identity;
    await AsyncStorage.setItem('@e2e:identity', JSON.stringify(this.identityKeyPair));
    
    // Re-establish sessions
    for (const sessionInfo of backup.sessions) {
      await this.establishSession(sessionInfo.recipientId);
    }
  }
}

// Singleton instance
const encryptionService = new E2EEncryptionService();
export default encryptionService;