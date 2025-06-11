'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const EstimateTable = ({ 
  estimates, 
  selectedEstimates, 
  onSelectAll, 
  onSelectEstimate, 
  onEdit, 
  onDelete, 
  onView,
  onConvert,
  onSend,
  sortConfig,
  onSort,
  displayMode 
}) => {
  const isAllSelected = estimates.length > 0 && selectedEstimates.length === estimates.length;
  const isIndeterminate = selectedEstimates.length > 0 && selectedEstimates.length < estimates.length;

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.order === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getStatusBadge = (estimate) => {
    const validUntil = new Date(estimate.valid_until);
    const today = new Date();
    const isExpired = validUntil < today;
    
    if (estimate.status === 'accepted') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Accepted
        </span>
      );
    }
    
    if (estimate.status === 'rejected') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          Rejected
        </span>
      );
    }
    
    if (isExpired) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          Expired
        </span>
      );
    }
    
    if (estimate.status === 'sent') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          Sent
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
        Draft
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={el => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('estimate_num')}
            >
              <div className="flex items-center gap-1">
                Estimate #
                {getSortIcon('estimate_num')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('customer_name')}
            >
              <div className="flex items-center gap-1">
                Customer
                {getSortIcon('customer_name')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('title')}
            >
              <div className="flex items-center gap-1">
                Title
                {getSortIcon('title')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('created_at')}
            >
              <div className="flex items-center gap-1">
                Date
                {getSortIcon('created_at')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('valid_until')}
            >
              <div className="flex items-center gap-1">
                Valid Until
                {getSortIcon('valid_until')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('totalAmount')}
            >
              <div className="flex items-center gap-1">
                Amount
                {getSortIcon('totalAmount')}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {displayMode !== 'compact' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
            )}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {estimates.map((estimate) => (
            <tr key={estimate.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedEstimates.includes(estimate.id)}
                  onChange={(e) => onSelectEstimate(estimate.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onView(estimate)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {estimate.estimate_num}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{estimate.customer_name || 'N/A'}</div>
                {displayMode === 'detailed' && estimate.company_name && (
                  <div className="text-xs text-gray-500">{estimate.company_name}</div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">{estimate.title}</div>
                {displayMode === 'detailed' && estimate.summary && (
                  <div className="text-xs text-gray-500 max-w-xs truncate">{estimate.summary}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatDate(estimate.created_at)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatDate(estimate.valid_until)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(estimate.totalAmount, estimate.currency)}
                </div>
                {estimate.discount > 0 && (
                  <div className="text-xs text-gray-500">({estimate.discount}% discount)</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(estimate)}
              </td>
              {displayMode !== 'compact' && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{estimate.customer_ref || '-'}</div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  {estimate.status === 'draft' && (
                    <button
                      onClick={() => onSend(estimate.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Send estimate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  )}
                  {estimate.status === 'sent' && (
                    <button
                      onClick={() => onConvert(estimate.id)}
                      className="text-green-600 hover:text-green-900"
                      title="Convert to invoice"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onView(estimate)}
                    className="text-gray-600 hover:text-gray-900"
                    title="View details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit(estimate)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(estimate.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EstimateTable;