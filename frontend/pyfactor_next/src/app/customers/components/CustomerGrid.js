'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const CustomerGrid = ({ 
  customers, 
  selectedCustomers, 
  onSelectCustomer, 
  onEdit, 
  onDelete, 
  onView,
  displayMode 
}) => {
  const getCustomerName = (customer) => {
    if (customer.business_name) {
      return customer.business_name;
    }
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A';
  };

  const getCustomerType = (customer) => {
    return customer.business_name ? 'Business' : 'Individual';
  };

  const getCustomerInitials = (customer) => {
    const name = getCustomerName(customer);
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getInitialsColor = (customer) => {
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
      'bg-rose-500'
    ];
    
    // Use customer ID to consistently pick a color
    const hash = customer.id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
            selectedCustomers.includes(customer.id) ? 'ring-2 ring-blue-500' : 'border-gray-200'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={(e) => onSelectCustomer(customer.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <div className={`w-10 h-10 rounded-full ${getInitialsColor(customer)} text-white flex items-center justify-center font-medium mr-3`}>
                  {getCustomerInitials(customer)}
                </div>
                <div>
                  <button
                    onClick={() => onView(customer)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {customer.account_number}
                  </button>
                  <p className="text-xs text-gray-500">
                    {getCustomerType(customer)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getCustomerName(customer)}
                </p>
              </div>

              {(customer.email || customer.phone) && (
                <div className="space-y-1">
                  {customer.email && (
                    <p className="text-xs text-gray-600 truncate">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {customer.email}
                    </p>
                  )}
                  {customer.phone && (
                    <p className="text-xs text-gray-600">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {customer.phone}
                    </p>
                  )}
                </div>
              )}

              {customer.city && (
                <p className="text-xs text-gray-600">
                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {customer.city}
                  {customer.billing_state && `, ${customer.billing_state}`}
                  {displayMode === 'detailed' && customer.billing_country && `, ${customer.billing_country}`}
                </p>
              )}

              {displayMode !== 'compact' && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(customer.total_revenue || 0, customer.currency)}
                  </span>
                  {customer.invoice_count > 0 && (
                    <span className="text-xs text-gray-500">
                      {customer.invoice_count} invoice{customer.invoice_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {displayMode === 'detailed' && (
                <div className="text-xs text-gray-500 pt-1">
                  Created {formatDate(customer.created_at)}
                </div>
              )}

              {displayMode === 'detailed' && customer.notes && (
                <div className="text-xs text-gray-500 truncate pt-1" title={customer.notes}>
                  {customer.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onView(customer)}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  title="View details"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => onEdit(customer)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => onDelete(customer.id)}
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

export default CustomerGrid;