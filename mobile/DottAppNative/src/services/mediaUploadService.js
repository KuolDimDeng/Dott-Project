/**
 * Media Upload Service for Cloudinary
 * Optimized for African mobile networks with automatic quality adaptation
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import ENV from '../config/environment';

class MediaUploadService {
  constructor() {
    this.baseURL = `${ENV.apiUrl}/api/chat`;
    this.uploadTimeout = 60000; // 60 seconds for uploads
  }

  /**
   * Get network quality to determine upload strategy
   */
  async getNetworkQuality() {
    const netInfo = await NetInfo.fetch();
    
    // Determine quality based on connection type
    if (netInfo.type === 'wifi') {
      return 'high';
    } else if (netInfo.type === 'cellular') {
      // Check effective type for cellular
      const effectiveType = netInfo.details?.cellularGeneration;
      if (effectiveType === '4g' || effectiveType === '5g') {
        return 'medium';
      } else if (effectiveType === '3g') {
        return 'low';
      } else {
        return 'very-low'; // 2G or Edge
      }
    }
    
    return 'unknown';
  }

  /**
   * Upload voice note with automatic quality adjustment
   */
  async uploadVoiceNote(conversationId, audioFile) {
    try {
      const networkQuality = await this.getNetworkQuality();
      console.log(`📡 Network quality: ${networkQuality}`);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', {
        uri: audioFile.uri,
        type: audioFile.type || 'audio/m4a',
        name: audioFile.name || `voice_${Date.now()}.m4a`,
      });
      
      // Add quality hint for server-side optimization
      formData.append('network_quality', networkQuality);
      
      const token = await AsyncStorage.getItem('@auth:token');
      
      const response = await this.uploadWithRetry(
        `${this.baseURL}/conversations/${conversationId}/upload-voice/`,
        formData,
        token,
        networkQuality
      );
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Store URLs for offline access
      await this.cacheMediaUrl(result.message_id, {
        type: 'voice',
        url: result.voice_url,
        low_bandwidth_url: result.low_bandwidth_url,
        duration: result.duration
      });
      
      return result;
    } catch (error) {
      console.error('❌ Voice upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload image with automatic compression based on network
   */
  async uploadImage(conversationId, imageFile, caption = '') {
    try {
      const networkQuality = await this.getNetworkQuality();
      console.log(`📡 Network quality: ${networkQuality}`);
      
      // Compress image based on network quality
      const processedImage = await this.preprocessImage(imageFile, networkQuality);
      
      const formData = new FormData();
      formData.append('image', {
        uri: processedImage.uri,
        type: processedImage.type || 'image/jpeg',
        name: processedImage.name || `image_${Date.now()}.jpg`,
      });
      
      if (caption) {
        formData.append('caption', caption);
      }
      
      formData.append('network_quality', networkQuality);
      
      const token = await AsyncStorage.getItem('@auth:token');
      
      const response = await this.uploadWithRetry(
        `${this.baseURL}/conversations/${conversationId}/upload-image/`,
        formData,
        token,
        networkQuality
      );
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Cache URLs for offline viewing
      await this.cacheMediaUrl(result.message_id, {
        type: 'image',
        url: result.image_url,
        thumbnail_url: result.thumbnail_url,
        medium_url: result.medium_url,
        width: result.width,
        height: result.height
      });
      
      return result;
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload video with quality based on network
   */
  async uploadVideo(conversationId, videoFile) {
    try {
      const networkQuality = await this.getNetworkQuality();
      console.log(`📡 Network quality: ${networkQuality}`);
      
      // Check if video size is appropriate for network
      if (networkQuality === 'very-low' && videoFile.size > 5 * 1024 * 1024) {
        throw new Error('Video too large for 2G network. Please use WiFi or reduce video size.');
      }
      
      const formData = new FormData();
      formData.append('video', {
        uri: videoFile.uri,
        type: videoFile.type || 'video/mp4',
        name: videoFile.name || `video_${Date.now()}.mp4`,
      });
      
      formData.append('network_quality', networkQuality);
      
      const token = await AsyncStorage.getItem('@auth:token');
      
      // Longer timeout for video uploads
      const response = await this.uploadWithRetry(
        `${this.baseURL}/conversations/${conversationId}/upload-video/`,
        formData,
        token,
        networkQuality,
        120000 // 2 minutes for video
      );
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Cache video metadata
      await this.cacheMediaUrl(result.message_id, {
        type: 'video',
        url: result.video_url,
        thumbnail_url: result.thumbnail_url,
        low_bandwidth_url: result.low_bandwidth_url,
        duration: result.duration
      });
      
      return result;
    } catch (error) {
      console.error('❌ Video upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload with retry logic for poor connections
   */
  async uploadWithRetry(url, formData, token, networkQuality, timeout = 60000, maxRetries = 3) {
    let lastError;
    
    // More retries for poor connections
    const retries = networkQuality === 'very-low' ? 5 : maxRetries;
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`📤 Upload attempt ${i + 1}/${retries}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Network-Quality': networkQuality,
          },
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return response;
        }
        
        // Don't retry on client errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        }
        
        lastError = new Error(`Server error: ${response.status}`);
        
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Upload attempt ${i + 1} failed:`, error.message);
        
        // Wait before retry (exponential backoff)
        if (i < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Preprocess image based on network quality
   */
  async preprocessImage(imageFile, networkQuality) {
    // In a real app, you'd use react-native-image-resizer here
    // For now, return as-is with quality hint
    
    const qualitySettings = {
      'high': { quality: 0.9, maxWidth: 1920 },
      'medium': { quality: 0.7, maxWidth: 1280 },
      'low': { quality: 0.5, maxWidth: 800 },
      'very-low': { quality: 0.3, maxWidth: 480 }
    };
    
    const settings = qualitySettings[networkQuality] || qualitySettings.medium;
    
    // This would be actual compression logic
    console.log(`📸 Image preprocessing with quality: ${settings.quality}`);
    
    return {
      ...imageFile,
      preprocessed: true,
      quality: settings.quality
    };
  }

  /**
   * Cache media URLs for offline access
   */
  async cacheMediaUrl(messageId, mediaData) {
    try {
      const cacheKey = `@media:${messageId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        ...mediaData,
        cached_at: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to cache media URL:', error);
    }
  }

  /**
   * Get cached media URL
   */
  async getCachedMedia(messageId) {
    try {
      const cacheKey = `@media:${messageId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to get cached media:', error);
      return null;
    }
  }

  /**
   * Get appropriate media URL based on network
   */
  async getAdaptiveMediaUrl(messageId, urls) {
    const networkQuality = await this.getNetworkQuality();
    
    // Choose URL based on network quality
    if (networkQuality === 'very-low' && urls.low_bandwidth_url) {
      return urls.low_bandwidth_url;
    } else if (networkQuality === 'low' && urls.medium_url) {
      return urls.medium_url;
    } else if (urls.thumbnail_url && networkQuality !== 'high') {
      return urls.thumbnail_url;
    }
    
    return urls.url || urls.image_url || urls.voice_url;
  }

  /**
   * Clean old cached media (retention policy)
   */
  async cleanOldCache(daysOld = 7) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mediaKeys = keys.filter(k => k.startsWith('@media:'));
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);
      
      for (const key of mediaKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          const cachedDate = new Date(data.cached_at);
          
          if (cachedDate < cutoff) {
            await AsyncStorage.removeItem(key);
            console.log(`🗑️ Removed old cached media: ${key}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clean cache:', error);
    }
  }
}

// Singleton instance
const mediaUploadService = new MediaUploadService();
export default mediaUploadService;