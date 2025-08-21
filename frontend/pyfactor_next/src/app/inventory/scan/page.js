'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { ArrowLeftIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// QR Scanner library - import dynamically to avoid SSR issues
let QrScannerLib = null;
let QrScannerLoadPromise = null;

if (typeof window !== 'undefined') {
  // Create a promise that resolves when the library is loaded
  QrScannerLoadPromise = import('qr-scanner').then(module => {
    QrScannerLib = module.default;
    console.log('[BarcodeScannerPage] QR scanner library loaded successfully');
    return module.default;
  }).catch(err => {
    console.error('[BarcodeScannerPage] Failed to load QR scanner:', err);
    throw err;
  });
}

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
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSPWA, setIsIOSPWA] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/login');
    }
  }, [session, loading, router]);

  // Detect iOS and PWA mode
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(iOS);
    setIsIOSPWA(iOS && isStandalone);
    
    if (iOS) {
      console.log('[BarcodeScannerPage] iOS detected');
      if (isStandalone) {
        console.warn('[BarcodeScannerPage] Running as iOS PWA - camera will not work!');
        setCameraError(true);
        setPermissionError('Camera access is not available in iOS app mode. Please open this page in Safari browser to use the camera scanner.');
      }
    }
  }, []);

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
      
      if (!videoRef.current) {
        console.error('[BarcodeScannerPage] Video ref not ready');
        setScanning(false);
        return;
      }

      // First, check if we have camera permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Request camera permission explicitly
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          
          // Stop the stream immediately - we just wanted to check permissions
          stream.getTracks().forEach(track => track.stop());
        } catch (permError) {
          console.error('[BarcodeScannerPage] Camera permission denied:', permError);
          setCameraError(true);
          setScanning(false);
          
          // Provide specific error messages
          let errorMsg = 'Unable to access camera. Please check your settings.';
          if (permError.name === 'NotAllowedError') {
            errorMsg = 'Camera access denied. Please enable camera permissions for this site.';
            if (isIOS) {
              errorMsg = 'Camera access denied. On iOS: Go to Settings → Safari → Camera and allow access. If using the app from home screen, try opening in Safari first.';
            }
          } else if (permError.name === 'NotFoundError') {
            errorMsg = 'No camera found. Please ensure your device has a camera.';
          } else if (permError.name === 'NotReadableError') {
            errorMsg = 'Camera is in use by another application. Please close other apps using the camera.';
          }
          
          setPermissionError(errorMsg);
          toast.error(errorMsg);
          return;
        }
      }

      // Wait for library to load if not ready
      if (!QrScannerLib && QrScannerLoadPromise) {
        console.log('[BarcodeScannerPage] Waiting for library to load...');
        try {
          await QrScannerLoadPromise;
        } catch (loadError) {
          console.error('[BarcodeScannerPage] Failed to load library:', loadError);
          setCameraError(true);
          setScanning(false);
          toast.error('Scanner not ready. Please refresh and try again.');
          return;
        }
      }

      // Double-check library is loaded
      if (!QrScannerLib) {
        console.error('[BarcodeScannerPage] QR Scanner library still not loaded');
        setCameraError(true);
        setScanning(false);
        toast.error('Scanner not ready. Please refresh the page.');
        return;
      }

      const scanner = new QrScannerLib(
        videoRef.current,
        (result) => {
          console.log('[BarcodeScannerPage] Scanned:', result.data);
          handleScanResult(result.data);
          scanner.stop();
          setScanning(false);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 5
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      console.log('[BarcodeScannerPage] Scanner started successfully');
    } catch (error) {
      console.error('[BarcodeScannerPage] Error starting scanner:', error);
      setCameraError(true);
      setScanning(false);
      toast.error('Unable to start scanner: ' + (error.message || 'Unknown error'));
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
              
              {/* iOS PWA Warning */}
              {isIOSPWA && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    Camera Not Available in App Mode
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    iOS doesn't allow camera access when using the app from your home screen.
                  </p>
                  <a
                    href={window.location.href}
                    target="_blank"
                    className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium"
                  >
                    Open in Safari
                  </a>
                </div>
              )}
              
              {/* iOS Camera File Input (Native Camera) */}
              {isIOS && !isIOSPWA && (
                <div className="mb-4">
                  <label className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-medium cursor-pointer hover:bg-green-700">
                    <CameraIcon className="inline w-5 h-5 mr-2" />
                    Use iOS Camera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Process the image for QR/barcode
                          try {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              // Try to decode QR/barcode from image
                              if (QrScannerLib) {
                                try {
                                  const result = await QrScannerLib.scanImage(event.target.result);
                                  handleScanResult(result);
                                  toast.success('Barcode detected!');
                                } catch (err) {
                                  toast.error('No barcode found in image. Try again or enter manually.');
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            toast.error('Failed to process image');
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Take a photo of the barcode with your camera
                  </p>
                </div>
              )}
              
              {/* Regular Scanner Button (non-iOS or iOS Safari) */}
              {!isIOSPWA && (
                <button
                  onClick={startScanning}
                  disabled={cameraError}
                  className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                    cameraError
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {cameraError ? 'Camera Not Available - Use Manual Entry Below' : (isIOS ? 'Try Live Scanner (Safari Only)' : 'Start Scanning')}
                </button>
              )}

              {permissionError && !isIOSPWA && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{permissionError}</p>
                  {isIOS && (
                    <div className="mt-2 text-xs text-red-600">
                      <p className="font-semibold">iOS Safari Settings:</p>
                      <ol className="mt-1 space-y-1">
                        <li>1. Open Settings → Safari</li>
                        <li>2. Scroll to "Settings for Websites"</li>
                        <li>3. Tap "Camera" → "Allow"</li>
                        <li>4. Refresh this page</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

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
              style={{ maxHeight: '400px', minHeight: '300px' }}
              autoPlay
              playsInline
              muted
            />
            <button
              onClick={stopScanning}
              className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 z-10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-700">
                Position barcode within the frame
              </p>
              <p className="text-xs text-gray-500 mt-1">
                If camera is black, check permissions in your browser settings
              </p>
            </div>
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white rounded-lg w-64 h-32 relative opacity-50">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
              </div>
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