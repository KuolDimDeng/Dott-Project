/**
 * Dual QR System API Service
 * Handles both Payment (Blue) and Receive (Green) QR operations
 */
import api from './api';

class DualQRService {
  /**
   * Get both Payment and Receive QR codes
   */
  async getMyQRCodes() {
    try {
      const response = await api.get('/payments/dual-qr/universal/my-qrs/');
      return response.data;
    } catch (error) {
      console.error('Error getting QR codes:', error);
      throw error;
    }
  }

  /**
   * Activate merchant profile (for Receive QR)
   */
  async activateMerchantProfile(data = {}) {
    try {
      const response = await api.post('/payments/dual-qr/merchant/activate/', {
        merchant_type: data.merchant_type || 'personal',
        business_category: data.business_category,
      });
      return response.data;
    } catch (error) {
      console.error('Error activating merchant profile:', error);
      throw error;
    }
  }

  /**
   * Get Receive QR (Green)
   */
  async getReceiveQR() {
    try {
      const response = await api.get('/payments/dual-qr/merchant/receive-qr/');
      return response.data;
    } catch (error) {
      console.error('Error getting receive QR:', error);
      throw error;
    }
  }

  /**
   * Generate dynamic Receive QR with amount
   */
  async generateDynamicQR(amount, reference = null, expiresMinutes = 5) {
    try {
      const response = await api.post('/payments/dual-qr/merchant/dynamic-qr/', {
        amount: amount,
        reference: reference,
        expires_minutes: expiresMinutes,
      });
      return response.data;
    } catch (error) {
      console.error('Error generating dynamic QR:', error);
      throw error;
    }
  }

  /**
   * Universal QR scanner with safety checks
   */
  async universalScan(scanData) {
    try {
      const response = await api.post('/payments/dual-qr/scanner/scan/', {
        my_qr_type: scanData.my_qr_type,
        scanned_qr_data: scanData.scanned_qr_data,
        amount: scanData.amount,
        currency: scanData.currency || 'USD',
        description: scanData.description,
        device_info: {
          platform: Platform.OS,
          version: Platform.Version,
          model: DeviceInfo.getModel(),
        },
        location: scanData.location,
      });
      
      return response.data;
    } catch (error) {
      // Handle safety errors specially
      if (error.response?.data?.error_type) {
        return {
          success: false,
          ...error.response.data,
        };
      }
      
      console.error('Error scanning QR:', error);
      throw error;
    }
  }

  /**
   * Get P2P transaction history
   */
  async getP2PHistory() {
    try {
      const response = await api.get('/payments/dual-qr/p2p/history/');
      return response.data;
    } catch (error) {
      console.error('Error getting P2P history:', error);
      throw error;
    }
  }

  /**
   * Get QR color rules and safety education
   */
  async getColorRules() {
    try {
      const response = await api.get('/payments/dual-qr/education/color-rules/');
      return response.data;
    } catch (error) {
      console.error('Error getting color rules:', error);
      throw error;
    }
  }

  /**
   * Update settlement configuration
   */
  async updateSettlement(config) {
    try {
      const response = await api.patch('/payments/dual-qr/merchant/settlement/', {
        settlement_method: config.method,
        bank_account_id: config.bankAccountId,
        mpesa_number: config.mpesaNumber,
        mtn_number: config.mtnNumber,
        minimum_settlement_amount: config.minimumAmount,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating settlement:', error);
      throw error;
    }
  }

  /**
   * Upgrade to premium merchant
   */
  async upgradeToPremium() {
    try {
      const response = await api.post('/payments/dual-qr/merchant/upgrade/');
      return response.data;
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      throw error;
    }
  }

  /**
   * Get merchant analytics
   */
  async getMerchantAnalytics() {
    try {
      const response = await api.get('/payments/dual-qr/merchant/analytics/');
      return response.data;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Process P2P payment
   */
  async sendP2PPayment(receiverQR, amount, description) {
    try {
      const response = await api.post('/payments/dual-qr/p2p/send/', {
        receiver_qr: receiverQR,
        amount: amount,
        description: description,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending P2P payment:', error);
      throw error;
    }
  }

  /**
   * Request payment (Yellow QR)
   */
  async createPaymentRequest(amount, description, expiresHours = 24) {
    try {
      const response = await api.post('/payments/dual-qr/request/create/', {
        amount: amount,
        description: description,
        expires_hours: expiresHours,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment request:', error);
      throw error;
    }
  }

  /**
   * Create bill split (Purple QR)
   */
  async createBillSplit(totalAmount, numberOfPeople, description) {
    try {
      const response = await api.post('/payments/dual-qr/split/create/', {
        total_amount: totalAmount,
        number_of_people: numberOfPeople,
        description: description,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating bill split:', error);
      throw error;
    }
  }

  /**
   * Validate QR before scanning (offline check)
   */
  validateQRCombination(myQRType, theirQRType) {
    // Both Payment (Blue)
    if (myQRType.includes('PAY') && theirQRType.includes('PAY')) {
      return {
        valid: false,
        error: 'BOTH_PAYING',
        message: 'Both showing Payment QR! One must show Receive QR.',
      };
    }
    
    // Both Receive (Green)
    if (myQRType.includes('RECEIVE') && theirQRType.includes('RECEIVE')) {
      return {
        valid: false,
        error: 'BOTH_RECEIVING',
        message: 'Both showing Receive QR! One must show Payment QR.',
      };
    }
    
    return { valid: true };
  }

  /**
   * Get QR type from color
   */
  getQRTypeFromColor(color) {
    const colorMap = {
      '#2563eb': 'payment',
      '#10b981': 'receive',
      '#eab308': 'request',
      '#9333ea': 'split',
      '#ef4444': 'refund',
    };
    
    return colorMap[color] || 'unknown';
  }

  /**
   * Get color from QR type
   */
  getColorFromQRType(type) {
    const typeMap = {
      'DOTT_PAY': '#2563eb',
      'DOTT_RECEIVE_STATIC': '#10b981',
      'DOTT_RECEIVE_DYNAMIC': '#10b981',
      'DOTT_REQUEST': '#eab308',
      'DOTT_SPLIT': '#9333ea',
      'DOTT_REFUND': '#ef4444',
    };
    
    return typeMap[type] || '#666666';
  }
}

export default new DualQRService();