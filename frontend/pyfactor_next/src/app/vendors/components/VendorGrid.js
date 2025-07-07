'use client';

import React from 'react';

const VendorGrid = ({
  vendors,
  selectedVendors,
  onSelectVendor,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
  displayMode
}) => {
  const formatPhone = (phone) => {
    if (!phone) return 'No phone';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className={`relative bg-white border rounded-lg hover:shadow-lg transition-shadow cursor-pointer ${
              selectedVendors.includes(vendor.id) ? 'ring-2 ring-blue-500' : 'border-gray-200'
            }`}
            onClick={() => onView(vendor)}
          >
            {/* Selection checkbox */}
            <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedVendors.includes(vendor.id)}
                onChange={(e) => onSelectVendor(vendor.id, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="p-4">
              {/* Vendor Number */}
              <div className="text-xs text-gray-500 mb-1">{vendor.vendor_number}</div>

              {/* Vendor Name and Status */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 pr-2">{vendor.vendor_name}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  vendor.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vendor.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{formatPhone(vendor.phone)}</span>
                </div>
              </div>

              {/* Address */}
              {displayMode !== 'compact' && (
                <div className="border-t pt-3 space-y-1 text-sm text-gray-500">
                  <p>{vendor.street}</p>
                  <p>{vendor.city}, {vendor.state} {vendor.postcode}</p>
                </div>
              )}

              {/* Additional Details */}
              {displayMode === 'detailed' && (
                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  <p>Added {new Date(vendor.created_at).toLocaleDateString()}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(vendor);
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
                    onToggleStatus(vendor);
                  }}
                  className={`p-2 ${vendor.is_active !== false ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'} rounded-md transition-colors`}
                  title={vendor.is_active !== false ? "Deactivate" : "Activate"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {vendor.is_active !== false ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(vendor.id);
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

export default VendorGrid;