'use client';

import { useState, useEffect, useCallback } from 'react';
import { bankAccountsApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';

/**
 * Custom hook to manage connected bank accounts
 * Provides access to bank accounts across all Banking menu pages
 */
export const useBankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
    logger.info('🎯 [useBankAccounts] === FETCHING BANK ACCOUNTS ===');
    setLoading(true);
    setError(null);

    try {
      const response = await bankAccountsApi.list();
      logger.debug('🎯 [useBankAccounts] API response:', response);
      
      // Transform and enrich account data
      const transformedAccounts = (response.data || []).map(account => ({
        id: account.id,
        bankName: account.bank_name || 'Unknown Bank',
        accountNumber: account.account_number,
        accountType: account.account_type || 'checking',
        routingNumber: account.routing_number,
        balance: account.balance || 0,
        currency: account.currency || 'USD',
        status: account.is_active ? 'connected' : 'disconnected',
        provider: account.integration_type || account.provider || 'plaid',
        lastSync: account.last_sync || account.updated_at,
        isActive: account.is_active || false,
        isPrimary: account.is_primary || false,
        // Display helpers
        displayName: `${account.bank_name} (...${account.account_number?.slice(-4) || '****'})`,
        maskedAccountNumber: `****${account.account_number?.slice(-4) || '****'}`,
        // Metadata
        createdAt: account.created_at,
        updatedAt: account.updated_at,
        metadata: account.metadata || {}
      }));

      // Sort accounts: active first, then by bank name
      const sortedAccounts = transformedAccounts.sort((a, b) => {
        if (a.isActive !== b.isActive) {
          return b.isActive - a.isActive; // Active accounts first
        }
        return a.bankName.localeCompare(b.bankName);
      });

      setAccounts(sortedAccounts);
      logger.info('🎯 [useBankAccounts] Accounts loaded successfully:', sortedAccounts.length);
    } catch (err) {
      logger.error('🎯 [useBankAccounts] Error fetching accounts:', err);
      setError(err.message || 'Failed to load bank accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Helper functions
  const getActiveAccounts = useCallback(() => {
    return accounts.filter(account => account.status === 'connected' && account.isActive);
  }, [accounts]);

  const getPrimaryAccount = useCallback(() => {
    return accounts.find(account => account.isPrimary && account.isActive) || getActiveAccounts()[0] || null;
  }, [accounts, getActiveAccounts]);

  const getAccountById = useCallback((id) => {
    return accounts.find(account => account.id === id);
  }, [accounts]);

  const getAccountsByProvider = useCallback((provider) => {
    return accounts.filter(account => account.provider === provider);
  }, [accounts]);

  const hasConnectedAccounts = accounts.length > 0 && accounts.some(acc => acc.status === 'connected');

  const totalBalance = accounts
    .filter(acc => acc.status === 'connected' && acc.balance)
    .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

  // Account management functions
  const refreshAccounts = useCallback(() => {
    logger.debug('🎯 [useBankAccounts] Refreshing accounts');
    return fetchAccounts();
  }, [fetchAccounts]);

  const disconnectAccount = useCallback(async (accountId) => {
    logger.info('🎯 [useBankAccounts] === DISCONNECTING ACCOUNT ===');
    logger.debug('🎯 [useBankAccounts] Account ID:', accountId);
    
    try {
      await bankAccountsApi.delete(accountId);
      logger.info('🎯 [useBankAccounts] Account disconnected successfully');
      await refreshAccounts(); // Refresh the list
      return { success: true };
    } catch (err) {
      logger.error('🎯 [useBankAccounts] Error disconnecting account:', err);
      return { success: false, error: err.message };
    }
  }, [refreshAccounts]);

  const syncAccount = useCallback(async (accountId) => {
    logger.info('🎯 [useBankAccounts] === SYNCING ACCOUNT ===');
    logger.debug('🎯 [useBankAccounts] Account ID:', accountId);
    
    try {
      // Call sync endpoint if available
      const response = await fetch(`/api/banking/sync-account/${accountId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sync request failed');
      }

      const result = await response.json();
      logger.info('🎯 [useBankAccounts] Account synced successfully');
      await refreshAccounts(); // Refresh to get updated data
      return { success: true, data: result };
    } catch (err) {
      logger.error('🎯 [useBankAccounts] Error syncing account:', err);
      return { success: false, error: err.message };
    }
  }, [refreshAccounts]);

  return {
    // Data
    accounts,
    loading,
    error,
    
    // Computed values
    hasConnectedAccounts,
    totalBalance,
    activeAccountsCount: getActiveAccounts().length,
    
    // Helper functions
    getActiveAccounts,
    getPrimaryAccount,
    getAccountById,
    getAccountsByProvider,
    
    // Actions
    refreshAccounts,
    disconnectAccount,
    syncAccount,
    
    // Utils
    formatAccountDisplay: (account) => account?.displayName || 'Unknown Account',
    formatBalance: (amount, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount || 0);
    }
  };
};