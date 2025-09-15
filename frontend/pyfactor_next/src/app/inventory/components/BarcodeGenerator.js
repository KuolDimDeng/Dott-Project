'use client';

import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

/**
 * Barcode Generator Component
 * Generates EAN-13 barcodes for products without existing barcodes
 * Uses Canvas API to draw barcodes
 */
export default function BarcodeGenerator({ product, onBarcodeGenerated, onClose }) {
  const canvasRef = useRef(null);
  const [generatedBarcode, setGeneratedBarcode] = useState('');
  const [saving, setSaving] = useState(false);

  // Generate a valid EAN-13 barcode
  const generateEAN13 = () => {
    // Start with country code (200-299 for internal use)
    const countryCode = '200';

    // Generate random manufacturer code (5 digits)
    const manufacturerCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0');

    // Generate product code (4 digits)
    const productCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    // Combine first 12 digits
    const first12 = countryCode + manufacturerCode + productCode;

    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(first12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return first12 + checkDigit;
  };

  // Draw barcode on canvas
  const drawBarcode = (code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // EAN-13 encoding (simplified - in production use a proper library)
    const barWidth = 3;
    const barHeight = 100;
    const startX = 30;
    const startY = 20;

    // Draw bars (simplified representation)
    ctx.fillStyle = 'black';
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]);
      const x = startX + (i * barWidth * 7);

      // Simple pattern based on digit (not actual EAN-13 encoding)
      for (let j = 0; j < 7; j++) {
        if ((digit + j) % 2 === 0) {
          ctx.fillRect(x + (j * barWidth), startY, barWidth, barHeight);
        }
      }
    }

    // Draw barcode number below
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(code, width / 2, startY + barHeight + 20);

    // Add product name
    ctx.font = '14px sans-serif';
    ctx.fillText(product.name.substring(0, 30), width / 2, startY + barHeight + 40);
  };

  // Generate barcode on mount
  useEffect(() => {
    const newBarcode = generateEAN13();
    setGeneratedBarcode(newBarcode);
    drawBarcode(newBarcode);
  }, []);

  // Regenerate barcode
  const regenerate = () => {
    const newBarcode = generateEAN13();
    setGeneratedBarcode(newBarcode);
    drawBarcode(newBarcode);
  };

  // Download barcode as image
  const downloadBarcode = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `barcode-${generatedBarcode}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Print barcode
  const printBarcode = () => {
    const canvas = canvasRef.current;
    const printWindow = window.open('', '', 'width=400,height=300');
    printWindow.document.write('<html><head><title>Print Barcode</title></head><body>');
    printWindow.document.write(`<img src="${canvas.toDataURL()}" style="width:100%;" />`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  // Save barcode to product
  const saveBarcode = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/inventory/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode: generatedBarcode
        })
      });

      if (response.ok) {
        onBarcodeGenerated(generatedBarcode);
        onClose();
      } else {
        alert('Failed to save barcode. Please try again.');
      }
    } catch (error) {
      console.error('Error saving barcode:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="barcode-generator" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Generate Barcode
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate a unique barcode for: <strong>{product.name}</strong>
              </p>
            </div>

            {/* Barcode Display */}
            <div className="bg-white border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4">
              <canvas
                ref={canvasRef}
                width={350}
                height={160}
                className="mx-auto"
              />
            </div>

            {/* Generated Code Display */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Generated EAN-13 Code:</p>
              <p className="text-lg font-mono font-bold text-gray-900 dark:text-white text-center">
                {generatedBarcode}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={regenerate}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Regenerate
              </button>
              <button
                onClick={downloadBarcode}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Download
              </button>
              <button
                onClick={printBarcode}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Print
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={saveBarcode}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Barcode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}