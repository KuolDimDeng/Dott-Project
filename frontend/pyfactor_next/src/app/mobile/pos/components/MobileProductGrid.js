'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

export default function MobileProductGrid({ products, onAddToCart, isLoading, currencySymbol }) {
  if (isLoading) {
    return (
      <div className="px-3 py-3">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-2 animate-pulse">
              <div className="h-16 w-full bg-gray-200 rounded-md mb-1.5"></div>
              <div className="h-3 bg-gray-200 rounded mb-0.5"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No products found</h3>
        <p className="text-sm text-gray-600">Add products in your dashboard to start selling</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <div className="grid grid-cols-3 gap-2">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all active:scale-95"
          >
            {/* Product Image or Icon - Smaller */}
            <div className="h-16 w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-md mb-1.5 flex items-center justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <span className="text-xl">📦</span>
              )}
            </div>

            {/* Product Info - Compact */}
            <div className="text-left">
              <h3 className="text-xs font-medium text-gray-900 line-clamp-1 mb-0.5">
                {product.name}
              </h3>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-blue-600">
                  {currencySymbol || '$'}{(product.price || 0).toFixed(2)}
                </p>
                <div className="bg-blue-600 text-white rounded-full p-0.5">
                  <PlusIcon className="w-3 h-3" />
                </div>
              </div>
              {product.quantity_in_stock !== undefined && product.quantity_in_stock < 10 && (
                <p className="text-[10px] text-orange-600 mt-0.5">
                  {product.quantity_in_stock} left
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}