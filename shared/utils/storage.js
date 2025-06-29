let SecureStore;
let AsyncStorage;

if (typeof window === 'undefined' && global.__expo) {
  SecureStore = require('expo-secure-store');
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

class StorageManager {
  async setSecureItem(key, value) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    } else if (SecureStore) {
      await SecureStore.setItemAsync(key, value);
    }
  }

  async getSecureItem(key) {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    } else if (SecureStore) {
      return await SecureStore.getItemAsync(key);
    }
    return null;
  }

  async removeSecureItem(key) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    } else if (SecureStore) {
      await SecureStore.deleteItemAsync(key);
    }
  }

  async setItem(key, value) {
    const stringValue = JSON.stringify(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, stringValue);
    } else if (AsyncStorage) {
      await AsyncStorage.setItem(key, stringValue);
    }
  }

  async getItem(key) {
    let value;
    if (typeof window !== 'undefined') {
      value = localStorage.getItem(key);
    } else if (AsyncStorage) {
      value = await AsyncStorage.getItem(key);
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    } else if (AsyncStorage) {
      await AsyncStorage.removeItem(key);
    }
  }

  async clear() {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    } else if (AsyncStorage) {
      await AsyncStorage.clear();
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