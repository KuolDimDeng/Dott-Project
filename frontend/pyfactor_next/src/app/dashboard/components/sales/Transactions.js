'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import { useNotification } from '@/context/NotificationContext';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  EyeIcon,
  PrinterIcon,
  CalendarIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import StandardSpinner from '@/components/ui/StandardSpinner';

export default function Transactions() {
  const { session } = useSessionContext();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  
  // State
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        date_filter: dateFilter,
        status: statusFilter
      });

      const response = await fetch(`/api/pos/transactions?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      console.log('[Transactions] Full API Response:', data); // Debug full response
      console.log('[Transactions] First transaction:', data.results?.[0]); // Debug first item
      console.log('[Transactions] Currency fields:', {
        currency_code: data.results?.[0]?.currency_code,
        currency_symbol: data.results?.[0]?.currency_symbol
      }); // Debug currency specifically
      setTransactions(data.results || []);
      setPagination(prev => ({
        ...prev,
        total: data.count || 0,
        totalPages: Math.ceil((data.count || 0) / prev.limit)
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      notifyError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, dateFilter, statusFilter, notifyError]);

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // View transaction details
  const viewTransaction = async (transaction) => {
    try {
      // First try to use the transaction data we already have
      // If it has items, use it directly
      if (transaction.items && transaction.items.length > 0) {
        setSelectedTransaction(transaction);
        setShowReceiptModal(true);
        return;
      }

      // Otherwise fetch full details
      const response = await fetch(`/api/pos/transactions/${transaction.id}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If we can't fetch details, use what we have
        console.warn('Could not fetch transaction details, using summary data');
        setSelectedTransaction({
          ...transaction,
          items: [], // Empty items array as fallback
          subtotal: transaction.total_amount || 0,
          tax: 0,
          discount: 0
        });
        setShowReceiptModal(true);
        return;
      }

      const data = await response.json();
      setSelectedTransaction(data);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      // Use what we have as fallback
      setSelectedTransaction({
        ...transaction,
        items: [], // Empty items array as fallback
        subtotal: transaction.total_amount || 0,
        tax: 0,
        discount: 0
      });
      setShowReceiptModal(true);
      notifyInfo('Showing transaction summary');
    }
  };

  // Print receipt
  const printReceipt = (transaction) => {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    
    // Get currency info for proper spacing
    const currencySymbol = transaction.currency_symbol || '$';
    const formatSymbol = currencySymbol.length > 1 ? `${currencySymbol} ` : currencySymbol;
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.transaction_id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 20px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .transaction-info {
            margin: 15px 0;
          }
          .items-table {
            width: 100%;
            margin: 20px 0;
          }
          .items-table th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 5px 0;
          }
          .items-table td {
            padding: 5px 0;
          }
          .totals {
            margin-top: 20px;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${session?.businessName || 'Your Business'}</div>
          <div>SALES RECEIPT</div>
        </div>
        
        <div class="transaction-info">
          <div><strong>Transaction ID:</strong> ${transaction.transaction_id}</div>
          <div><strong>Date:</strong> ${format(new Date(transaction.created_at), 'PPP p')}</div>
          <div><strong>Customer:</strong> ${transaction.customer_name || 'Walk-in Customer'}</div>
          <div><strong>Payment Method:</strong> ${transaction.payment_method}</div>
          <div><strong>Status:</strong> ${transaction.status}</div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${transaction.items?.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${formatSymbol}${(Number(item.unit_price) || 0).toFixed(2)}</td>
                <td style="text-align: right;">${formatSymbol}${((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatSymbol}${(Number(transaction.subtotal) || 0).toFixed(2)}</span>
          </div>
          ${(Number(transaction.discount) || 0) > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatSymbol}${(Number(transaction.discount) || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          ${(Number(transaction.tax) || 0) > 0 ? `
            <div class="total-row">
              <span>Tax:</span>
              <span>${formatSymbol}${(Number(transaction.tax) || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row" style="font-weight: bold; font-size: 14px; margin-top: 10px;">
            <span>TOTAL:</span>
            <span>${formatSymbol}${(Number(transaction.total_amount) || 0).toFixed(2)}</span>
          </div>
          ${transaction.amount_paid ? `
            <div class="total-row">
              <span>Paid:</span>
              <span>${formatSymbol}${(Number(transaction.amount_paid) || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          ${transaction.change_given ? `
            <div class="total-row">
              <span>Change:</span>
              <span>${formatSymbol}${(Number(transaction.change_given) || 0).toFixed(2)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${new Date().toLocaleString()}</p>
          <p style="margin-top: 10px; font-size: 8px;">
            This is a computer-generated receipt.<br>
            No signature required.
          </p>
        </div>
      </body>
      </html>
    `;
    
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    
    // Trigger print dialog
    setTimeout(() => {
      receiptWindow.print();
    }, 500);
    
    notifyInfo('Receipt sent to printer');
  };

  // Format currency - use transaction's currency or fallback to USD
  const formatCurrency = (amount, currencyCode = 'USD', currencySymbol = '$') => {
    // For SSP and other non-standard currencies, use custom formatting
    if (currencyCode === 'SSP' || !['USD', 'EUR', 'GBP', 'JPY'].includes(currencyCode)) {
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0);
      // Add space between symbol and value
      return `${currencySymbol} ${formattedAmount}`;
    }
    
    // For standard currencies, use Intl
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      }).format(amount || 0);
    } catch (e) {
      // Fallback for unsupported currencies
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0);
      return `${currencySymbol} ${formattedAmount}`;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: BanknotesIcon }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Transactions</h1>
        <p className="text-gray-600 mt-1">View and manage all completed POS transactions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchTransactions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <StandardSpinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Transactions will appear here once sales are completed through POS.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
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
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.transaction_id || `TXN-${transaction.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.items_count || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(
                        transaction.total_amount, 
                        transaction.currency_code || 'USD', 
                        transaction.currency_symbol || '$'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.payment_method || 'Cash'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status || 'completed')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => printReceipt(transaction)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Print Receipt"
                        >
                          <PrinterIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Transaction Details</h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-medium">{selectedTransaction.transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium">
                      {format(new Date(selectedTransaction.created_at), 'PPP p')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">
                      {selectedTransaction.customer_name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">{selectedTransaction.payment_method}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-medium mb-2">Items</h3>
                  {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2">Item</th>
                          <th className="text-center py-2">Qty</th>
                          <th className="text-right py-2">Price</th>
                          <th className="text-right py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransaction.items.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{item.product_name}</td>
                            <td className="text-center py-2">{item.quantity}</td>
                            <td className="text-right py-2">{formatCurrency(item.unit_price)}</td>
                            <td className="text-right py-2">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 italic py-4">
                      Item details not available
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span className="text-red-600">
                        -{formatCurrency(selectedTransaction.discount)}
                      </span>
                    </div>
                  )}
                  {selectedTransaction.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedTransaction.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(selectedTransaction.total_amount)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => printReceipt(selectedTransaction)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <PrinterIcon className="w-5 h-5 mr-2" />
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}