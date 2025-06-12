'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';

const RefundsManagement = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [refunds, setRefunds] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    pendingRefunds: 0,
    totalRefundAmount: 0,
    approvalRate: 0
  });

  const tenantId = getSecureTenantId();

  const statuses = ['all', 'pending', 'approved', 'processed', 'rejected'];

  // Fetch refunds
  const fetchRefunds = useCallback(async () => {
    logger.debug('[RefundsManagement] Fetching refunds for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint
      const mockData = [
        {
          id: 1,
          customer: 'ABC Corporation',
          invoiceNumber: 'INV-001',
          amount: 250,
          reason: 'Duplicate payment',
          requestDate: '2025-01-05',
          status: 'pending',
          paymentMethod: 'Credit Card',
          originalPaymentDate: '2025-01-01'
        },
        {
          id: 2,
          customer: 'XYZ Limited',
          invoiceNumber: 'INV-002',
          amount: 500,
          reason: 'Service not provided',
          requestDate: '2025-01-04',
          status: 'approved',
          approvedBy: 'John Doe',
          approvedDate: '2025-01-05',
          paymentMethod: 'Bank Transfer',
          originalPaymentDate: '2024-12-28'
        },
        {
          id: 3,
          customer: 'Tech Solutions Inc',
          invoiceNumber: 'INV-003',
          amount: 1000,
          reason: 'Order cancelled',
          requestDate: '2025-01-03',
          status: 'processed',
          processedDate: '2025-01-04',
          paymentMethod: 'PayPal',
          originalPaymentDate: '2024-12-25'
        },
        {
          id: 4,
          customer: 'Global Services LLC',
          invoiceNumber: 'INV-004',
          amount: 150,
          reason: 'Incorrect amount charged',
          requestDate: '2025-01-02',
          status: 'rejected',
          rejectedBy: 'Jane Smith',
          rejectedDate: '2025-01-03',
          rejectionReason: 'Outside refund policy timeframe',
          paymentMethod: 'Check',
          originalPaymentDate: '2024-11-15'
        }
      ];

      const filteredData = filter === 'all' 
        ? mockData 
        : mockData.filter(r => r.status === filter);

      setRefunds(filteredData);

      // Calculate stats
      const pending = mockData.filter(r => r.status === 'pending').length;
      const totalAmount = mockData
        .filter(r => r.status !== 'rejected')
        .reduce((sum, r) => sum + r.amount, 0);
      const approved = mockData.filter(r => r.status === 'approved' || r.status === 'processed').length;
      const total = mockData.length;

      setStats({
        pendingRefunds: pending,
        totalRefundAmount: totalAmount,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0
      });

      logger.info('[RefundsManagement] Data loaded successfully');
    } catch (err) {
      logger.error('[RefundsManagement] Error fetching data:', err);
      setError(err.message || 'Failed to load refunds');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, filter]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleApprove = async (refundId) => {
    logger.debug('[RefundsManagement] Approving refund:', refundId);
    setSuccessMessage('Refund approved successfully!');
    setTimeout(() => {
      setSuccessMessage('');
      fetchRefunds();
    }, 2000);
  };

  const handleReject = async (refundId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (reason) {
      logger.debug('[RefundsManagement] Rejecting refund:', refundId, reason);
      setSuccessMessage('Refund rejected successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        fetchRefunds();
      }, 2000);
    }
  };

  const viewDetails = (refund) => {
    setSelectedRefund(refund);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Error loading refunds</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Refunds Management</h1>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Pending Refunds</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingRefunds}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Refund Amount</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRefundAmount)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Approval Rate</p>
          <p className="text-2xl font-bold text-green-600">{stats.approvalRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === status
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Refunds Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
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
            {refunds.map((refund) => (
              <tr key={refund.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {refund.customer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {refund.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(refund.amount)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="max-w-xs truncate" title={refund.reason}>
                    {refund.reason}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(refund.requestDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(refund.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => viewDetails(refund)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View
                  </button>
                  {refund.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleApprove(refund.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleReject(refund.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Refund Details
              </h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer</p>
                  <p className="text-sm text-gray-900">{selectedRefund.customer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Invoice Number</p>
                  <p className="text-sm text-gray-900">{selectedRefund.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedRefund.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-sm">{getStatusBadge(selectedRefund.status)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Method</p>
                  <p className="text-sm text-gray-900">{selectedRefund.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Original Payment Date</p>
                  <p className="text-sm text-gray-900">{new Date(selectedRefund.originalPaymentDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Request Date</p>
                  <p className="text-sm text-gray-900">{new Date(selectedRefund.requestDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Reason</p>
                  <p className="text-sm text-gray-900">{selectedRefund.reason}</p>
                </div>
                {selectedRefund.status === 'approved' && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Approved By</p>
                      <p className="text-sm text-gray-900">{selectedRefund.approvedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Approved Date</p>
                      <p className="text-sm text-gray-900">{new Date(selectedRefund.approvedDate).toLocaleDateString()}</p>
                    </div>
                  </>
                )}
                {selectedRefund.status === 'rejected' && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Rejected By</p>
                      <p className="text-sm text-gray-900">{selectedRefund.rejectedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Rejection Reason</p>
                      <p className="text-sm text-gray-900">{selectedRefund.rejectionReason}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: RefundsManagement | Last Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default RefundsManagement;