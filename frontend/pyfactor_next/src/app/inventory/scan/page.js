'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import QrScanner from 'qr-scanner';
import { ArrowLeftIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function BarcodeScannerPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState(null);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/login');
    }
  }, [session, loading, router]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setScanning(true);
      setCameraError(false);
      
      if (!videoRef.current) return;

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
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
      await scanner.start();
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError(true);
      setScanning(false);
      toast.error('Unable to access camera');
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanResult = async (code) => {
    setResult(code);
    await lookupProduct(code);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      setResult(manualCode);
      await lookupProduct(manualCode);
    }
  };

  const lookupProduct = async (code) => {
    try {
      const response = await fetch(`/api/products/${session.tenantId}/barcode/${code}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        toast.success('Product found!');
      } else if (response.status === 404) {
        setProduct(null);
        toast.error('Product not found');
      }
    } catch (error) {
      console.error('Error looking up product:', error);
      toast.error('Failed to lookup product');
    }
  };

  const updateStock = async (adjustment) => {
    if (!product) return;

    try {
      const response = await fetch(`/api/inventory/${session.tenantId}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          product_id: product.id,
          adjustment_type: adjustment > 0 ? 'add' : 'remove',
          quantity: Math.abs(adjustment),
          reason: 'Manual adjustment via scanner'
        })
      });

      if (response.ok) {
        toast.success('Stock updated successfully');
        setProduct({
          ...product,
          stock_quantity: product.stock_quantity + adjustment
        });
      } else {
        throw new Error('Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-3 p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Barcode Scanner</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Scanner Section */}
        {!scanning ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CameraIcon className="w-16 h-16 text-gray-400" />
              </div>
              
              <button
                onClick={startScanning}
                disabled={cameraError}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  cameraError
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {cameraError ? 'Camera Not Available' : 'Start Scanning'}
              </button>

              <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or enter manually</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="mt-4">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter barcode number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="mt-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors"
                >
                  Look Up Product
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-black rounded-lg overflow-hidden relative">
            <video
              ref={videoRef}
              className="w-full"
              style={{ maxHeight: '400px' }}
            />
            <button
              onClick={stopScanning}
              className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-700">
                Position barcode within the frame
              </p>
            </div>
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Scanned Code</h3>
            <p className="text-lg font-mono text-gray-900">{result}</p>
          </div>
        )}

        {/* Product Details */}
        {product && (
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Product Details
            </h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Name</span>
                <p className="text-base font-medium text-gray-900">{product.name}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">SKU</span>
                <p className="text-base font-medium text-gray-900">{product.sku || 'N/A'}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Price</span>
                <p className="text-base font-medium text-gray-900">
                  ${product.price.toFixed(2)}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Current Stock</span>
                <p className="text-2xl font-bold text-blue-600">
                  {product.stock_quantity}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Quick Stock Adjustment
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStock(1)}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                >
                  +1 Stock
                </button>
                <button
                  onClick={() => updateStock(-1)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                >
                  -1 Stock
                </button>
                <button
                  onClick={() => updateStock(10)}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                >
                  +10 Stock
                </button>
                <button
                  onClick={() => updateStock(-10)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                >
                  -10 Stock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear Button */}
        {(result || product) && (
          <button
            onClick={() => {
              setResult(null);
              setProduct(null);
              setManualCode('');
            }}
            className="mt-4 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors"
          >
            Clear & Scan Another
          </button>
        )}
      </div>
    </div>
  );
}