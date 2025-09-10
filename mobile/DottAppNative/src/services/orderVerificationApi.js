/**
 * Order Verification API Service
 * Secure passcode verification system for order pickup and delivery
 */
import api from './api';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OrderVerificationService {
  /**
   * Generate passcodes for a new order
   */
  async generateOrderPasscodes(orderId) {
    try {
      const response = await api.post(`/orders/${orderId}/generate-passcodes/`);
      return {
        pickupCode: response.data.pickup_code,
        deliveryCode: response.data.delivery_code,
        expiresAt: response.data.expires_at,
        orderId: response.data.order_id
      };
    } catch (error) {
      console.error('Error generating passcodes:', error);
      throw error;
    }
  }

  /**
   * Verify pickup passcode (for business)
   */
  async verifyPickupCode(orderId, pickupCode, location = null) {
    try {
      const payload = {
        order_id: orderId,
        pickup_code: pickupCode,
        timestamp: new Date().toISOString()
      };

      // Add GPS verification if available
      if (location) {
        payload.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        };
      }

      const response = await api.post('/orders/verify-pickup/', payload);
      
      return {
        success: response.data.success,
        paymentReleased: response.data.payment_released,
        businessPayment: response.data.business_payment,
        courierInfo: response.data.courier_info,
        nextStep: response.data.next_step
      };
    } catch (error) {
      console.error('Error verifying pickup code:', error);
      throw error;
    }
  }

  /**
   * Verify delivery passcode (for courier)
   */
  async verifyDeliveryCode(orderId, deliveryCode, location = null) {
    try {
      const payload = {
        order_id: orderId,
        delivery_code: deliveryCode,
        timestamp: new Date().toISOString()
      };

      // Add GPS verification if available
      if (location) {
        payload.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        };
      }

      const response = await api.post('/orders/verify-delivery/', payload);
      
      return {
        success: response.data.success,
        paymentReleased: response.data.payment_released,
        courierPayment: response.data.courier_payment,
        customerInfo: response.data.customer_info,
        ratingRequired: response.data.rating_required
      };
    } catch (error) {
      console.error('Error verifying delivery code:', error);
      throw error;
    }
  }

  /**
   * Upload photo proof before pickup
   */
  async uploadPickupProof(orderId, photoUri) {
    try {
      const formData = new FormData();
      formData.append('order_id', orderId);
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: `pickup_${orderId}_${Date.now()}.jpg`
      });
      formData.append('proof_type', 'pickup');
      formData.append('timestamp', new Date().toISOString());

      const response = await api.post('/orders/upload-proof/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading pickup proof:', error);
      throw error;
    }
  }

  /**
   * Upload photo proof after delivery
   */
  async uploadDeliveryProof(orderId, photoUri) {
    try {
      const formData = new FormData();
      formData.append('order_id', orderId);
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: `delivery_${orderId}_${Date.now()}.jpg`
      });
      formData.append('proof_type', 'delivery');
      formData.append('timestamp', new Date().toISOString());

      const response = await api.post('/orders/upload-proof/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading delivery proof:', error);
      throw error;
    }
  }

  /**
   * Get current GPS location with high accuracy
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        error => {
          console.error('GPS error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Verify if current location is near target location
   */
  isLocationNearby(currentLocation, targetLocation, maxDistanceMeters = 100) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = currentLocation.latitude * Math.PI / 180;
    const φ2 = targetLocation.latitude * Math.PI / 180;
    const Δφ = (targetLocation.latitude - currentLocation.latitude) * Math.PI / 180;
    const Δλ = (targetLocation.longitude - currentLocation.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= maxDistanceMeters;
  }

  /**
   * Check if passcode has expired
   */
  isPasscodeExpired(expiryTime) {
    const now = new Date();
    const expiry = new Date(expiryTime);
    return now > expiry;
  }

  /**
   * Request passcode resend via SMS
   */
  async resendPasscode(orderId, type = 'pickup') {
    try {
      const response = await api.post(`/orders/${orderId}/resend-passcode/`, {
        passcode_type: type
      });
      return response.data;
    } catch (error) {
      console.error('Error resending passcode:', error);
      throw error;
    }
  }

  /**
   * Report issue with passcode
   */
  async reportPasscodeIssue(orderId, issueType, description) {
    try {
      const response = await api.post('/orders/report-issue/', {
        order_id: orderId,
        issue_type: issueType,
        description: description,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Error reporting issue:', error);
      throw error;
    }
  }

  /**
   * Submit rating after successful verification
   */
  async submitRating(orderId, ratingType, rating, comment = '') {
    try {
      const response = await api.post('/orders/submit-rating/', {
        order_id: orderId,
        rating_type: ratingType, // 'pickup' or 'delivery'
        rating: rating,
        comment: comment,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }

  /**
   * Get order verification status
   */
  async getOrderVerificationStatus(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/verification-status/`);
      return {
        pickupVerified: response.data.pickup_verified,
        deliveryVerified: response.data.delivery_verified,
        pickupTime: response.data.pickup_time,
        deliveryTime: response.data.delivery_time,
        escrowStatus: response.data.escrow_status,
        payments: response.data.payments
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      throw error;
    }
  }

  /**
   * Store passcodes locally for offline access
   */
  async storePasscodesLocally(orderId, pickupCode, deliveryCode, expiresAt) {
    try {
      const passcodes = {
        orderId,
        pickupCode,
        deliveryCode,
        expiresAt,
        storedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(`order_passcodes_${orderId}`, JSON.stringify(passcodes));
      return true;
    } catch (error) {
      console.error('Error storing passcodes locally:', error);
      return false;
    }
  }

  /**
   * Retrieve passcodes from local storage
   */
  async getLocalPasscodes(orderId) {
    try {
      const stored = await AsyncStorage.getItem(`order_passcodes_${orderId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error retrieving local passcodes:', error);
      return null;
    }
  }

  /**
   * Clear expired passcodes from local storage
   */
  async clearExpiredPasscodes() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const passcodeKeys = keys.filter(key => key.startsWith('order_passcodes_'));
      
      for (const key of passcodeKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const passcodes = JSON.parse(stored);
          if (this.isPasscodeExpired(passcodes.expiresAt)) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired passcodes:', error);
    }
  }

  /**
   * Contact support for order issues
   */
  async contactSupport(orderId, issueDescription) {
    try {
      const response = await api.post('/support/contact/', {
        order_id: orderId,
        issue_type: 'passcode_verification',
        description: issueDescription,
        priority: 'high',
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Error contacting support:', error);
      throw error;
    }
  }
}

export default new OrderVerificationService();