/**
 * Mobile Money Wallet Service
 * Handles MTN MoMo and M-Pesa wallet operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

const WALLET_CACHE_KEY = '@wallet_data';
const TRANSACTIONS_CACHE_KEY = '@wallet_transactions';
const SYNC_QUEUE_KEY = '@wallet_sync_queue';

class WalletService {
  constructor() {
    this.provider = 'MTN_MOMO'; // Default provider
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.processSyncQueue();
      }
    });
  }

  /**
   * Get wallet balance and details
   */
  async getWallet(walletType = 'personal', provider = 'MTN_MOMO') {
    try {
      const endpoint = walletType === 'business' 
        ? '/payments/wallet/business_wallet/'
        : '/payments/wallet/balance/';
      
      const response = await api.get(endpoint, {
        params: { provider }
      });

      if (response.data.success) {
        // Cache wallet data
        await AsyncStorage.setItem(
          WALLET_CACHE_KEY,
          JSON.stringify({
            ...response.data.data,
            provider,
            lastUpdated: new Date().toISOString()
          })
        );
        return response.data.data;
      }
      
      // If failed, try to return cached data
      return await this.getCachedWallet();
    } catch (error) {
      console.error('[Wallet] Error getting wallet:', error);
      // Return cached data if available
      return await this.getCachedWallet();
    }
  }

  /**
   * Get cached wallet data
   */
  async getCachedWallet() {
    try {
      const cached = await AsyncStorage.getItem(WALLET_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      return {
        balance: '0.00',
        available_balance: '0.00',
        pending_balance: '0.00',
        currency: 'USD',
        has_wallet: false,
        verified: false
      };
    } catch (error) {
      console.error('[Wallet] Error getting cached wallet:', error);
      return null;
    }
  }

  /**
   * Top up wallet using Stripe
   */
  async topUp(amount, provider = 'MTN_MOMO') {
    try {
      const response = await api.post('/payments/wallet/topup/', {
        amount,
        provider
      });

      if (response.data.success) {
        // Refresh wallet after top-up
        await this.getWallet(provider);
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Top-up failed');
    } catch (error) {
      console.error('[Wallet] Error topping up:', error);
      throw error;
    }
  }

  /**
   * Send money to another user
   */
  async sendMoney(recipientPhone, amount, description, provider = 'MTN_MOMO') {
    try {
      // Check network status
      const netInfo = await NetInfo.fetch();
      
      if (!netInfo.isConnected) {
        // Queue transaction for later
        await this.queueTransaction({
          type: 'send',
          recipientPhone,
          amount,
          description,
          provider,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          queued: true,
          message: 'Transaction queued. Will be sent when online.'
        };
      }

      const response = await api.post('/payments/wallet/send/', {
        recipient_phone: recipientPhone,
        amount,
        description,
        provider
      });

      if (response.data.success) {
        // Refresh wallet after sending
        await this.getWallet(provider);
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Send money failed');
    } catch (error) {
      console.error('[Wallet] Error sending money:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(provider = 'MTN_MOMO', limit = 20, offset = 0) {
    try {
      const response = await api.get('/payments/wallet/transactions/', {
        params: { provider, limit, offset }
      });

      if (response.data.success) {
        // Cache transactions
        const cacheKey = `${TRANSACTIONS_CACHE_KEY}_${provider}`;
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            transactions: response.data.data,
            lastUpdated: new Date().toISOString()
          })
        );
        return response.data.data;
      }
      
      return await this.getCachedTransactions(provider);
    } catch (error) {
      console.error('[Wallet] Error getting transactions:', error);
      return await this.getCachedTransactions(provider);
    }
  }

  /**
   * Get cached transactions
   */
  async getCachedTransactions(provider) {
    try {
      const cacheKey = `${TRANSACTIONS_CACHE_KEY}_${provider}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return data.transactions || [];
      }
      return [];
    } catch (error) {
      console.error('[Wallet] Error getting cached transactions:', error);
      return [];
    }
  }

  /**
   * Get money transfer requests
   */
  async getTransferRequests(type = 'received') {
    try {
      const response = await api.get('/payments/wallet/requests/', {
        params: { type }
      });

      if (response.data.success) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('[Wallet] Error getting requests:', error);
      return [];
    }
  }

  /**
   * Accept a money transfer request
   */
  async acceptRequest(requestId) {
    try {
      const response = await api.post('/payments/wallet/accept_request/', {
        request_id: requestId
      });

      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Failed to accept request');
    } catch (error) {
      console.error('[Wallet] Error accepting request:', error);
      throw error;
    }
  }

  /**
   * Reject a money transfer request
   */
  async rejectRequest(requestId, reason) {
    try {
      const response = await api.post('/payments/wallet/reject_request/', {
        request_id: requestId,
        reason
      });

      if (response.data.success) {
        return true;
      }
      
      throw new Error(response.data.error || 'Failed to reject request');
    } catch (error) {
      console.error('[Wallet] Error rejecting request:', error);
      throw error;
    }
  }

  /**
   * Get available mobile money providers
   */
  async getProviders() {
    try {
      const response = await api.get('/payments/wallet/providers/');

      if (response.data.success) {
        return response.data.data;
      }
      
      // Return default providers if API fails
      return [
        { name: 'MTN_MOMO', display_name: 'MTN Mobile Money', is_active: true },
        { name: 'MPESA', display_name: 'M-Pesa', is_active: true }
      ];
    } catch (error) {
      console.error('[Wallet] Error getting providers:', error);
      return [
        { name: 'MTN_MOMO', display_name: 'MTN Mobile Money', is_active: true },
        { name: 'MPESA', display_name: 'M-Pesa', is_active: true }
      ];
    }
  }

  /**
   * Queue transaction for offline sync
   */
  async queueTransaction(transaction) {
    try {
      const queue = await this.getSyncQueue();
      queue.push({
        ...transaction,
        id: Date.now().toString(),
        status: 'pending'
      });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[Wallet] Error queuing transaction:', error);
    }
  }

  /**
   * Get sync queue
   */
  async getSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('[Wallet] Error getting sync queue:', error);
      return [];
    }
  }

  /**
   * Process offline sync queue
   */
  async processSyncQueue() {
    try {
      const queue = await this.getSyncQueue();
      if (queue.length === 0) return;

      console.log('[Wallet] Processing sync queue:', queue.length, 'items');

      for (const transaction of queue) {
        if (transaction.status === 'pending') {
          try {
            if (transaction.type === 'send') {
              await this.sendMoney(
                transaction.recipientPhone,
                transaction.amount,
                transaction.description,
                transaction.provider
              );
              transaction.status = 'completed';
            }
          } catch (error) {
            console.error('[Wallet] Error processing queued transaction:', error);
            transaction.status = 'failed';
            transaction.error = error.message;
          }
        }
      }

      // Update queue
      const pendingTransactions = queue.filter(t => t.status === 'pending');
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(pendingTransactions));
    } catch (error) {
      console.error('[Wallet] Error processing sync queue:', error);
    }
  }

  /**
   * Format currency amount
   */
  formatAmount(amount, currency = 'USD') {
    const numAmount = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(numAmount);
  }

  /**
   * Validate phone number for mobile money
   */
  validatePhoneNumber(phone) {
    // Remove spaces and special characters
    const cleaned = phone.replace(/[^0-9+]/g, '');
    
    // Check if it's a valid mobile money number
    // Should start with country code or be at least 10 digits
    if (cleaned.length < 10) {
      return { valid: false, error: 'Phone number too short' };
    }
    
    if (cleaned.length > 15) {
      return { valid: false, error: 'Phone number too long' };
    }
    
    return { valid: true, formatted: cleaned };
  }

  /**
   * Clear all cached wallet data
   */
  async clearCache() {
    try {
      await AsyncStorage.multiRemove([
        WALLET_CACHE_KEY,
        `${TRANSACTIONS_CACHE_KEY}_MTN_MOMO`,
        `${TRANSACTIONS_CACHE_KEY}_MPESA`,
        SYNC_QUEUE_KEY
      ]);
    } catch (error) {
      console.error('[Wallet] Error clearing cache:', error);
    }
  }

  // Get wallet settings
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem('wallet_settings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error loading wallet settings:', error);
      return null;
    }
  }

  // Update wallet settings
  async updateSettings(settings) {
    try {
      await AsyncStorage.setItem('wallet_settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving wallet settings:', error);
      throw error;
    }
  }

  // Cancel a transfer request
  async cancelRequest(requestId) {
    try {
      const response = await api.delete(`/wallet/requests/${requestId}/`);
      return response.data;
    } catch (error) {
      console.error('Error canceling request:', error);
      throw error;
    }
  }

  // Initialize wallet (called on login)
  async initializeWallet() {
    try {
      // Check if wallet exists for default provider
      const wallet = await this.getWallet('MTN_MOMO');
      
      if (!wallet) {
        // Create wallet if it doesn't exist
        const response = await api.post('/wallet/create/', {
          provider: 'MTN_MOMO'
        });
        
        // Cache the new wallet
        await this.cacheWallet(response.data, 'MTN_MOMO');
      }
      
      // Load settings
      const settings = await this.getSettings();
      if (!settings) {
        // Set default settings
        await this.updateSettings({
          defaultProvider: 'MTN_MOMO',
          autoAcceptRequests: false,
          notifyOnReceive: true,
          notifyOnSend: true,
          requirePinForSend: false,
          dailyLimit: '1000',
          monthlyLimit: '10000',
        });
      }
      
      // Process any queued transactions
      await this.processSyncQueue();
      
      return true;
    } catch (error) {
      console.error('Error initializing wallet:', error);
      throw error;
    }
  }

  /**
   * Transfer funds from wallet to bank account
   */
  async transferToBank(data) {
    try {
      const response = await api.post('/payments/wallet/transfer_to_bank/', data);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Transfer failed');
    } catch (error) {
      console.error('[Wallet] Error transferring to bank:', error);
      throw error;
    }
  }

  /**
   * Get user's bank accounts
   */
  async getUserBankAccounts() {
    try {
      const response = await api.get('/payments/wallet/user_bank_accounts/');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('[Wallet] Error getting bank accounts:', error);
      return [];
    }
  }
}

const walletService = new WalletService();

export const getWallet = (walletType, provider) => walletService.getWallet(walletType, provider);
export const getWalletTransactions = (provider, limit, offset) => walletService.getTransactions(provider, limit, offset);
export const sendMoney = (recipientPhone, amount, description, provider) => walletService.sendMoney(recipientPhone, amount, description, provider);
export const topUpWallet = (amount, provider) => walletService.topUpWallet(amount, provider);
export const getTransferRequests = (type) => walletService.getTransferRequests(type);
export const acceptTransferRequest = (requestId) => walletService.acceptTransferRequest(requestId);
export const rejectTransferRequest = (requestId, reason) => walletService.rejectTransferRequest(requestId, reason);
export const transferToBank = (data) => walletService.transferToBank(data);
export const getUserBankAccounts = () => walletService.getUserBankAccounts();
export const initializeWallet = (user) => walletService.initializeWallet(user);

export default walletService;
