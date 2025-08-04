'use client';

import { apiService } from './apiService';

/**
 * Auth Service - Extracted from massive apiClient.js
 * Handles all authentication-related API operations
 */
export const authService = {
  // Session management
  async createSession(credentials) {
    return apiService.post('/auth/session-v2', credentials);
  },

  async getSession() {
    return apiService.get('/auth/session-v2');
  },

  async deleteSession() {
    return apiService.delete('/auth/session-v2');
  },

  async verifySession() {
    return apiService.get('/auth/session-verify');
  },

  // OAuth flows
  async getAuthUrl(provider) {
    return apiService.get(`/auth/oauth/${provider}/url`);
  },

  async handleOAuthCallback(provider, code, state) {
    return apiService.post(`/auth/oauth/${provider}/callback`, {
      code,
      state
    });
  },

  // Password management
  async requestPasswordReset(email) {
    return apiService.post('/auth/password-reset/request', { email });
  },

  async resetPassword(token, newPassword) {
    return apiService.post('/auth/password-reset/confirm', {
      token,
      new_password: newPassword
    });
  },

  async changePassword(currentPassword, newPassword) {
    return apiService.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  },

  // Account registration
  async register(userData) {
    return apiService.post('/auth/register', userData);
  },

  async verifyEmail(token) {
    return apiService.post('/auth/verify-email', { token });
  },

  async resendVerificationEmail(email) {
    return apiService.post('/auth/resend-verification', { email });
  },

  // Profile setup
  async completeOnboarding(onboardingData) {
    return apiService.post('/auth/complete-onboarding', onboardingData);
  },

  async getOnboardingStatus() {
    return apiService.get('/auth/onboarding-status');
  }
};
