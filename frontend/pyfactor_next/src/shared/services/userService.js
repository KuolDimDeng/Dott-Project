'use client';

import { apiService } from './apiService';

/**
 * User Service - Extracted from massive apiClient.js
 * Handles all user-related API operations
 */
export const userService = {
  // Get current user
  async getCurrentUser() {
    return apiService.get('/user/me');
  },

  // Update user profile
  async updateProfile(userData) {
    return apiService.patch('/user/me', userData);
  },

  // Change password
  async changePassword(passwordData) {
    return apiService.post('/user/change-password', passwordData);
  },

  // Update preferences
  async updatePreferences(preferences) {
    return apiService.patch('/user/preferences', preferences);
  },

  // Get user settings
  async getSettings() {
    return apiService.get('/user/settings');
  },

  // Update settings
  async updateSettings(settings) {
    return apiService.patch('/user/settings', settings);
  },

  // Subscription management
  async getSubscription() {
    return apiService.get('/user/subscription');
  },

  async updateSubscription(subscriptionData) {
    return apiService.post('/user/subscription', subscriptionData);
  },

  async cancelSubscription(reason = '') {
    return apiService.post('/user/subscription/cancel', { reason });
  },

  // Account management
  async closeAccount(feedback = '') {
    return apiService.post('/user/close-account', { feedback });
  },

  // Notification preferences
  async getNotificationSettings() {
    return apiService.get('/user/notifications/settings');
  },

  async updateNotificationSettings(settings) {
    return apiService.patch('/user/notifications/settings', settings);
  },

  // Two-factor authentication
  async enable2FA() {
    return apiService.post('/user/2fa/enable');
  },

  async disable2FA(code) {
    return apiService.post('/user/2fa/disable', { code });
  },

  async verify2FA(code) {
    return apiService.post('/user/2fa/verify', { code });
  }
};
