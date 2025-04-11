import React from 'react';
import Link from 'next/link';
import { 
  PencilIcon, TrashIcon, EyeIcon, 
  ExclamationTriangleIcon, TagIcon, 
  ShoppingBagIcon, ArchiveBoxIcon, FolderIcon
} from '@heroicons/react/24/outline';

/**
 * ProductGrid Component
 * Displays products in a grid format with cards
 */
const ProductGrid = ({
  products,
  loading,
  displayMode = 'standard',
  selectedItems = [],
  onToggleSelect,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  // Render loading skeletons
  const renderSkeletons = () => {
    return Array(8).fill(0).map((_, index) => (
      <div key={`skeleton-${index}`} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
        <div className="h-full flex flex-col bg-white rounded-lg shadow">
          <div className="relative">
            <div className="w-full h-[200px] bg-gray-200 animate-pulse"></div>
            <div className="absolute top-2.5 left-2.5">
              <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse"></div>
            </div>
          </div>
          <div className="flex-grow p-4">
            <div className="w-4/5 h-7 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="w-2/5 h-5 bg-gray-200 rounded animate-pulse mt-2"></div>
            <div className="w-3/5 h-5 bg-gray-200 rounded animate-pulse mt-2"></div>
          </div>
          <div className="flex justify-between px-4 pb-4">
            <div className="w-[60px] h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    ));
  };
  
  return (
    <div className="grid grid-cols-12 gap-4">
      {loading ? (
        renderSkeletons()
      ) : (
        products.map((item) => (
          <div key={item.id} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
            <div className="h-full flex flex-col bg-white rounded-lg shadow relative transition-all duration-200 hover:translate-y-[-4px] hover:shadow-lg">
              {/* Checkbox for selection */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  className="h-5 w-5 rounded bg-white/70 hover:bg-white/90 transition-colors duration-200 focus:ring-blue-500"
                />
              </div>
              
              {/* Product status indicators */}
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                {!item.is_active && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
                
                {item.stock_quantity !== undefined && 
                 item.reorder_level !== undefined && 
                 item.stock_quantity < item.reorder_level && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                    Low Stock
                  </span>
                )}
              </div>
              
              {/* Product Image */}
              <div 
                className="h-[200px] bg-gray-100 flex items-center justify-center cursor-pointer"
                onClick={() => onViewDetails(item.id)}
              >
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ArchiveBoxIcon className="w-16 h-16 text-gray-400 opacity-50 mx-auto" />
                    <span className="text-xs text-gray-500 block">
                      No image
                    </span>
                  </div>
                )}
              </div>
              
              {/* Product Details */}
              <div className="flex-grow p-4">
                <h2 
                  className="mb-2 font-medium text-base cursor-pointer hover:underline"
                  onClick={() => onViewDetails(item.id)}
                >
                  {item.name}
                </h2>
                
                <div className="flex items-center mb-2">
                  <span className="text-sm text-gray-600 flex items-center">
                    <TagIcon className="w-4 h-4 mr-1.5 opacity-70" />
                    ${typeof item.price === 'number'
                      ? item.price.toFixed(2)
                      : parseFloat(item.price || 0).toFixed(2)}
                  </span>
                </div>
                
                {displayMode !== 'ultra' && (
                  <div className="flex items-center mb-2">
                    <span className="text-sm text-gray-600 flex items-center">
                      <ShoppingBagIcon className="w-4 h-4 mr-1.5 opacity-70" />
                      Stock: {item.stock_quantity || 0}
                    </span>
                  </div>
                )}
                
                {displayMode === 'detailed' && (
                  <>
                    {item.category_name && (
                      <div className="flex items-center mb-2">
                        <span className="text-sm text-gray-600 flex items-center">
                          <FolderIcon className="w-4 h-4 mr-1.5 opacity-70" />
                          {item.category_name}
                        </span>
                      </div>
                    )}
                    
                    {item.product_code && (
                      <span className="text-xs text-gray-500 block">
                        SKU: {item.product_code}
                      </span>
                    )}
                  </>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex justify-end px-4 pb-4">
                <button 
                  className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                  title="View Details"
                  onClick={() => onViewDetails(item.id)}
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                
                <button 
                  className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Edit Product"
                  onClick={() => onEdit(item)}
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                
                <button 
                  className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Delete Product"
                  onClick={() => onDelete(item.id)}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      
      {products.length === 0 && !loading && (
        <div className="col-span-12">
          <div className="text-center p-8 bg-white rounded">
            <h3 className="text-lg font-medium text-gray-500">
              No products found
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Try changing your search or filters
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;