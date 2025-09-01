import { Capacitor } from '@capacitor/core';

/**
 * Tap to Pay on iPhone Plugin
 * Handles contactless card payments using iPhone's NFC reader
 */
export class TapToPay {
  constructor() {
    this.isSupported = false;
    this.isInitialized = false;
    this.stripeTerminal = null;
  }

  /**
   * Check if device supports Tap to Pay
   */
  async checkSupport() {
    if (Capacitor.getPlatform() !== 'ios') {
      return { supported: false, reason: 'Not iOS device' };
    }

    try {
      // Check iOS version (needs 16.4+)
      const version = await this.getIOSVersion();
      if (version < 16.4) {
        return { supported: false, reason: 'iOS 16.4 or later required' };
      }

      // Check device model (iPhone XS or later)
      const model = await this.getDeviceModel();
      const supportedModels = ['iPhone11,', 'iPhone12,', 'iPhone13,', 'iPhone14,', 'iPhone15,'];
      const isModelSupported = supportedModels.some(m => model.startsWith(m));
      
      if (!isModelSupported) {
        return { supported: false, reason: 'iPhone XS or later required' };
      }

      return { supported: true };
    } catch (error) {
      console.error('Error checking Tap to Pay support:', error);
      return { supported: false, reason: 'Error checking support' };
    }
  }

  /**
   * Initialize Stripe Terminal for Tap to Pay
   */
  async initialize(stripeAccountId) {
    try {
      const support = await this.checkSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }

      // Call native iOS code to initialize Stripe Terminal
      const result = await Capacitor.Plugins.TapToPayPlugin.initialize({
        accountId: stripeAccountId
      });

      this.isInitialized = result.success;
      return result;
    } catch (error) {
      console.error('Failed to initialize Tap to Pay:', error);
      throw error;
    }
  }

  /**
   * Start accepting a payment
   */
  async acceptPayment(amount, currency = 'USD') {
    if (!this.isInitialized) {
      throw new Error('Tap to Pay not initialized');
    }

    try {
      // Show payment UI and wait for card tap
      const result = await Capacitor.Plugins.TapToPayPlugin.acceptPayment({
        amount: amount,
        currency: currency
      });

      return {
        success: result.success,
        paymentIntentId: result.paymentIntentId,
        chargeId: result.chargeId,
        last4: result.last4,
        brand: result.brand
      };
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  /**
   * Cancel current payment flow
   */
  async cancelPayment() {
    if (!this.isInitialized) {
      return;
    }

    try {
      await Capacitor.Plugins.TapToPayPlugin.cancelPayment();
    } catch (error) {
      console.error('Failed to cancel payment:', error);
    }
  }

  /**
   * Helper: Get iOS version
   */
  async getIOSVersion() {
    const info = await Capacitor.Plugins.Device.getInfo();
    return parseFloat(info.osVersion);
  }

  /**
   * Helper: Get device model
   */
  async getDeviceModel() {
    const info = await Capacitor.Plugins.Device.getInfo();
    return info.model;
  }
}

// Export singleton instance
export const tapToPay = new TapToPay();