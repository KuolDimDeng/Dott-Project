'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { ScaleIcon } from '@heroicons/react/24/outline';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';

const PaymentReconciliation = () => {
  const [tenantId, setTenantId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [stats, setStats] = useState({
    matchRate: 0,
    totalDiscrepancy: 0,
    totalTransactions: 0
  });
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const fetchReconciliationData = useCallback(async () => {
    logger.debug('[PaymentReconciliation] Fetching reconciliation data for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint
      const mockData = [
        {
          id: 1,
          date: '2025-01-05',
          bankStatement: { reference: 'TXN001', amount: 2500 },
          systemRecord: { reference: 'INV-001', amount: 2500 },
          status: 'matched',
          difference: 0
        },
        {
          id: 2,
          date: '2025-01-04',
          bankStatement: { reference: 'TXN002', amount: 1500 },
          systemRecord: { reference: 'INV-002', amount: 1450 },
          status: 'discrepancy',
          difference: 50
        },
        {
          id: 3,
          date: '2025-01-03',
          bankStatement: { reference: 'TXN003', amount: 3000 },
          systemRecord: null,
          status: 'unmatched_bank',
          difference: 3000
        },
        {
          id: 4,
          date: '2025-01-02',
          bankStatement: null,
          systemRecord: { reference: 'INV-003', amount: 2000 },
          status: 'unmatched_system',
          difference: 2000
        }
      ];

      setDiscrepancies(mockData.filter(d => d.status !== 'matched'));
      
      const totalTxn = mockData.length;
      const matched = mockData.filter(d => d.status === 'matched').length;
      const totalDisc = mockData
        .filter(d => d.status !== 'matched')
        .reduce((sum, d) => sum + Math.abs(d.difference), 0);

      setStats({
        matchRate: Math.round((matched / totalTxn) * 100),
        totalDiscrepancy: totalDisc,
        totalTransactions: totalTxn
      });

      logger.info('[PaymentReconciliation] Data loaded successfully');
    } catch (err) {
      logger.error('[PaymentReconciliation] Error fetching data:', err);
      setError(err.message | 'Failed to load reconciliation data');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchReconciliationData();
  }, [fetchReconciliationData]);

  const runReconciliation = async () => {
    logger.debug('[PaymentReconciliation] Running reconciliation process');
    setIsReconciling(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchReconciliationData();
      logger.info('[PaymentReconciliation] Reconciliation completed');
    } catch (err) {
      logger.error('[PaymentReconciliation] Reconciliation failed:', err);
      setError('Failed to run reconciliation');
    } finally {
      setIsReconciling(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      matched: 'bg-green-100 text-green-800',
      discrepancy: 'bg-yellow-100 text-yellow-800',
      unmatched_bank: 'bg-red-100 text-red-800',
      unmatched_system: 'bg-orange-100 text-orange-800'
    };
    
    const labels = {
      matched: 'Matched',
      discrepancy: 'Discrepancy',
      unmatched_bank: 'Bank Only',
      unmatched_system: 'System Only'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] | 'bg-gray-100 text-gray-800'}`}>
        {labels[status] | status}
      </span>
    );
  };

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Error loading reconciliation data</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <ScaleIcon className="h-6 w-6 text-blue-600 mr-2" />
            Payment Reconciliation
          </h1>
          <p className="text-gray-600 text-sm">Match payment records between your system and bank statements to ensure accuracy and identify discrepancies.</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={runReconciliation}
            disabled={isReconciling}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isReconciling ? (
              <>
                <ButtonSpinner />
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Run Reconciliation
              </>
            )}
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Match Rate</p>
          <p className="text-2xl font-bold text-green-600">{stats.matchRate}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Discrepancy</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDiscrepancy)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Discrepancies & Unmatched Transactions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    System Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    System Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {discrepancies.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.bankStatement?.reference | '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.bankStatement ? formatCurrency(item.bankStatement.amount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.systemRecord?.reference | '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.systemRecord ? formatCurrency(item.systemRecord.amount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(Math.abs(item.difference))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">Investigate</button>
                      <button className="text-green-600 hover:text-green-900">Resolve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: PaymentReconciliation
      </div>
    </div>
  );
};

export default PaymentReconciliation;
