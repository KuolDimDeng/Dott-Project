import axios from 'axios';
import ENV from '../config/environment';

// Create separate API instance for phone auth (no auth header needed)
const phoneAuthApi = axios.create({
  baseURL: `${ENV.apiUrl}/api/auth/phone`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
phoneAuthApi.interceptors.request.use(
  (config) => {
    console.log('📱 Phone Auth API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('📱 Phone Auth API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
phoneAuthApi.interceptors.response.use(
  (response) => {
    console.log('📱 Phone Auth API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('📱 Phone Auth API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });
    return Promise.reject(error);
  }
);

export const phoneAuthService = {
  /**
   * Send OTP to phone number
   * @param {string} phoneNumber - Phone number in international format (+1234567890)
   * @returns {Promise<{success: boolean, message: string, expires_in?: number}>}
   */
  async sendOTP(phoneNumber) {
    try {
      const response = await phoneAuthApi.post('/send-otp/', {
        phone: phoneNumber
      });
      
      return {
        success: response.data.success,
        message: response.data.message,
        expires_in: response.data.expires_in
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          'Failed to send verification code. Please try again.';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Verify OTP and authenticate user
   * @param {string} phoneNumber - Phone number in international format
   * @param {string} otpCode - 6-digit OTP code
   * @returns {Promise<{success: boolean, message: string, data?: object}>}
   */
  async verifyOTP(phoneNumber, otpCode) {
    try {
      const response = await phoneAuthApi.post('/verify-otp/', {
        phone: phoneNumber,
        code: otpCode
      });
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
          data: {
            token: response.data.data.token,
            user: response.data.data.user,
            requires_onboarding: response.data.data.requires_onboarding
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          'Verification failed. Please try again.';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Get phone auth system status (for debugging)
   * @returns {Promise<{success: boolean, data?: object}>}
   */
  async getStatus() {
    try {
      const response = await phoneAuthApi.get('/status/');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get auth status'
      };
    }
  }
};

export default phoneAuthService;