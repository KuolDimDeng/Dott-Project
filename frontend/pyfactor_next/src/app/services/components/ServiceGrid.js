'use client';

import React from 'react';

const ServiceGrid = ({
  services,
  selectedServices,
  onSelectService,
  onEdit,
  onDelete,
  onView,
  displayMode
}) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price || 0);
  };

  const getServiceTypeLabels = (service) => {
    const labels = [];
    if (service.is_recurring) labels.push('Recurring');
    if (service.is_for_sale) labels.push('For Sale');
    if (service.is_for_rent) labels.push('For Rent');
    return labels;
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className={`relative bg-white border rounded-lg hover:shadow-lg transition-shadow cursor-pointer ${
              selectedServices.includes(service.id) ? 'ring-2 ring-blue-500' : 'border-gray-200'
            }`}
            onClick={() => onView(service)}
          >
            {/* Selection checkbox */}
            <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedServices.includes(service.id)}
                onChange={(e) => onSelectService(service.id, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="p-4">
              {/* Service Code */}
              <div className="text-xs text-gray-500 mb-1">{service.service_code}</div>

              {/* Service Name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-8">{service.name}</h3>

              {/* Price */}
              <div className="text-2xl font-bold text-blue-600 mb-3">
                {formatPrice(service.price)}
              </div>

              {/* Service Types */}
              <div className="flex flex-wrap gap-1 mb-3">
                {getServiceTypeLabels(service).map((label, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      label === 'Recurring' ? 'bg-purple-100 text-purple-800' :
                      label === 'For Sale' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Description */}
              {displayMode !== 'compact' && service.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {service.description}
                </p>
              )}

              {/* Additional Details */}
              {displayMode === 'detailed' && (
                <div className="space-y-1 text-sm text-gray-500 mb-3">
                  {service.duration && (
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{service.duration}</span>
                    </div>
                  )}
                  {service.salestax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span className="font-medium">{service.salestax}%</span>
                    </div>
                  )}
                  {service.charge_period && service.charge_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Charge:</span>
                      <span className="font-medium">
                        {formatPrice(service.charge_amount)}/{service.charge_period}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(service);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(service.id);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceGrid;