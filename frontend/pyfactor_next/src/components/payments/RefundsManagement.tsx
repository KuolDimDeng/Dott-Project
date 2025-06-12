'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, AlertCircle, Clock, CheckCircle, XCircle, FileText, ArrowLeft } from 'lucide-react';

interface Refund {
  id: string;
  transactionId: string;
  customerName: string;
  originalAmount: number;
  refundAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestDate: string;
  processedDate?: string;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
}

const RefundsManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockData: Refund[] = [
        {
          id: '1',
          transactionId: 'TRX001',
          customerName: 'John Doe',
          originalAmount: 500,
          refundAmount: 500,
          reason: 'Product defect',
          status: 'pending',
          requestDate: '2024-01-20T10:00:00Z',
          requestedBy: 'Customer Service',
          notes: 'Customer reported manufacturing defect'
        },
        {
          id: '2',
          transactionId: 'TRX002',
          customerName: 'Jane Smith',
          originalAmount: 1200,
          refundAmount: 600,
          reason: 'Partial refund - service issue',
          status: 'approved',
          requestDate: '2024-01-19T14:30:00Z',
          requestedBy: 'Support Team',
          approvedBy: 'Manager',
          notes: 'Approved for 50% refund due to partial service delivery'
        },
        {
          id: '3',
          transactionId: 'TRX003',
          customerName: 'ABC Corp',
          originalAmount: 3000,
          refundAmount: 3000,
          reason: 'Duplicate charge',
          status: 'processed',
          requestDate: '2024-01-18T09:15:00Z',
          processedDate: '2024-01-19T11:00:00Z',
          requestedBy: 'Billing Dept',
          approvedBy: 'Finance Manager'
        },
        {
          id: '4',
          transactionId: 'TRX004',
          customerName: 'XYZ Ltd',
          originalAmount: 750,
          refundAmount: 750,
          reason: 'Cancelled subscription',
          status: 'rejected',
          requestDate: '2024-01-17T16:45:00Z',
          requestedBy: 'Customer',
          notes: 'Rejected - Outside refund policy window'
        }
      ];
      
      setRefunds(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch refunds');
      console.error('Error fetching refunds:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'processed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  const handleRefundAction = (refund: Refund, action: 'approve' | 'reject' | 'process') => {
    // In a real app, this would make an API call
    console.log(`${action} refund:`, refund.id);
    setSelectedRefund(null);
    // Refresh the list
    fetchRefunds();
  };

  const filteredRefunds = selectedStatus === 'all' 
    ? refunds 
    : refunds.filter(r => r.status === selectedStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Refunds Management</h1>
        <p className="text-gray-600">Process and track refund requests</p>
      </div>

      {/* Debug Info */}
      {user && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
          <p>Tenant ID: {user.tenantId}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Refunds</p>
              <p className="text-2xl font-bold text-gray-900">
                {refunds.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Refund Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                ${refunds
                  .filter(r => r.status !== 'rejected')
                  .reduce((sum, r) => sum + r.refundAmount, 0)
                  .toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Processed Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {refunds.filter(r => 
                  r.status === 'processed' && 
                  r.processedDate && 
                  new Date(r.processedDate).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approval Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {refunds.length > 0 
                  ? `${((refunds.filter(r => r.status === 'approved' || r.status === 'processed').length / refunds.length) * 100).toFixed(0)}%`
                  : '0%'}
              </p>
            </div>
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by status:</label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="processed">Processed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRefunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{refund.transactionId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{refund.customerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <ArrowLeft className="w-3 h-3 mr-1 text-gray-400" />
                        ${refund.refundAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Original: ${refund.originalAmount.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{refund.reason}</div>
                    {refund.notes && (
                      <div className="text-xs text-gray-500 mt-1">{refund.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(refund.status)}
                      <span className="ml-2">{getStatusBadge(refund.status)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(refund.requestDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(refund.requestDate).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {refund.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleRefundAction(refund, 'approve')}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRefundAction(refund, 'reject')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {refund.status === 'approved' && (
                      <button 
                        onClick={() => handleRefundAction(refund, 'process')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Process Refund
                      </button>
                    )}
                    {(refund.status === 'processed' || refund.status === 'rejected') && (
                      <button 
                        onClick={() => setSelectedRefund(refund)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Refund Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Transaction ID</p>
                <p className="text-sm font-medium">{selectedRefund.transactionId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="text-sm font-medium">{selectedRefund.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Refund Amount</p>
                <p className="text-sm font-medium">${selectedRefund.refundAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-sm font-medium">{getStatusBadge(selectedRefund.status)}</p>
              </div>
              {selectedRefund.approvedBy && (
                <div>
                  <p className="text-sm text-gray-500">Approved By</p>
                  <p className="text-sm font-medium">{selectedRefund.approvedBy}</p>
                </div>
              )}
              {selectedRefund.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm">{selectedRefund.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={() => setSelectedRefund(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsManagement;