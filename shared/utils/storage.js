let SecureStore;
let AsyncStorage;

// Check if we're in React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

if (isReactNative) {
  SecureStore = require('expo-secure-store');
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

class StorageManager {
  async setSecureItem(key, value) {
    if (isReactNative && SecureStore) {
      await SecureStore.setItemAsync(key, value);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  }

  async getSecureItem(key) {
    if (isReactNative && SecureStore) {
      return await SecureStore.getItemAsync(key);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  }

  async removeSecureItem(key) {
    if (isReactNative && SecureStore) {
      await SecureStore.deleteItemAsync(key);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  }

  async setItem(key, value) {
    const stringValue = JSON.stringify(value);
    if (isReactNative && AsyncStorage) {
      await AsyncStorage.setItem(key, stringValue);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, stringValue);
    }
  }

  async getItem(key) {
    let value;
    if (isReactNative && AsyncStorage) {
      value = await AsyncStorage.getItem(key);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      value = localStorage.getItem(key);
    }
    
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return null;
  }

  async removeItem(key) {
    if (isReactNative && AsyncStorage) {
      await AsyncStorage.removeItem(key);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  }

  async clear() {
    if (isReactNative && AsyncStorage) {
      await AsyncStorage.clear();
    } else if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
  }
}

export const storage = new StorageManager();

export const tokenStorage = {
  async setToken(token) {
    return storage.setSecureItem('auth_token', token);
  },
  
  async getToken() {
    return storage.getSecureItem('auth_token');
  },
  
  async removeToken() {
    return storage.removeSecureItem('auth_token');
  },
};

export const userStorage = {
  async setUser(user) {
    return storage.setItem('user_data', user);
  },
  
  async getUser() {
    return storage.getItem('user_data');
  },
  
  async removeUser() {
    return storage.removeItem('user_data');
  },
};