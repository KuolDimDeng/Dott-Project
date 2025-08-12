import React, { useState, useEffect } from 'react';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';
import AuditTrail from '@/app/dashboard/components/AuditTrail';
import {
  CloseIcon,
  EditIcon,
  InventoryIcon2 as InventoryIcon,
  WarningIcon,
  StorageIcon,
  CategoryIcon,
  LocalShippingIcon,
  AttachMoneyIcon,
  StoreIcon,
  BarcodeIcon,
  CalendarTodayIcon,
  InfoOutlinedIcon
} from '@/app/components/icons';

/**
 * Enhanced ProductDetailDialog Component
 * Displays detailed information about a specific product with History tab
 */
const ProductDetailDialog = ({ open, onClose, productId, onEdit }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch product details when dialog opens
  useEffect(() => {
    if (open && productId) {
      fetchProductDetails();
    }
  }, [open, productId]);
  
  // Reset tab when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveTab('details');
    }
  }, [open]);
  
  // Fetch product details
  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This would normally fetch from the API using the product ID
      // For now, let's fetch all products and find the matching one
      const response = await unifiedInventoryService.getProducts();
      const products = response.data || [];
      
      // Find the product by ID
      const foundProduct = products.find(p => p.id === productId);
      
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      logger.error('Error fetching product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Format currency
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Handle edit button click
  const handleEdit = () => {
    onClose();
    onEdit(product);
  };

  // Tab icons
  const DetailsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const HistoryIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (!open) return null;
  
  return (
    <div className="absolute inset-0 z-50 overflow-y-auto" aria-labelledby="product-detail-dialog" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        {/* Dialog position */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Dialog panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Dialog header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <InventoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Product Details
                </h3>
              </div>
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              >
                <CloseIcon className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-8 -mb-px">
              <button
                onClick={() => setActiveTab('details')}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200
                  ${activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <span className="flex items-center space-x-2">
                  <DetailsIcon />
                  <span>Details</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200
                  ${activeTab === 'history'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <span className="flex items-center space-x-2">
                  <HistoryIcon />
                  <span>History</span>
                </span>
              </button>
            </div>
          </div>
          
          {/* Dialog content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="py-4 text-center">
                <p className="text-red-500 dark:text-red-400">{error}</p>
              </div>
            ) : product ? (
              <div>
                {activeTab === 'details' ? (
                  <>
                    {/* Product Header */}
                    <div className="flex flex-col md:flex-row mb-6">
                      {/* Product Image */}
                      <div className="w-full md:w-64 h-64 md:mr-6 mb-4 md:mb-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded overflow-hidden">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="max-h-full max-w-full object-contain" 
                          />
                        ) : (
                          <div className="text-center">
                            <InventoryIcon className="w-20 h-20 text-gray-400 dark:text-gray-500 opacity-50" />
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              No image
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Summary */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {product.name}
                          </h2>
                          
                          <div>
                            {!product.is_active && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 mr-2">
                                Inactive
                              </span>
                            )}
                            
                            {product.stock_quantity !== undefined && 
                             product.reorder_level !== undefined && 
                             product.stock_quantity < product.reorder_level && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                <WarningIcon className="w-3 h-3 mr-1" />
                                Low Stock
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {product.description || 'No description available.'}
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div className="flex items-center">
                            <BarcodeIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              SKU: <span className="font-medium">{product.product_code || 'N/A'}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <CategoryIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              Category: <span className="font-medium">{product.category_name || 'Uncategorized'}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <AttachMoneyIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              Price: <span className="font-medium">{formatCurrency(product.price)}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <InventoryIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              Stock: <span className="font-medium">{product.stock_quantity || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <hr className="my-6 border-gray-200 dark:border-gray-700" />
                    
                    {/* Detailed Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Inventory Information */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-full">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                          <StorageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                          Inventory Details
                        </h3>
                        
                        <div className="overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white w-2/5">
                                  Stock Quantity
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.stock_quantity !== undefined ? (
                                    <div className="flex items-center">
                                      {product.stock_quantity}
                                      {product.reorder_level !== undefined && 
                                       product.stock_quantity < product.reorder_level && (
                                        <div className="ml-2 relative group">
                                          <WarningIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                                          <span className="absolute left-0 -top-full transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            Below reorder level
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Reorder Level
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.reorder_level !== undefined ? product.reorder_level : 'N/A'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Location
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.location_name || 'Default Location'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Last Ordered
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.last_ordered_date ? 
                                    formatDate(product.last_ordered_date) : 'Never'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Dimensions
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.dimensions || 'N/A'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Weight
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.weight ? 
                                    `${product.weight} ${product.weight_unit || 'kg'}` : 'N/A'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* Pricing & Supplier Information */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-full">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                          <AttachMoneyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                          Pricing & Supplier
                        </h3>
                        
                        <div className="overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white w-2/5">
                                  Selling Price
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {formatCurrency(product.price)}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Cost Price
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {formatCurrency(product.cost_price)}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Profit Margin
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.price && product.cost_price ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      {(((product.price - product.cost_price) / product.price) * 100).toFixed(2)}%
                                    </span>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Tax Rate
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.tax_rate !== undefined ? 
                                    `${product.tax_rate}%` : 'N/A'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Supplier
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.supplier_name || 'No supplier assigned'}
                                </td>
                              </tr>
                              
                              <tr>
                                <th className="py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Barcode
                                </th>
                                <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {product.barcode || 'N/A'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    
                    {/* System Information */}
                    <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <InfoOutlinedIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                        System Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(product.created_at)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(product.updated_at)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Created By</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.created_by || 'System'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Product ID</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* History Tab */
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Product Change History
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        View all changes made to this product over time
                      </p>
                    </div>
                    <AuditTrail 
                      objectType="Product" 
                      objectId={product.id}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
          
          {/* Dialog footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button 
              onClick={onClose} 
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
            
            {product && activeTab === 'details' && (
              <button 
                onClick={handleEdit} 
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <EditIcon className="w-4 h-4 mr-2" />
                Edit Product
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailDialog;