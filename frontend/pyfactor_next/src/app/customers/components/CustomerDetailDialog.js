'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';

const CustomerDetailDialog = ({ customer, onClose, onEdit }) => {
  if (!customer) return null;

  const getCustomerName = () => {
    if (customer.business_name) {
      return customer.business_name;
    }
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A';
  };

  const getCustomerType = () => {
    return customer.business_name ? 'Business' : 'Individual';
  };

  const getCustomerInitials = () => {
    const name = getCustomerName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getInitialsColor = () => {
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
    
    const hash = customer.id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-full ${getInitialsColor()} text-white flex items-center justify-center font-medium mr-4`}>
                {getCustomerInitials()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{getCustomerName()}</h2>
                <p className="text-sm text-gray-500">{customer.account_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="mt-1 text-sm text-gray-900">{getCustomerType()}</p>
                </div>
                {customer.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="mt-1 text-sm text-gray-900">{customer.phone}</p>
                  </div>
                )}
                {customer.website && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Website</p>
                    <a 
                      href={customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-blue-600 hover:underline"
                    >
                      {customer.website}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Currency</p>
                  <p className="mt-1 text-sm text-gray-900">{customer.currency || 'USD'}</p>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            {(customer.street || customer.city || customer.billing_state || customer.postcode || customer.billing_country) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900">
                    {customer.street && <span className="block">{customer.street}</span>}
                    {(customer.city || customer.billing_state || customer.postcode) && (
                      <span className="block">
                        {customer.city}
                        {customer.billing_state && `, ${customer.billing_state}`}
                        {customer.postcode && ` ${customer.postcode}`}
                      </span>
                    )}
                    {customer.billing_country && <span className="block">{customer.billing_country}</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Shipping Information */}
            {(customer.ship_to_name || customer.shipping_phone || customer.shipping_state || customer.shipping_country || customer.delivery_instructions) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {customer.ship_to_name && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ship To</p>
                      <p className="text-sm text-gray-900">{customer.ship_to_name}</p>
                    </div>
                  )}
                  {customer.shipping_phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Shipping Phone</p>
                      <p className="text-sm text-gray-900">{customer.shipping_phone}</p>
                    </div>
                  )}
                  {(customer.shipping_state || customer.shipping_country) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Shipping Location</p>
                      <p className="text-sm text-gray-900">
                        {customer.shipping_state}
                        {customer.shipping_country && `, ${customer.shipping_country}`}
                      </p>
                    </div>
                  )}
                  {customer.delivery_instructions && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Delivery Instructions</p>
                      <p className="text-sm text-gray-900">{customer.delivery_instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600">Total Revenue</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-900">
                    {formatCurrency(customer.total_revenue || 0, customer.currency)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-600">Total Invoices</p>
                  <p className="mt-1 text-2xl font-semibold text-green-900">
                    {customer.invoice_count || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {customer.notes && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            )}

            {/* System Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-500">Created</p>
                  <p className="mt-1 text-gray-900">{formatDate(customer.created_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">Last Updated</p>
                  <p className="mt-1 text-gray-900">{formatDate(customer.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Edit Customer
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailDialog;