'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BulkImportModal from './BulkImportModal';
import AdvancedSearch from './AdvancedSearch';
import {
  SearchIcon,
  AddIcon,
  InventoryIcon2 as InventoryIcon,
  FilterListIcon,
  LocalOfferIcon,
  CheckIcon,
  QrCodeIcon
} from '@/app/components/icons';

/**
 * Product Catalog Page
 * Allows merchants to browse global StoreItems and quickly add them to inventory
 */
export default function ProductCatalogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [addingProducts, setAddingProducts] = useState(new Set());
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  // Fetch products from StoreItems
  const fetchProducts = async (reset = false) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: reset ? 1 : page,
        search: searchTerm,
        category: selectedCategory,
        limit: 20
      });

      const response = await fetch(`/api/inventory/store-items?${params}`);
      const data = await response.json();

      if (reset) {
        setProducts(data.results || []);
        setPage(1);
      } else {
        setProducts(prev => [...prev, ...(data.results || [])]);
      }

      setHasMore(data.has_next || false);
      setTotalProducts(data.count || 0);

      // Extract unique categories and brands from products
      const uniqueCategories = [...new Set(data.results?.map(p => p.category).filter(Boolean))];
      const uniqueBrands = [...new Set(data.results?.map(p => p.brand).filter(Boolean))];

      if (uniqueCategories.length > 0 && categories.length === 0) {
        setCategories(uniqueCategories);
      }
      if (uniqueBrands.length > 0 && brands.length === 0) {
        setBrands(uniqueBrands);
      }
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(true);
  }, [searchTerm, selectedCategory]);

  // Quick add product to inventory
  const handleQuickAdd = async (product) => {
    // Set loading state for this product
    setAddingProducts(prev => new Set(prev).add(product.id));

    try {
      // Navigate to inventory page with product data
      router.push(`/inventory?action=create&prefill=${encodeURIComponent(JSON.stringify({
        barcode: product.barcode,
        name: product.name,
        description: product.description || '',
        category: product.category || ''
      }))}`);
    } catch (error) {
      console.error('Error adding product:', error);
      setAddingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  // Load more products
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    fetchProducts();
  };

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  // Select all visible products
  const selectAll = () => {
    const allIds = new Set(products.map(p => p.id));
    setSelectedProducts(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedProducts(new Set());
    setSelectionMode(false);
  };

  // Handle bulk import
  const handleBulkImport = () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }
    setShowBulkImport(true);
  };

  // Handle advanced search
  const handleAdvancedSearch = (searchParams) => {
    // Reset and apply new search parameters
    setPage(1);
    setProducts([]);
    setSearchTerm(searchParams.query || '');
    setSelectedCategory(''); // Will handle multiple categories differently

    // Build new search params
    const params = new URLSearchParams();
    if (searchParams.query) params.append('search', searchParams.query);
    if (searchParams.barcode) params.append('barcode', searchParams.barcode);
    if (searchParams.brand) params.append('brand', searchParams.brand);
    if (searchParams.categories.length > 0) {
      params.append('categories', searchParams.categories.join(','));
    }
    if (searchParams.verifiedOnly) params.append('verified', 'true');
    if (searchParams.hasImages) params.append('has_images', 'true');
    if (searchParams.sortBy !== 'relevance') params.append('sort', searchParams.sortBy);

    // Fetch with new params
    fetchProducts(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <InventoryIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Product Catalog
              </h1>
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                Browse and add products from our global catalog
              </span>
            </div>
            <div className="flex gap-2">
              {selectionMode ? (
                <>
                  <span className="inline-flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedProducts.size} selected
                  </span>
                  <button
                    onClick={selectAll}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={selectedProducts.size === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import Selected ({selectedProducts.size})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Select Multiple
                  </button>
                  <button
                    onClick={() => router.push('/inventory')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <InventoryIcon className="h-4 w-4 mr-2" />
                    My Inventory
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <AdvancedSearch
          onSearch={handleAdvancedSearch}
          categories={categories}
          brands={brands}
          totalProducts={totalProducts}
        />
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-gray-500 dark:text-gray-400">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading catalog...
              </div>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <InventoryIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No products found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 overflow-hidden relative ${
                    selectedProducts.has(product.id)
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Product Image */}
                  {(product.thumbnail_url || product.image_url) && (
                    <div className="aspect-w-1 aspect-h-1 w-full bg-gray-200 dark:bg-gray-700">
                      <img
                        src={product.thumbnail_url || product.image_url}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="p-4">
                    {/* Product Info */}
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {product.name}
                    </h3>
                    {product.brand && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {product.brand}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {product.category || 'Uncategorized'}
                    </p>
                    {product.barcode && (
                      <p className="mt-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                        {product.barcode}
                      </p>
                    )}
                    {product.size && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Size: {product.size}
                      </p>
                    )}

                    {/* Region Badge */}
                    {product.region_code && product.region_code !== 'WORLD' && (
                      <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {product.region_code}
                      </span>
                    )}

                    {/* Quick Add Button */}
                    <button
                      onClick={() => handleQuickAdd(product)}
                      disabled={addingProducts.has(product.id)}
                      className="mt-3 w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingProducts.has(product.id) ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          <AddIcon className="h-3 w-3 mr-1" />
                          Add to Inventory
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    'Load More Products'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          open={showBulkImport}
          onClose={() => {
            setShowBulkImport(false);
            clearSelection();
          }}
          selectedProducts={products.filter(p => selectedProducts.has(p.id))}
        />
      )}
    </div>
  );
}