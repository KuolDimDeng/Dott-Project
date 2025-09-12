import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorage from '../../services/secureStorage';

describe('SecureStorage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the availability check
    SecureStorage.isSecureStorageAvailable = null;
  });

  describe('checkAvailability', () => {
    it('should return true when keychain is available', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      
      const isAvailable = await SecureStorage.checkAvailability();
      
      expect(isAvailable).toBe(true);
      expect(Keychain.getSupportedBiometryType).toHaveBeenCalled();
    });

    it('should return false when keychain is not available', async () => {
      Keychain.getSupportedBiometryType.mockRejectedValue(new Error('Not supported'));
      
      const isAvailable = await SecureStorage.checkAvailability();
      
      expect(isAvailable).toBe(false);
    });

    it('should cache availability result', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('TouchID');
      
      await SecureStorage.checkAvailability();
      await SecureStorage.checkAvailability();
      
      expect(Keychain.getSupportedBiometryType).toHaveBeenCalledTimes(1);
    });
  });

  describe('setSecureItem', () => {
    it('should store item securely when keychain is available', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      Keychain.setInternetCredentials.mockResolvedValue(true);
      
      const result = await SecureStorage.setSecureItem('testKey', { data: 'testValue' });
      
      expect(result).toBe(true);
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'testKey',
        'testKey',
        JSON.stringify({ data: 'testValue' }),
        expect.objectContaining({
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should fallback to AsyncStorage when keychain is not available', async () => {
      Keychain.getSupportedBiometryType.mockRejectedValue(new Error('Not supported'));
      
      await SecureStorage.setSecureItem('testKey', { data: 'testValue' });
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify({ data: 'testValue' })
      );
    });
  });

  describe('getSecureItem', () => {
    it('should retrieve item from keychain when available', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      Keychain.getInternetCredentials.mockResolvedValue({
        password: JSON.stringify({ data: 'testValue' }),
      });
      
      const result = await SecureStorage.getSecureItem('testKey');
      
      expect(result).toEqual({ data: 'testValue' });
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith('testKey');
    });

    it('should return null when item does not exist', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      Keychain.getInternetCredentials.mockResolvedValue(false);
      
      const result = await SecureStorage.getSecureItem('nonExistentKey');
      
      expect(result).toBeNull();
    });

    it('should fallback to AsyncStorage when keychain is not available', async () => {
      Keychain.getSupportedBiometryType.mockRejectedValue(new Error('Not supported'));
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ data: 'testValue' }));
      
      const result = await SecureStorage.getSecureItem('testKey');
      
      expect(result).toEqual({ data: 'testValue' });
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('testKey');
    });
  });

  describe('removeSecureItem', () => {
    it('should remove item from keychain when available', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      Keychain.resetInternetCredentials.mockResolvedValue(true);
      
      const result = await SecureStorage.removeSecureItem('testKey');
      
      expect(result).toBe(true);
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('testKey');
    });

    it('should fallback to AsyncStorage when keychain is not available', async () => {
      Keychain.getSupportedBiometryType.mockRejectedValue(new Error('Not supported'));
      
      await SecureStorage.removeSecureItem('testKey');
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
    });
  });

  describe('migrateToSecureStorage', () => {
    it('should migrate sensitive data from AsyncStorage to secure storage', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      Keychain.setInternetCredentials.mockResolvedValue(true);
      
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'sessionId') return Promise.resolve('session123');
        if (key === 'sessionToken') return Promise.resolve('token456');
        return Promise.resolve(null);
      });
      
      await SecureStorage.migrateToSecureStorage();
      
      expect(Keychain.setInternetCredentials).toHaveBeenCalledTimes(2);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sessionId');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sessionToken');
    });

    it('should handle migration errors gracefully', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      AsyncStorage.getItem.mockResolvedValue('testValue');
      Keychain.setInternetCredentials.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw
      await expect(SecureStorage.migrateToSecureStorage()).resolves.not.toThrow();
    });
  });

  describe('authenticateWithBiometrics', () => {
    it('should return success when biometrics are available', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      Keychain.getInternetCredentials.mockResolvedValue({});
      
      const result = await SecureStorage.authenticateWithBiometrics('Test authentication');
      
      expect(result.success).toBe(true);
      expect(result.biometryType).toBe('FaceID');
    });

    it('should return success with message when biometrics are not available', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue(null);
      
      const result = await SecureStorage.authenticateWithBiometrics('Test authentication');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('No biometry available');
    });

    it('should handle authentication failure', async () => {
      Keychain.getSupportedBiometryType.mockResolvedValue('TouchID');
      Keychain.getInternetCredentials.mockRejectedValue(new Error('User cancelled'));
      
      const result = await SecureStorage.authenticateWithBiometrics('Test authentication');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled');
    });
  });
});