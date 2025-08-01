'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const EstimateDetailDialog = ({ estimate, onClose, onEdit, onConvert, onSend }) => {
  if (!estimate) return null;

  const getStatusBadge = () => {
    const validUntil = new Date(estimate.valid_until);
    const today = new Date();
    const isExpired = validUntil < today;
    
    if (estimate.status === 'accepted') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Accepted
        </span>
      );
    }
    
    if (estimate.status === 'rejected') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Rejected
        </span>
      );
    }
    
    if (isExpired) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Expired
        </span>
      );
    }
    
    if (estimate.status === 'sent') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          Sent
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Draft
      </span>
    );
  };

  const getValidityInfo = () => {
    const valid = new Date(estimate.valid_until);
    const today = new Date();
    const diffTime = valid - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            This estimate expired {Math.abs(diffDays)} days ago
          </p>
        </div>
      );
    } else if (diffDays === 0) {
      return (
        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800">
            This estimate expires today
          </p>
        </div>
      );
    } else if (diffDays <= 7) {
      return (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            This estimate expires in {diffDays} days
          </p>
        </div>
      );
    }
    return null;
  };

  const calculateSubtotal = () => {
    if (!estimate.items || estimate.items.length === 0) return 0;
    return estimate.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (estimate.discount / 100);
  };

  return (
    <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Estimate Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] p-6">
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{estimate.estimate_num}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Created on {formatDate(estimate.created_at)}
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge()}
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(estimate.totalAmount, estimate.currency)}
                </p>
              </div>
            </div>

            {getValidityInfo()}

            {/* Estimate Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Estimate Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="text-sm font-medium text-gray-900">{estimate.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valid Until</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(estimate.valid_until)}</p>
                </div>
                {estimate.customer_ref && (
                  <div>
                    <p className="text-sm text-gray-500">Customer Reference</p>
                    <p className="text-sm font-medium text-gray-900">{estimate.customer_ref}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="text-sm font-medium text-gray-900">{estimate.currency}</p>
                </div>
              </div>
              {estimate.summary && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Summary</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{estimate.summary}</p>
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer Name</p>
                  <p className="text-sm font-medium text-gray-900">{estimate.customer_name || 'N/A'}</p>
                </div>
                {estimate.company_name && (
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="text-sm font-medium text-gray-900">{estimate.company_name}</p>
                  </div>
                )}
                {estimate.customer_email && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{estimate.customer_email}</p>
                  </div>
                )}
                {estimate.customer_phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{estimate.customer_phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            {estimate.items && estimate.items.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Line Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {estimate.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{item.description}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(item.unit_price, estimate.currency)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(item.quantity * item.unit_price, estimate.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Subtotal
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(calculateSubtotal(), estimate.currency)}
                        </td>
                      </tr>
                      {estimate.discount > 0 && (
                        <tr>
                          <td colSpan="3" className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                            Discount ({estimate.discount}%)
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            -{formatCurrency(calculateDiscountAmount(), estimate.currency)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(estimate.totalAmount, estimate.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Notes */}
            {estimate.footer && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Terms & Conditions</h4>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{estimate.footer}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Activity</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">{formatDate(estimate.created_at, true)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-gray-900">{formatDate(estimate.updated_at, true)}</span>
                </div>
                {estimate.sent_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sent</span>
                    <span className="text-gray-900">{formatDate(estimate.sent_at, true)}</span>
                  </div>
                )}
                {estimate.accepted_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Accepted</span>
                    <span className="text-gray-900">{formatDate(estimate.accepted_at, true)}</span>
                  </div>
                )}
                {estimate.rejected_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rejected</span>
                    <span className="text-gray-900">{formatDate(estimate.rejected_at, true)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          <div className="flex gap-3">
            {estimate.status === 'draft' && (
              <button
                onClick={onSend}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Send Estimate
              </button>
            )}
            {estimate.status === 'sent' && (
              <button
                onClick={onConvert}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Convert to Invoice
              </button>
            )}
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit Estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateDetailDialog;