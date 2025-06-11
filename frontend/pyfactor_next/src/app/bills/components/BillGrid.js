'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const BillGrid = ({ 
  bills, 
  selectedBills, 
  onSelectBill, 
  onEdit, 
  onDelete, 
  onView,
  onMarkAsPaid,
  displayMode 
}) => {
  const getStatusBadge = (bill) => {
    if (bill.is_paid) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
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
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Overdue
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Unpaid
      </span>
    );
  };

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="text-red-600">Overdue by {Math.abs(diffDays)} days</span>;
    } else if (diffDays === 0) {
      return <span className="text-orange-600">Due today</span>;
    } else if (diffDays <= 7) {
      return <span className="text-yellow-600">Due in {diffDays} days</span>;
    } else {
      return <span className="text-gray-600">Due in {diffDays} days</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {bills.map((bill) => (
        <div
          key={bill.id}
          className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
            selectedBills.includes(bill.id) ? 'ring-2 ring-blue-500' : 'border-gray-200'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedBills.includes(bill.id)}
                  onChange={(e) => onSelectBill(bill.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <div>
                  <button
                    onClick={() => onView(bill)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {bill.bill_number}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(bill.bill_date)}
                  </p>
                </div>
              </div>
              {getStatusBadge(bill)}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{bill.vendor_name || 'No vendor'}</p>
                {bill.vendor_number && (
                  <p className="text-xs text-gray-500">{bill.vendor_number}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(bill.totalAmount, bill.currency)}
                </span>
                {!bill.is_paid && (
                  <div className="text-xs">
                    {getDaysUntilDue(bill.due_date)}
                  </div>
                )}
              </div>

              {displayMode !== 'compact' && bill.poso_number && (
                <div className="text-sm text-gray-600">
                  PO/SO: {bill.poso_number}
                </div>
              )}

              {displayMode === 'detailed' && bill.notes && (
                <div className="text-xs text-gray-500 truncate" title={bill.notes}>
                  {bill.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="flex items-center gap-2">
                {!bill.is_paid && (
                  <button
                    onClick={() => onMarkAsPaid(bill.id)}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="Mark as paid"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onView(bill)}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  title="View details"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => onEdit(bill)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => onDelete(bill.id)}
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

export default BillGrid;