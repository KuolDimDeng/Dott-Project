import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SecureStorageService {
  constructor() {
    this.isSecureStorageAvailable = null;
  }

  async checkAvailability() {
    if (this.isSecureStorageAvailable !== null) {
      return this.isSecureStorageAvailable;
    }

    try {
      const supported = await Keychain.getSupportedBiometryType();
      this.isSecureStorageAvailable = true;
      if (__DEV__) {
        console.log('🔐 Secure storage available. Biometry type:', supported);
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('⚠️ Secure storage not available, falling back to AsyncStorage');
      }
      this.isSecureStorageAvailable = false;
      return false;
    }
  }

  async setSecureItem(key, value, options = {}) {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      // Fallback to AsyncStorage with warning
      if (__DEV__) {
        console.warn(`⚠️ Storing ${key} in AsyncStorage (not secure)`);
      }
      // For AsyncStorage, store strings directly, objects as JSON
      const storeValue = typeof value === 'string' ? value : JSON.stringify(value);
      return AsyncStorage.setItem(key, storeValue);
    }

    try {
      // For Keychain, store strings directly, objects as JSON
      const storeValue = typeof value === 'string' ? value : JSON.stringify(value);
      await Keychain.setInternetCredentials(
        key,
        key,
        storeValue,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          ...options,
        }
      );
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to store secure item:', error);
      }
      throw error;
    }
  }

  async getSecureItem(key) {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      // Fallback to AsyncStorage
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      // Return the raw string value - don't try to parse JSON for tokens/IDs
      return value;
    }

    try {
      const credentials = await Keychain.getInternetCredentials(key);
      if (credentials && credentials.password) {
        // For session tokens and IDs, return the raw string
        // Only parse JSON for complex objects like userData
        if (key === 'userData' || key.includes('profile') || key.includes('config')) {
          try {
            return JSON.parse(credentials.password);
          } catch {
            return credentials.password;
          }
        }
        // For sessionId, sessionToken, authToken etc, return as plain string
        return credentials.password;
      }
      return null;
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to retrieve secure item:', error);
      }
      return null;
    }
  }

  async removeSecureItem(key) {
    const isAvailable = await this.checkAvailability();
    
    if (!isAvailable) {
      return AsyncStorage.removeItem(key);
    }

    try {
      await Keychain.resetInternetCredentials(key);
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to remove secure item:', error);
      }
      throw error;
    }
  }

  async clearAll() {
    const isAvailable = await this.checkAvailability();
    
    if (isAvailable) {
      await Keychain.resetGenericPassword();
    }
    
    // Also clear AsyncStorage for fallback items
    const keys = await AsyncStorage.getAllKeys();
    const secureKeys = keys.filter(key => 
      key.includes('session') || 
      key.includes('token') || 
      key.includes('password')
    );
    await AsyncStorage.multiRemove(secureKeys);
  }

  // Biometric authentication
  async authenticateWithBiometrics(reason = 'Authenticate to access your account') {
    const isAvailable = await this.checkAvailability();
    
    if (!isAvailable) {
      return { success: true, message: 'Biometrics not available' };
    }

    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      if (!biometryType) {
        return { success: true, message: 'No biometry available' };
      }

      const options = {
        authenticationPrompt: {
          title: 'Authentication Required',
          subtitle: reason,
          cancel: 'Cancel',
        },
      };

      const credentials = await Keychain.getInternetCredentials(
        'biometric_check',
        options
      );

      return { success: true, biometryType };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Migrate existing AsyncStorage to secure storage
  async migrateToSecureStorage() {
    const keysToMigrate = [
      'sessionId',
      'sessionToken',
      'userData',
      'userToken',
    ];

    for (const key of keysToMigrate) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          await this.setSecureItem(key, value);
          await AsyncStorage.removeItem(key);
          if (__DEV__) {
            console.log(`✅ Migrated ${key} to secure storage`);
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error(`Failed to migrate ${key}:`, error);
        }
      }
    }
  }
}

export default new SecureStorageService();