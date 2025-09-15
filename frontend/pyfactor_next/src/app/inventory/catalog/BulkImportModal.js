'use client';

import React, { useState } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

/**
 * Bulk Import Modal for adding multiple products from catalog
 */
export default function BulkImportModal({ open, onClose, selectedProducts = [] }) {
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState('review'); // review, pricing, complete
  const [pricingData, setPricingData] = useState({});
  const [importResults, setImportResults] = useState([]);
  const [defaultMarkup, setDefaultMarkup] = useState(30); // Default 30% markup

  // Initialize pricing data with default markup
  React.useEffect(() => {
    if (selectedProducts.length > 0 && Object.keys(pricingData).length === 0) {
      const initialPricing = {};
      selectedProducts.forEach(product => {
        initialPricing[product.id] = {
          cost_price: '',
          sell_price: '',
          stock_quantity: 0,
          use_markup: true
        };
      });
      setPricingData(initialPricing);
    }
  }, [selectedProducts]);

  // Calculate sell price based on cost and markup
  const calculateSellPrice = (costPrice, markup) => {
    const cost = parseFloat(costPrice);
    if (isNaN(cost)) return '';
    return (cost * (1 + markup / 100)).toFixed(2);
  };

  // Handle cost price change
  const handleCostPriceChange = (productId, value) => {
    const newPricing = { ...pricingData };
    newPricing[productId].cost_price = value;

    // Auto-calculate sell price if using markup
    if (newPricing[productId].use_markup && value) {
      newPricing[productId].sell_price = calculateSellPrice(value, defaultMarkup);
    }

    setPricingData(newPricing);
  };

  // Handle sell price change
  const handleSellPriceChange = (productId, value) => {
    const newPricing = { ...pricingData };
    newPricing[productId].sell_price = value;
    newPricing[productId].use_markup = false; // Disable auto-markup when manually editing
    setPricingData(newPricing);
  };

  // Apply markup to all products
  const applyMarkupToAll = () => {
    const newPricing = { ...pricingData };
    Object.keys(newPricing).forEach(productId => {
      if (newPricing[productId].cost_price) {
        newPricing[productId].sell_price = calculateSellPrice(
          newPricing[productId].cost_price,
          defaultMarkup
        );
        newPricing[productId].use_markup = true;
      }
    });
    setPricingData(newPricing);
  };

  // Validate pricing data
  const validatePricing = () => {
    for (const product of selectedProducts) {
      const pricing = pricingData[product.id];
      if (!pricing || !pricing.sell_price || parseFloat(pricing.sell_price) <= 0) {
        return false;
      }
    }
    return true;
  };

  // Import products to inventory
  const handleImport = async () => {
    if (!validatePricing()) {
      alert('Please set valid selling prices for all products');
      return;
    }

    setImporting(true);
    const results = [];

    try {
      for (const product of selectedProducts) {
        const pricing = pricingData[product.id];

        const response = await fetch('/api/inventory/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            barcode: product.barcode,
            name: product.name,
            description: product.description || '',
            category: product.category || 'General',
            brand: product.brand || '',
            image_url: product.thumbnail_url || product.image_url || '',
            price: pricing.sell_price,
            cost_price: pricing.cost_price || '',
            stock_quantity: pricing.stock_quantity || 0,
            is_active: true
          })
        });

        const data = await response.json();

        results.push({
          product: product.name,
          success: response.ok,
          message: response.ok ? 'Added successfully' : data.error || 'Failed to add'
        });
      }

      setImportResults(results);
      setStep('complete');
    } catch (error) {
      console.error('Bulk import error:', error);
      alert('An error occurred during import. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="bulk-import-modal" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <ArrowDownTrayIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Bulk Import Products ({selectedProducts.length} selected)
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {step === 'review' && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Review the products you're about to import to your inventory:
                </p>

                <div className="space-y-2">
                  {selectedProducts.map(product => (
                    <div key={product.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {product.thumbnail_url && (
                        <img
                          src={product.thumbnail_url}
                          alt={product.name}
                          className="h-12 w-12 object-cover rounded mr-3"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {product.barcode} • {product.category}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'pricing' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set pricing for your products:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={defaultMarkup}
                      onChange={(e) => setDefaultMarkup(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">% markup</span>
                    <button
                      onClick={applyMarkupToAll}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Apply to All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedProducts.map(product => (
                    <div key={product.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {product.barcode}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Cost Price (optional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={pricingData[product.id]?.cost_price || ''}
                            onChange={(e) => handleCostPriceChange(product.id, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Sell Price <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={pricingData[product.id]?.sell_price || ''}
                            onChange={(e) => handleSellPriceChange(product.id, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Initial Stock
                          </label>
                          <input
                            type="number"
                            value={pricingData[product.id]?.stock_quantity || 0}
                            onChange={(e) => {
                              const newPricing = { ...pricingData };
                              newPricing[product.id].stock_quantity = parseInt(e.target.value) || 0;
                              setPricingData(newPricing);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div>
                <div className="mb-4 text-center">
                  <CheckIcon className="mx-auto h-12 w-12 text-green-500" />
                  <h4 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                    Import Complete!
                  </h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {importResults.filter(r => r.success).length} of {importResults.length} products imported successfully
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center p-2 rounded-lg ${
                        result.success
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {result.success ? (
                        <CheckIcon className="h-4 w-4 mr-2" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                      )}
                      <span className="text-sm">
                        {result.product}: {result.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {step === 'complete' ? 'Close' : 'Cancel'}
            </button>

            {step === 'review' && (
              <button
                onClick={() => setStep('pricing')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Next: Set Pricing
              </button>
            )}

            {step === 'pricing' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('review')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !validatePricing()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing...' : 'Import Products'}
                </button>
              </div>
            )}

            {step === 'complete' && (
              <button
                onClick={() => window.location.href = '/inventory'}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Go to Inventory
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}