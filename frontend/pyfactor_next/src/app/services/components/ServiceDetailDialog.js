'use client';

import React from 'react';

const ServiceDetailDialog = ({ service, onClose, onEdit }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!service) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Service Details</h2>
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
                  <dt className="text-sm font-medium text-gray-500">Service Code</dt>
                  <dd className="mt-1 text-sm text-gray-900">{service.service_code}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{service.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Price</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatPrice(service.price)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sales Tax</dt>
                  <dd className="mt-1 text-sm text-gray-900">{service.salestax || 0}%</dd>
                </div>
                {service.description && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{service.description}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Service Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Service Options</h3>
              <div className="flex flex-wrap gap-2">
                {service.is_recurring && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    Recurring Service
                  </span>
                )}
                {service.is_for_sale && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Available for Sale
                  </span>
                )}
                {service.is_for_rent && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Available for Rent
                  </span>
                )}
              </div>
            </div>

            {/* Pricing Details */}
            {(service.charge_period || service.charge_amount > 0) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing Details</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Charge Period</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{service.charge_period || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Charge Amount</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatPrice(service.charge_amount || 0)}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Physical Dimensions */}
            {(service.height || service.width || service.weight) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Physical Dimensions</h3>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {service.height && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Height</dt>
                      <dd className="mt-1 text-sm text-gray-900">{service.height} {service.height_unit}</dd>
                    </div>
                  )}
                  {service.width && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Width</dt>
                      <dd className="mt-1 text-sm text-gray-900">{service.width} {service.width_unit}</dd>
                    </div>
                  )}
                  {service.weight && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Weight</dt>
                      <dd className="mt-1 text-sm text-gray-900">{service.weight} {service.weight_unit}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Duration */}
            {service.duration && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Duration</h3>
                <p className="text-sm text-gray-900">{service.duration}</p>
              </div>
            )}

            {/* Timestamps */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(service.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(service.updated_at)}</dd>
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
            Edit Service
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailDialog;