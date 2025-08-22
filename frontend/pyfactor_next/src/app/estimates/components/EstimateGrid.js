'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const EstimateGrid = ({ 
  estimates, 
  selectedEstimates, 
  onSelectEstimate, 
  onEdit, 
  onDelete, 
  onView,
  onConvert,
  onSend,
  displayMode 
}) => {
  const getStatusBadge = (estimate) => {
    const validUntil = new Date(estimate.valid_until);
    const today = new Date();
    const isExpired = validUntil < today;
    
    if (estimate.status === 'accepted') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Accepted
        </span>
      );
    }
    
    if (estimate.status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Rejected
        </span>
      );
    }
    
    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Expired
        </span>
      );
    }
    
    if (estimate.status === 'sent') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          Sent
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Draft
      </span>
    );
  };

  const getValidityStatus = (validUntil) => {
    const valid = new Date(validUntil);
    const today = new Date();
    const diffTime = valid - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="text-red-600">Expired {Math.abs(diffDays)} days ago</span>;
    } else if (diffDays === 0) {
      return <span className="text-orange-600">Expires today</span>;
    } else if (diffDays <= 7) {
      return <span className="text-yellow-600">Expires in {diffDays} days</span>;
    } else {
      return <span className="text-gray-600">Valid for {diffDays} days</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {estimates.map((estimate) => (
        <div
          key={estimate.id}
          className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
            selectedEstimates.includes(estimate.id) ? 'ring-2 ring-blue-500' : 'border-gray-200'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedEstimates.includes(estimate.id)}
                  onChange={(e) => onSelectEstimate(estimate.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <div>
                  <button
                    onClick={() => onView(estimate)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {estimate.estimate_num}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(estimate.created_at)}
                  </p>
                </div>
              </div>
              {getStatusBadge(estimate)}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">{estimate.title}</p>
                {displayMode === 'detailed' && estimate.summary && (
                  <p className="text-xs text-gray-500 truncate mt-1">{estimate.summary}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-900">{estimate.customer_name}</p>
                {estimate.company_name && (
                  <p className="text-xs text-gray-500">{estimate.company_name}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(estimate.totalAmount, typeof estimate.currency === 'object' ? estimate.currency.code : estimate.currency)}
                </span>
                {estimate.discount > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {estimate.discount}% off
                  </span>
                )}
              </div>

              <div className="text-xs">
                {getValidityStatus(estimate.valid_until)}
              </div>

              {displayMode !== 'compact' && estimate.customer_ref && (
                <div className="text-xs text-gray-600">
                  Ref: {estimate.customer_ref}
                </div>
              )}

              {displayMode === 'detailed' && estimate.items && estimate.items.length > 0 && (
                <div className="text-xs text-gray-500 pt-2 border-t">
                  {estimate.items.length} line item{estimate.items.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="flex items-center gap-2">
                {estimate.status === 'draft' && (
                  <button
                    onClick={() => onSend(estimate.id)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Send estimate"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                )}
                {estimate.status === 'sent' && (
                  <button
                    onClick={() => onConvert(estimate.id)}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="Convert to invoice"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onView(estimate)}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  title="View details"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => onEdit(estimate)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => onDelete(estimate.id)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EstimateGrid;