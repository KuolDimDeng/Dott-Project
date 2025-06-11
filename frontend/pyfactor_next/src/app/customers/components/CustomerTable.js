'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const CustomerTable = ({ 
  customers, 
  selectedCustomers, 
  onSelectAll, 
  onSelectCustomer, 
  onEdit, 
  onDelete, 
  onView,
  sortConfig,
  onSort,
  displayMode 
}) => {
  const isAllSelected = customers.length > 0 && selectedCustomers.length === customers.length;
  const isIndeterminate = selectedCustomers.length > 0 && selectedCustomers.length < customers.length;

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

  const getCustomerName = (customer) => {
    if (customer.business_name) {
      return customer.business_name;
    }
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A';
  };

  const getCustomerType = (customer) => {
    return customer.business_name ? 'Business' : 'Individual';
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
              onClick={() => onSort('account_number')}
            >
              <div className="flex items-center gap-1">
                Account #
                {getSortIcon('account_number')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('customer_name')}
            >
              <div className="flex items-center gap-1">
                Name
                {getSortIcon('customer_name')}
              </div>
            </th>
            {displayMode !== 'compact' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
            )}
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('email')}
            >
              <div className="flex items-center gap-1">
                Email
                {getSortIcon('email')}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('city')}
            >
              <div className="flex items-center gap-1">
                Location
                {getSortIcon('city')}
              </div>
            </th>
            {displayMode !== 'compact' && (
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('total_revenue')}
              >
                <div className="flex items-center gap-1">
                  Revenue
                  {getSortIcon('total_revenue')}
                </div>
              </th>
            )}
            {displayMode === 'detailed' && (
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created
                  {getSortIcon('created_at')}
                </div>
              </th>
            )}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={(e) => onSelectCustomer(customer.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onView(customer)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {customer.account_number}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {getCustomerName(customer)}
                </div>
                {displayMode === 'detailed' && customer.website && (
                  <div className="text-xs text-gray-500">{customer.website}</div>
                )}
              </td>
              {displayMode !== 'compact' && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {getCustomerType(customer)}
                  </span>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{customer.email || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{customer.phone || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {customer.city || '-'}
                  {customer.billing_state && `, ${customer.billing_state}`}
                </div>
                {displayMode === 'detailed' && customer.billing_country && (
                  <div className="text-xs text-gray-500">{customer.billing_country}</div>
                )}
              </td>
              {displayMode !== 'compact' && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(customer.total_revenue || 0, customer.currency)}
                  </div>
                  {displayMode === 'detailed' && customer.invoice_count > 0 && (
                    <div className="text-xs text-gray-500">{customer.invoice_count} invoices</div>
                  )}
                </td>
              )}
              {displayMode === 'detailed' && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(customer.created_at)}</div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onView(customer)}
                    className="text-gray-600 hover:text-gray-900"
                    title="View details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit(customer)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(customer.id)}
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

export default CustomerTable;