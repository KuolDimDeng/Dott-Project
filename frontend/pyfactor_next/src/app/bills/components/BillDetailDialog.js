'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const BillDetailDialog = ({ bill, onClose, onEdit, onMarkAsPaid }) => {
  if (!bill) return null;

  const getStatusBadge = () => {
    if (bill.is_paid) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Paid
        </span>
      );
    }
    
    const dueDate = new Date(bill.due_date);
    const today = new Date();
    const isOverdue = dueDate < today;
    
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Overdue
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Unpaid
      </span>
    );
  };

  const getDaysUntilDue = () => {
    const due = new Date(bill.due_date);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (bill.is_paid) {
      return null;
    }
    
    if (diffDays < 0) {
      return (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            This bill is overdue by {Math.abs(diffDays)} days
          </p>
        </div>
      );
    } else if (diffDays === 0) {
      return (
        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800">
            This bill is due today
          </p>
        </div>
      );
    } else if (diffDays <= 7) {
      return (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            This bill is due in {diffDays} days
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Bill Details</h2>
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
                <h3 className="text-2xl font-bold text-gray-900">{bill.bill_number}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Created on {formatDate(bill.created_at)}
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge()}
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(bill.totalAmount, bill.currency)}
                </p>
              </div>
            </div>

            {getDaysUntilDue()}

            {/* Vendor Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Vendor Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Vendor Name</p>
                  <p className="text-sm font-medium text-gray-900">{bill.vendor_name || 'N/A'}</p>
                </div>
                {bill.vendor_number && (
                  <div>
                    <p className="text-sm text-gray-500">Vendor Number</p>
                    <p className="text-sm font-medium text-gray-900">{bill.vendor_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bill Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Bill Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bill Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(bill.bill_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(bill.due_date)}</p>
                </div>
                {bill.poso_number && (
                  <div>
                    <p className="text-sm text-gray-500">PO/SO Number</p>
                    <p className="text-sm font-medium text-gray-900">{bill.poso_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="text-sm font-medium text-gray-900">{bill.currency}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {bill.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{bill.notes}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Activity</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">{formatDate(bill.created_at, true)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-gray-900">{formatDate(bill.updated_at, true)}</span>
                </div>
                {bill.is_paid && bill.paid_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Paid On</span>
                    <span className="text-gray-900">{formatDate(bill.paid_at, true)}</span>
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
            {!bill.is_paid && (
              <button
                onClick={onMarkAsPaid}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Mark as Paid
              </button>
            )}
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDetailDialog;