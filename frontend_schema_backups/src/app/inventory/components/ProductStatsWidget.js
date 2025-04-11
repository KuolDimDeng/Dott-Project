import React from 'react';

/**
 * Product statistics widget component
 * Displays key metrics about the inventory
 */
const ProductStatsWidget = ({ stats, loading }) => {
  if (loading) {
    return null; // Return nothing while loading to avoid showing spinners
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4">
          <p className="text-gray-500">
            No statistics available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white rounded-lg shadow h-full">
          <div className="p-4">
            <div className="flex items-center mb-2">
              {/* Inventory Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-main mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600 text-sm font-medium">
                Total Products
              </span>
            </div>
            <h2 className="text-2xl font-bold">
              {stats.total_products}
            </h2>
            <div className="border-t border-gray-200 my-2"></div>
            <p className="text-xs text-gray-500">
              Total items in inventory
            </p>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-lg shadow h-full">
          <div className="p-4">
            <div className="flex items-center mb-2">
              {/* Warning Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${stats.low_stock_count > 0 ? 'text-red-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className={`text-sm font-medium ${stats.low_stock_count > 0 ? 'text-red-500' : 'text-gray-600'}`}>
                Low Stock Items
              </span>
            </div>
            <h2 className={`text-2xl font-bold ${stats.low_stock_count > 0 ? 'text-red-500' : ''}`}>
              {stats.low_stock_count}
            </h2>
            <div className="border-t border-gray-200 my-2"></div>
            <p className="text-xs text-gray-500">
              Items below reorder level
            </p>
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="bg-white rounded-lg shadow h-full">
          <div className="p-4">
            <div className="flex items-center mb-2">
              {/* Money Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600 text-sm font-medium">
                Total Value
              </span>
            </div>
            <h2 className="text-2xl font-bold">
              ${parseFloat(stats.total_value).toFixed(2)}
            </h2>
            <div className="border-t border-gray-200 my-2"></div>
            <p className="text-xs text-gray-500">
              Total inventory value
            </p>
          </div>
        </div>

        {/* Average Price */}
        <div className="bg-white rounded-lg shadow h-full">
          <div className="p-4">
            <div className="flex items-center mb-2">
              {/* Trending Up Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600 text-sm font-medium">
                Average Price
              </span>
            </div>
            <h2 className="text-2xl font-bold">
              ${parseFloat(stats.avg_price).toFixed(2)}
            </h2>
            <div className="border-t border-gray-200 my-2"></div>
            <p className="text-xs text-gray-500">
              Average product price
            </p>
          </div>
        </div>
      </div>

      {/* Newest Product */}
      {stats.newest_product && (
        <div className="bg-white rounded-lg shadow mt-4">
          <div className="p-4">
            <div className="flex items-center mb-2">
              {/* New Release Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <h3 className="text-base font-medium">
                Newest Product
              </h3>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                New
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-sm font-medium">{stats.newest_product.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">SKU</p>
                <p className="text-sm font-medium">{stats.newest_product.product_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-sm font-medium">${parseFloat(stats.newest_product.price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stock</p>
                <p className="text-sm font-medium">{stats.newest_product.stock_quantity}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductStatsWidget;