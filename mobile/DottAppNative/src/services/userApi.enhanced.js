/**
 * Enhanced version of userApi.js with production-ready error handling
 * This shows how to migrate existing services to the new error handling system
 */

import enhancedAPI from './api/enhancedApi';
import Logger from './logger/Logger';
import { ErrorToast } from '../components/ErrorFeedback/ErrorToast';

export const userApiEnhanced = {
  /**
   * Get current user profile with proper error handling
   * Returns null on 404, shows toast on error, retries on network issues
   */
  getCurrentUser: async () => {
    try {
      const response = await enhancedAPI.get('/users/me/', {
        showErrorToast: true,
        fallbackData: null, // Return null if user not found
        retryOnFailure: true,
        cacheKey: 'user:current',
        cacheTTL: 60000 // Cache for 1 minute
      });

      // Handle successful response
      if (response.data) {
        if (__DEV__) {
          Logger.success('user-api', 'User profile fetched', {
            userId: response.data.id,
            hasBusinesss: response.data.has_business
          });
        }
        return response.data;
      }

      // Handle 404 - user not found
      if (response.notFound) {
        if (__DEV__) {
          Logger.warning('user-api', 'User profile not found');
        }
        return null;
      }

      // Handle offline - return cached data if available
      if (response.offline) {
        if (__DEV__) {
          Logger.info('user-api', 'Using cached user profile (offline)');
        }
        ErrorToast.showOffline();
        return response.data; // May be null
      }

      return response.data;

    } catch (error) {
      // This will only be reached for unhandled errors
      if (__DEV__) {
        Logger.error('user-api', 'Failed to fetch user profile', error);
      }

      // Show user-friendly error
      ErrorToast.showError(
        'Failed to load profile',
        'Please try again later'
      );

      return null;
    }
  },

  /**
   * Update user profile with validation error handling
   */
  updateProfile: async (userData) => {
    try {
      const response = await enhancedAPI.patch('/users/me/', userData, {
        showErrorToast: true,
        retryOnFailure: true
      });

      if (response.data) {
        ErrorToast.showSuccess('Profile Updated', 'Your changes have been saved');

        if (__DEV__) {
          Logger.success('user-api', 'Profile updated successfully');
        }
      }

      return response.data;

    } catch (error) {
      // Handle validation errors specifically
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors || {};
        const firstError = Object.values(errors)[0];
        const message = Array.isArray(firstError) ? firstError[0] : firstError;

        ErrorToast.showValidationError(message || 'Please check your input');

        if (__DEV__) {
          Logger.warning('user-api', 'Validation error', errors);
        }
      }

      throw error; // Re-throw for component to handle
    }
  },

  /**
   * Get user business status with circuit breaker protection
   */
  getUserBusinessStatus: async () => {
    try {
      const response = await enhancedAPI.get('/users/business-features/', {
        showErrorToast: false, // Don't show toast for this background check
        fallbackData: { hasAccess: false, features: [] },
        retryOnFailure: true,
        cacheKey: 'user:business-status',
        cacheTTL: 300000 // Cache for 5 minutes
      });

      // Handle various response scenarios
      if (response.circuitOpen) {
        // Service is down, use cached or default
        if (__DEV__) {
          Logger.warning('user-api', 'Business features service unavailable');
        }
        return response.data || { hasAccess: false, features: [] };
      }

      if (response.offline || response.serverError) {
        // Use cached data if available
        if (__DEV__) {
          Logger.info('user-api', 'Using cached business features');
        }
        return response.data || { hasAccess: false, features: [] };
      }

      return response.data;

    } catch (error) {
      if (__DEV__) {
        Logger.error('user-api', 'Failed to fetch business status', error);
      }

      // Return safe default
      return { hasAccess: false, features: [] };
    }
  },

  /**
   * Delete user account with confirmation
   */
  deleteAccount: async (password) => {
    try {
      const response = await enhancedAPI.delete('/users/me/', {
        data: { password },
        showErrorToast: true,
        retryOnFailure: false // Don't retry deletes
      });

      if (response.data?.success) {
        ErrorToast.showSuccess('Account Deleted', 'Your account has been removed');
        return true;
      }

      return false;

    } catch (error) {
      if (error.response?.status === 403) {
        ErrorToast.showError('Invalid Password', 'Please check your password');
      } else {
        ErrorToast.showError('Delete Failed', 'Could not delete your account');
      }

      throw error;
    }
  },

  /**
   * Upload profile picture with progress tracking
   */
  uploadProfilePicture: async (imageUri, onProgress) => {
    const formData = new FormData();
    formData.append('profile_picture', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg'
    });

    try {
      const response = await enhancedAPI.post('/users/profile-picture/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        showErrorToast: true,
        retryOnFailure: true,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (onProgress) {
            onProgress(progress);
          }

          if (__DEV__) {
            Logger.info('upload', `Upload progress: ${progress}%`);
          }
        }
      });

      ErrorToast.showSuccess('Photo Uploaded', 'Your profile picture has been updated');
      return response.data;

    } catch (error) {
      if (error.response?.status === 413) {
        ErrorToast.showError('File Too Large', 'Please choose a smaller image');
      } else {
        ErrorToast.showError('Upload Failed', 'Could not upload your photo');
      }

      throw error;
    }
  }
};

// Export as default for easy migration
export default userApiEnhanced;