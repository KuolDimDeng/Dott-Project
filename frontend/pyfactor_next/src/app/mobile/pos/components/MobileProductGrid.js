'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

export default function MobileProductGrid({ products, onAddToCart, isLoading, currencySymbol }) {
  if (isLoading) {
    return (
      <div className="px-4 py-8">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
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
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all active:scale-95"
          >
            {/* Product Image or Icon */}
            <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg mb-2 flex items-center justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-3xl">📦</span>
              )}
            </div>

            {/* Product Info */}
            <div className="text-left">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                {product.name}
              </h3>
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-blue-600">
                  {currencySymbol}{(product.price || 0).toFixed(2)}
                </p>
                <div className="bg-blue-600 text-white rounded-full p-1">
                  <PlusIcon className="w-4 h-4" />
                </div>
              </div>
              {product.quantity_in_stock !== undefined && product.quantity_in_stock < 10 && (
                <p className="text-xs text-orange-600 mt-1">
                  Only {product.quantity_in_stock} left
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}