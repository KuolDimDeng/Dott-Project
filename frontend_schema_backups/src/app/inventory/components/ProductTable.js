import React from 'react';

/**
 * ProductTable Component
 * Displays products in a tabular format with various display modes
 */
const ProductTable = ({
  products,
  loading,
  displayMode = 'standard',
  selectedItems = [],
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  // Calculate if all items are selected
  const allSelected = products.length > 0 && products.every(item => 
    selectedItems.includes(item.id));
  
  // Calculate if some items are selected
  const someSelected = products.length > 0 && products.some(item => 
    selectedItems.includes(item.id)) && !allSelected;
  
  // Handle selection of all items
  const handleSelectAll = () => {
    onSelectAll(!allSelected);
  };
  
  // Render loading skeletons
  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <tr key={`skeleton-${index}`} className="border-b border-gray-200">
        <td className="p-3">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
        </td>
        <td className="p-3"><div className="h-5 bg-gray-200 w-32 rounded animate-pulse"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-200 w-20 rounded animate-pulse"></div></td>
        {displayMode !== 'ultra' && <td className="p-3"><div className="h-5 bg-gray-200 w-40 rounded animate-pulse"></div></td>}
        <td className="p-3"><div className="h-5 bg-gray-200 w-16 rounded animate-pulse"></div></td>
        {displayMode === 'detailed' && <td className="p-3"><div className="h-5 bg-gray-200 w-16 rounded animate-pulse"></div></td>}
        <td className="p-3"><div className="h-5 bg-gray-200 w-20 rounded animate-pulse"></div></td>
        <td className="p-3">
          <div className="flex gap-2">
            <div className="w-7 h-7 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="w-7 h-7 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="w-7 h-7 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </td>
      </tr>
    ));
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="p-3">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-main border-gray-300 rounded focus:ring-primary-light focus:ring-offset-0"
                    checked={allSelected}
                    ref={checkbox => {
                      if (checkbox) {
                        // Set indeterminate state
                        checkbox.indeterminate = someSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    disabled={products.length === 0 || loading}
                  />
                </div>
              </th>
              <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU/Code</th>
              {displayMode !== 'ultra' && <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>}
              <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              {displayMode === 'detailed' && <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>}
              <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              renderSkeletons()
            ) : (
              products.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-main border-gray-300 rounded focus:ring-primary-light focus:ring-offset-0"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => onToggleSelect(item.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:underline"
                        onClick={() => onViewDetails(item.id)}
                      >
                        {item.name}
                      </span>
                      
                      {displayMode === 'detailed' && item.category_name && (
                        <span className="text-xs text-gray-500">
                          {item.category_name}
                        </span>
                      )}
                      
                      {!item.is_active && (
                        <span className="text-xs text-red-600">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-500">{item.product_code || 'N/A'}</td>
                  
                  {displayMode !== 'ultra' && (
                    <td className="p-3 text-sm text-gray-500">
                      {item.description ? 
                        (item.description.length > 50 ? 
                          `${item.description.substring(0, 50)}...` : 
                          item.description) : 
                        'No description'}
                    </td>
                  )}
                  
                  <td className="p-3 text-sm">
                    {(item.stock_quantity !== undefined && item.reorder_level !== undefined && 
                     item.stock_quantity < item.reorder_level) ? (
                      <div className="flex items-center">
                        <span className="text-red-600">{item.stock_quantity}</span>
                        <div className="ml-1 text-red-600 tooltip" title="Low stock">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-900">{item.stock_quantity || 0}</span>
                    )}
                  </td>
                  
                  {displayMode === 'detailed' && (
                    <td className="p-3 text-sm text-gray-900">{item.reorder_level || 0}</td>
                  )}
                  
                  <td className="p-3 text-sm text-gray-900">
                    ${typeof item.price === 'number'
                      ? item.price.toFixed(2)
                      : parseFloat(item.price || 0).toFixed(2)}
                  </td>
                  
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button 
                        className="text-gray-500 hover:text-primary-main p-1 rounded-full hover:bg-gray-100"
                        onClick={() => onViewDetails(item.id)}
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      <button 
                        className="text-gray-500 hover:text-primary-main p-1 rounded-full hover:bg-gray-100"
                        onClick={() => onEdit(item)}
                        title="Edit Product"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button 
                        className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-gray-100"
                        onClick={() => onDelete(item.id)}
                        title="Delete Product"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            
            {products.length === 0 && !loading && (
              <tr>
                <td 
                  colSpan={displayMode === 'detailed' ? 8 : (displayMode === 'ultra' ? 6 : 7)} 
                  className="p-6 text-center text-sm text-gray-500"
                >
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;