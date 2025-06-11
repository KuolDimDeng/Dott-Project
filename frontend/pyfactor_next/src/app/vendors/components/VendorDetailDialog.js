'use client';

import React from 'react';

const VendorDetailDialog = ({ vendor, onClose, onEdit }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return 'Not provided';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (!vendor) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Vendor Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vendor Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vendor.vendor_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vendor Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vendor.vendor_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatPhone(vendor.phone)}</dd>
                </div>
              </dl>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Street Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vendor.street}</dd>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">City</dt>
                    <dd className="mt-1 text-sm text-gray-900">{vendor.city}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">State</dt>
                    <dd className="mt-1 text-sm text-gray-900">{vendor.state}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Postcode</dt>
                    <dd className="mt-1 text-sm text-gray-900">{vendor.postcode}</dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* Purchase Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Purchases</dt>
                    <dd className="mt-1 text-sm text-gray-900">0</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Outstanding Balance</dt>
                    <dd className="mt-1 text-sm text-gray-900">$0.00</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Timestamps */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vendor.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vendor.updated_at)}</dd>
                </div>
              </dl>
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
            Edit Vendor
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorDetailDialog;