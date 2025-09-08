import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Platform, Alert } from 'react-native';
import { BASE_URL } from '../config/environment';

const PENDING_UPLOADS_KEY = '@pending_profile_uploads';
const PROFILE_PICTURE_CACHE_KEY = '@profile_picture_cache';

class ProfilePictureService {
  constructor() {
    // Start monitoring network connectivity
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Try to upload pending profile pictures when connection is restored
        this.uploadPendingPictures();
      }
    });
  }

  // Convert image to base64 data URL
  imageToBase64(uri, type = 'image/jpeg') {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        // For web platform (if ever used)
        fetch(uri)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
          .catch(reject);
      } else {
        // For mobile platforms, the uri is already base64 if we request it
        resolve(`data:${type};base64,${uri}`);
      }
    });
  }

  // Show image picker options
  async showImagePicker() {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Select Profile Picture',
        'Choose from where you want to select an image',
        [
          { text: 'Camera', onPress: () => this.openCamera(resolve, reject) },
          { text: 'Photo Library', onPress: () => this.openGallery(resolve, reject) },
          { text: 'Cancel', style: 'cancel', onPress: () => reject('User cancelled') }
        ],
        { cancelable: true }
      );
    });
  }

  // Open camera
  openCamera(resolve, reject) {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8,
      cameraType: 'front', // Default to front camera for selfies
    };

    launchCamera(options, (response) => {
      if (response.didCancel || response.errorCode) {
        reject(response.errorMessage || 'User cancelled');
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const base64Data = `data:${asset.type};base64,${asset.base64}`;
        resolve(base64Data);
      }
    });
  }

  // Open gallery
  openGallery(resolve, reject) {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorCode) {
        reject(response.errorMessage || 'User cancelled');
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const base64Data = `data:${asset.type};base64,${asset.base64}`;
        resolve(base64Data);
      }
    });
  }

  // Save profile picture locally
  async saveProfilePictureLocally(base64Data, userId) {
    try {
      const cacheData = {
        userId,
        profilePicture: base64Data,
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      await AsyncStorage.setItem(PROFILE_PICTURE_CACHE_KEY, JSON.stringify(cacheData));
      
      // Also add to pending uploads if offline
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        await this.addToPendingUploads(base64Data, userId);
      }
      
      return cacheData;
    } catch (error) {
      console.error('Error saving profile picture locally:', error);
      throw error;
    }
  }

  // Add to pending uploads queue
  async addToPendingUploads(base64Data, userId) {
    try {
      const pendingUploadsStr = await AsyncStorage.getItem(PENDING_UPLOADS_KEY);
      const pendingUploads = pendingUploadsStr ? JSON.parse(pendingUploadsStr) : [];
      
      // Add new upload to queue (replace if same user)
      const existingIndex = pendingUploads.findIndex(upload => upload.userId === userId);
      const uploadData = {
        userId,
        profilePicture: base64Data,
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      if (existingIndex >= 0) {
        pendingUploads[existingIndex] = uploadData;
      } else {
        pendingUploads.push(uploadData);
      }
      
      await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(pendingUploads));
    } catch (error) {
      console.error('Error adding to pending uploads:', error);
    }
  }

  // Upload profile picture to server
  async uploadProfilePicture(base64Data, sessionToken) {
    try {
      const response = await fetch(`${BASE_URL}/api/users/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({
          profile_picture: base64Data
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Mark as synced in local cache
      await this.markAsSynced();
      
      return data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }

  // Mark local cache as synced
  async markAsSynced() {
    try {
      const cacheStr = await AsyncStorage.getItem(PROFILE_PICTURE_CACHE_KEY);
      if (cacheStr) {
        const cacheData = JSON.parse(cacheStr);
        cacheData.synced = true;
        await AsyncStorage.setItem(PROFILE_PICTURE_CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Error marking as synced:', error);
    }
  }

  // Upload all pending profile pictures
  async uploadPendingPictures() {
    try {
      const pendingUploadsStr = await AsyncStorage.getItem(PENDING_UPLOADS_KEY);
      if (!pendingUploadsStr) return;
      
      const pendingUploads = JSON.parse(pendingUploadsStr);
      if (pendingUploads.length === 0) return;
      
      // Get session token
      const sessionStr = await AsyncStorage.getItem('@user_session');
      if (!sessionStr) return;
      
      const session = JSON.parse(sessionStr);
      const sessionToken = session.token;
      
      // Try to upload each pending picture
      const remainingUploads = [];
      
      for (const upload of pendingUploads) {
        try {
          // Limit retry attempts
          if (upload.attempts >= 3) {
            console.log(`Skipping upload for user ${upload.userId} - max attempts reached`);
            continue;
          }
          
          await this.uploadProfilePicture(upload.profilePicture, sessionToken);
          console.log(`Successfully uploaded profile picture for user ${upload.userId}`);
        } catch (error) {
          console.error(`Failed to upload profile picture for user ${upload.userId}:`, error);
          upload.attempts = (upload.attempts || 0) + 1;
          remainingUploads.push(upload);
        }
      }
      
      // Update pending uploads list
      if (remainingUploads.length === 0) {
        await AsyncStorage.removeItem(PENDING_UPLOADS_KEY);
      } else {
        await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(remainingUploads));
      }
    } catch (error) {
      console.error('Error processing pending uploads:', error);
    }
  }

  // Get cached profile picture
  async getCachedProfilePicture(userId) {
    try {
      const cacheStr = await AsyncStorage.getItem(PROFILE_PICTURE_CACHE_KEY);
      if (!cacheStr) return null;
      
      const cacheData = JSON.parse(cacheStr);
      if (cacheData.userId === userId) {
        return cacheData.profilePicture;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached profile picture:', error);
      return null;
    }
  }

  // Clear cached profile picture
  async clearCachedProfilePicture() {
    try {
      await AsyncStorage.removeItem(PROFILE_PICTURE_CACHE_KEY);
      await AsyncStorage.removeItem(PENDING_UPLOADS_KEY);
    } catch (error) {
      console.error('Error clearing cached profile picture:', error);
    }
  }

  // Main method to update profile picture
  async updateProfilePicture(userId, sessionToken) {
    try {
      // Show image picker
      const base64Data = await this.showImagePicker();
      
      // Save locally first
      await this.saveProfilePictureLocally(base64Data, userId);
      
      // Check network and try to upload
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && netInfo.isInternetReachable) {
        try {
          const result = await this.uploadProfilePicture(base64Data, sessionToken);
          return { success: true, data: result, synced: true };
        } catch (uploadError) {
          console.log('Upload failed, saved for later sync:', uploadError);
          await this.addToPendingUploads(base64Data, userId);
          return { success: true, data: { profile_picture: base64Data }, synced: false };
        }
      } else {
        // No internet, save for later
        await this.addToPendingUploads(base64Data, userId);
        return { success: true, data: { profile_picture: base64Data }, synced: false };
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw error;
    }
  }
}

export default new ProfilePictureService();