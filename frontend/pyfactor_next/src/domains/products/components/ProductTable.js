'use client';

import React, { useMemo } from 'react';
import { Typography, Button } from '@/shared/components/ui';
import { StandardSpinner } from '@/components/ui/StandardSpinner';

/**
 * ProductTable - Table display component
 * Handles product listing with sorting and actions
 */
const ProductTable = ({ 
  products = [], 
  loading = false, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  // Memoize processed products to avoid re-calculations
  const processedProducts = useMemo(() => {
    return products.map(product => ({
      ...product,
      displayPrice: parseFloat(product.price || 0).toFixed(2),
      displayStock: parseInt(product.stock_quantity || 0),
      statusColor: product.is_active ? 'text-green-600' : 'text-red-600',
      statusText: product.is_active ? 'Active' : 'Inactive'
    }));
  }, [products]);

  if (loading) {
    return <StandardSpinner />;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m7 4l-3 3-3-3" />
          </svg>
        </div>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          No products found
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Create your first product to get started
        </Typography>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <Typography variant="body1" className="font-medium text-gray-900">
                      {product.name}
                    </Typography>
                    {product.description && (
                      <Typography variant="body2" color="textSecondary" className="truncate max-w-xs">
                        {product.description}
                      </Typography>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" color="textSecondary">
                    {product.sku || '-'}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" className="font-medium">
                    ${product.displayPrice}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" className={product.displayStock <= (product.min_stock_level || 0) ? 'text-red-600' : ''}>
                    {product.displayStock}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.statusText}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => onView?.(product)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => onEdit?.(product)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => onDelete?.(product.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
