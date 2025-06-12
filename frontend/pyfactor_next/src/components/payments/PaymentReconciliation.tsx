'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, DollarSign, FileText, Download, RefreshCw } from 'lucide-react';

interface ReconciliationItem {
  id: string;
  date: string;
  bankStatementAmount: number;
  systemRecordAmount: number;
  difference: number;
  status: 'matched' | 'discrepancy' | 'unmatched';
  transactionCount: number;
  notes?: string;
  resolvedBy?: string;
  resolvedDate?: string;
}

interface DiscrepancyDetail {
  transactionId: string;
  type: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  reason?: string;
}

const PaymentReconciliation: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [selectedDiscrepancies, setSelectedDiscrepancies] = useState<DiscrepancyDetail[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);

  useEffect(() => {
    fetchReconciliationData();
  }, [selectedPeriod]);

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockData: ReconciliationItem[] = [
        {
          id: '1',
          date: '2024-01-22',
          bankStatementAmount: 25000,
          systemRecordAmount: 25000,
          difference: 0,
          status: 'matched',
          transactionCount: 45,
          notes: 'All transactions reconciled successfully'
        },
        {
          id: '2',
          date: '2024-01-21',
          bankStatementAmount: 32500,
          systemRecordAmount: 32450,
          difference: 50,
          status: 'discrepancy',
          transactionCount: 58,
          notes: 'Minor discrepancy in processing fees'
        },
        {
          id: '3',
          date: '2024-01-20',
          bankStatementAmount: 28000,
          systemRecordAmount: 28000,
          difference: 0,
          status: 'matched',
          transactionCount: 52,
          resolvedBy: 'Finance Team',
          resolvedDate: '2024-01-21'
        },
        {
          id: '4',
          date: '2024-01-19',
          bankStatementAmount: 41200,
          systemRecordAmount: 39800,
          difference: 1400,
          status: 'unmatched',
          transactionCount: 71,
          notes: 'Missing transactions need investigation'
        },
        {
          id: '5',
          date: '2024-01-18',
          bankStatementAmount: 35600,
          systemRecordAmount: 35600,
          difference: 0,
          status: 'matched',
          transactionCount: 63
        }
      ];
      
      setReconciliationItems(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch reconciliation data');
      console.error('Error fetching reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setIsReconciling(true);
    // Simulating reconciliation process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsReconciling(false);
    fetchReconciliationData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'discrepancy':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unmatched':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      matched: 'bg-green-100 text-green-800',
      discrepancy: 'bg-yellow-100 text-yellow-800',
      unmatched: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  const showDiscrepancyDetails = (item: ReconciliationItem) => {
    // Mock discrepancy details
    const mockDiscrepancies: DiscrepancyDetail[] = [
      {
        transactionId: 'TRX-001',
        type: 'Processing Fee',
        expectedAmount: 25,
        actualAmount: 30,
        difference: 5,
        reason: 'Rate change not updated'
      },
      {
        transactionId: 'TRX-002',
        type: 'Refund',
        expectedAmount: 100,
        actualAmount: 0,
        difference: 100,
        reason: 'Refund not processed'
      }
    ];
    
    setSelectedDiscrepancies(mockDiscrepancies);
    setShowDiscrepancyModal(true);
  };

  const calculateTotals = () => {
    const totals = reconciliationItems.reduce((acc, item) => {
      acc.bankTotal += item.bankStatementAmount;
      acc.systemTotal += item.systemRecordAmount;
      acc.differenceTotal += Math.abs(item.difference);
      acc.transactionTotal += item.transactionCount;
      return acc;
    }, { bankTotal: 0, systemTotal: 0, differenceTotal: 0, transactionTotal: 0 });
    
    return totals;
  };

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

  const totals = calculateTotals();
  const matchRate = (reconciliationItems.filter(item => item.status === 'matched').length / reconciliationItems.length * 100).toFixed(1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Reconciliation</h1>
        <p className="text-gray-600">Match bank statements with system records</p>
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
              <p className="text-sm text-gray-600">Match Rate</p>
              <p className="text-2xl font-bold text-gray-900">{matchRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Discrepancy</p>
              <p className="text-2xl font-bold text-gray-900">${totals.differenceTotal.toFixed(2)}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{totals.transactionTotal}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">${totals.systemTotal.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={runReconciliation}
            disabled={isReconciling}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isReconciling ? 'animate-spin' : ''}`} />
            {isReconciling ? 'Reconciling...' : 'Run Reconciliation'}
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Statement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
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
              {reconciliationItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${item.bankStatementAmount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${item.systemRecordAmount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${item.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(item.difference).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.transactionCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(item.status)}
                      <span className="ml-2">{getStatusBadge(item.status)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {item.status !== 'matched' && (
                      <button
                        onClick={() => showDiscrepancyDetails(item)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View Details
                      </button>
                    )}
                    {item.status === 'unmatched' && (
                      <button className="text-green-600 hover:text-green-900">
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discrepancy Modal */}
      {showDiscrepancyModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Discrepancy Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Transaction ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Expected
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actual
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Difference
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedDiscrepancies.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm">{item.transactionId}</td>
                      <td className="px-4 py-2 text-sm">{item.type}</td>
                      <td className="px-4 py-2 text-sm">${item.expectedAmount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">${item.actualAmount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-red-600">
                        ${item.difference.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDiscrepancyModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
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

export default PaymentReconciliation;