'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CameraIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

/**
 * Barcode Scanner Component with StoreItems Integration
 * Allows scanning or manual entry of barcodes to fetch product details
 * from the global StoreItems catalog
 */
const BarcodeScanner = ({ onProductFound, onClose, existingBarcode = '' }) => {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState(existingBarcode);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  // Load QR Scanner library dynamically
  useEffect(() => {
    if (scanning && typeof window !== 'undefined') {
      import('qr-scanner').then(module => {
        const QrScanner = module.default;
        if (videoRef.current) {
          const scanner = new QrScanner(
            videoRef.current,
            (result) => {
              handleBarcodeScan(result.data);
              scanner.stop();
              setScanning(false);
            },
            {
              returnDetailedScanResult: true,
              highlightScanRegion: true,
              highlightCodeOutline: true,
              preferredCamera: 'environment'
            }
          );
          scannerRef.current = scanner;
          scanner.start().catch(err => {
            console.error('Failed to start scanner:', err);
            toast.error('Camera not available. Please use manual entry.');
            setScanning(false);
          });
        }
      }).catch(err => {
        console.error('Failed to load scanner:', err);
        toast.error('Scanner not available');
        setScanning(false);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  // Lookup product by barcode in StoreItems
  const handleBarcodeScan = async (barcode) => {
    setManualCode(barcode);
    await lookupProduct(barcode);
  };

  const lookupProduct = async (barcode) => {
    if (!barcode) {
      toast.error('Please enter a barcode');
      return;
    }

    setLoading(true);
    try {
      // Call the StoreItems API to scan the barcode
      const response = await fetch(`/api/inventory/store-items/scan?barcode=${encodeURIComponent(barcode)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to lookup product');
      }

      const data = await response.json();

      if (data.found) {
        // Product found in global catalog
        const storeItem = data.store_item;
        const productData = {
          name: storeItem.name,
          barcode: storeItem.barcode,
          description: storeItem.description || `${storeItem.brand} ${storeItem.name}`,
          category: storeItem.category,
          brand: storeItem.brand,
          size: storeItem.size,
          unit: storeItem.unit,
          image_url: storeItem.image_url,
          // These fields merchant needs to set
          price: data.merchant_pricing?.sell_price || '',
          cost_price: data.merchant_pricing?.cost_price || '',
          stock_quantity: data.merchant_pricing?.stock_quantity || 0,
          suggested_price: data.area_average_price || null,
          store_item_id: storeItem.id
        };

        toast.success(`Found: ${storeItem.name}`);

        // Show result for confirmation
        setSearchResults({
          found: true,
          product: productData,
          needsPricing: data.needs_pricing
        });

      } else if (data.suggestions && data.suggestions.length > 0) {
        // Similar products found
        toast.info('Product not found, but we have suggestions');
        setSearchResults({
          found: false,
          suggestions: data.suggestions,
          barcode: barcode
        });
      } else {
        // Product not in catalog
        toast.error('Product not found in catalog');
        setSearchResults({
          found: false,
          barcode: barcode,
          message: 'Product not found. You can add it manually.'
        });
      }
    } catch (error) {
      console.error('Error looking up product:', error);
      toast.error('Failed to lookup product');
    } finally {
      setLoading(false);
    }
  };

  // Search products by name/brand
  const searchCatalog = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/inventory/store-items/search?q=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setCatalogProducts(data.results || []);

      if (data.results.length === 0) {
        toast.info('No products found');
      }
    } catch (error) {
      console.error('Error searching catalog:', error);
      toast.error('Failed to search catalog');
    } finally {
      setSearchLoading(false);
    }
  };

  // Select a product from search results or suggestions
  const selectProduct = (product) => {
    const productData = {
      name: product.name,
      barcode: product.barcode,
      description: product.description || `${product.brand} ${product.name}`,
      category: product.category,
      brand: product.brand,
      size: product.size,
      unit: product.unit,
      image_url: product.image_url,
      store_item_id: product.id
    };

    onProductFound(productData);
    onClose();
  };

  // Apply the found product to the form
  const applyProduct = () => {
    if (searchResults?.product) {
      onProductFound(searchResults.product);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Product from Catalog
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!searchResults ? (
            <>
              {/* Scanner Options */}
              <div className="space-y-4">
                {/* Barcode Scanner */}
                {!scanning ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Scan Barcode
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Use your camera to scan a product barcode
                    </p>
                    <button
                      onClick={() => setScanning(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <CameraIcon className="w-5 h-5 inline mr-2" />
                      Start Scanner
                    </button>
                  </div>
                ) : (
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full"
                      style={{ maxHeight: '300px' }}
                      autoPlay
                      playsInline
                      muted
                    />
                    <button
                      onClick={() => setScanning(false)}
                      className="absolute top-4 right-4 p-2 bg-white rounded-full"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 rounded-lg p-2 text-center text-sm">
                      Position barcode within frame
                    </div>
                  </div>
                )}

                {/* Manual Barcode Entry */}
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Enter Barcode Manually
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Enter barcode number"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          lookupProduct(manualCode);
                        }
                      }}
                    />
                    <button
                      onClick={() => lookupProduct(manualCode)}
                      disabled={loading || !manualCode}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* Search by Name */}
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Search Product Catalog
                  </h3>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                    Browse Product Catalog
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Search Results */
            <div className="space-y-4">
              {searchResults.found ? (
                /* Product Found */
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircleIcon className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-green-900 mb-2">
                        Product Found!
                      </h3>
                      <div className="bg-white rounded-lg p-4 space-y-2">
                        <div>
                          <span className="text-sm text-gray-500">Name:</span>
                          <p className="font-medium">{searchResults.product.name}</p>
                        </div>
                        {searchResults.product.brand && (
                          <div>
                            <span className="text-sm text-gray-500">Brand:</span>
                            <p className="font-medium">{searchResults.product.brand}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm text-gray-500">Category:</span>
                          <p className="font-medium">{searchResults.product.category}</p>
                        </div>
                        {searchResults.product.size && (
                          <div>
                            <span className="text-sm text-gray-500">Size:</span>
                            <p className="font-medium">{searchResults.product.size}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm text-gray-500">Barcode:</span>
                          <p className="font-mono">{searchResults.product.barcode}</p>
                        </div>
                        {searchResults.product.suggested_price && (
                          <div className="pt-2 border-t">
                            <span className="text-sm text-gray-500">Area Average Price:</span>
                            <p className="font-medium text-green-600">
                              ${searchResults.product.suggested_price.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                      {searchResults.needsPricing && (
                        <p className="mt-2 text-sm text-amber-600">
                          ⚠️ You'll need to set your pricing for this product
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Product Not Found */
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationCircleIcon className="w-6 h-6 text-amber-600 mr-3 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-amber-900 mb-2">
                        Product Not Found
                      </h3>
                      <p className="text-sm text-amber-700 mb-3">
                        Barcode: <span className="font-mono">{searchResults.barcode}</span>
                      </p>
                      {searchResults.suggestions && searchResults.suggestions.length > 0 && (
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Similar products:
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {searchResults.suggestions.map((product) => (
                              <button
                                key={product.id}
                                onClick={() => selectProduct(product)}
                                className="w-full text-left p-2 hover:bg-gray-50 rounded border border-gray-200"
                              >
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-gray-500">
                                  {product.brand} • {product.barcode}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSearchResults(null);
                    setManualCode('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Try Another
                </button>
                {searchResults.found && (
                  <button
                    onClick={applyProduct}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Use This Product
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      searchCatalog();
                    }
                  }}
                  placeholder="Search by product name or brand..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={searchCatalog}
                  disabled={searchLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {catalogProducts.length > 0 ? (
                <div className="grid gap-2">
                  {catalogProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        selectProduct(product);
                        setShowSearchModal(false);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                    >
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {product.brand} • {product.category} • {product.barcode}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  {searchLoading ? 'Searching...' : 'Search for products in the catalog'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;