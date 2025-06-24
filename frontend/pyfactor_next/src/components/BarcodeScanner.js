'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';

/**
 * BarcodeScanner Component
 * Handles barcode scanning via USB scanner or camera
 * USB scanners typically work like keyboards, entering data followed by Enter key
 */
const BarcodeScanner = ({ onScan, onClose }) => {
  const [scanMode, setScanMode] = useState('usb'); // usb or camera
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Configuration
  const SCAN_TIMEOUT = 100; // Time in ms to consider input as complete scan
  const MIN_SCAN_LENGTH = 8; // Minimum characters for valid scan

  // Focus input on mount for USB scanner
  useEffect(() => {
    if (scanMode === 'usb' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  // Handle USB scanner input
  const handleScannerInput = useCallback((event) => {
    const now = Date.now();
    const timeSinceLastInput = now - lastScanTime;
    
    // If Enter key is pressed or timeout exceeded, process the scan
    if (event.key === 'Enter' || timeSinceLastInput > SCAN_TIMEOUT) {
      event.preventDefault();
      
      if (scannedData.length >= MIN_SCAN_LENGTH) {
        processScan(scannedData);
        setScannedData('');
      }
    } else {
      // Accumulate scanned characters
      if (event.key.length === 1) {
        setScannedData(prev => prev + event.key);
      }
    }
    
    setLastScanTime(now);
  }, [scannedData, lastScanTime]);

  // Process scanned data
  const processScan = async (data) => {
    try {
      // Try to parse as JSON (for QR codes)
      let parsedData;
      try {
        parsedData = JSON.parse(data);
        if (parsedData.type === 'DOTT_PRODUCT') {
          // Valid product QR code
          toast.success('Product scanned successfully!');
          if (onScan) {
            onScan({
              type: 'product',
              data: parsedData
            });
          }
          return;
        }
      } catch (e) {
        // Not JSON, might be a simple barcode
      }

      // Handle as simple barcode (SKU or product code)
      if (onScan) {
        onScan({
          type: 'barcode',
          data: data
        });
      }
      toast.success('Barcode scanned successfully!');
    } catch (error) {
      console.error('Error processing scan:', error);
      toast.error('Invalid scan data');
    }
  };

  // Initialize camera for scanning
  const startCameraScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        
        // Initialize QR/barcode detection
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new window.BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']
          });
          
          const detectLoop = async () => {
            if (videoRef.current && isScanning) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  processScan(barcodes[0].rawValue);
                  stopCameraScanning();
                }
              } catch (err) {
                console.error('Detection error:', err);
              }
              
              if (isScanning) {
                requestAnimationFrame(detectLoop);
              }
            }
          };
          
          detectLoop();
        } else {
          toast.error('Barcode detection not supported in this browser');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to access camera');
    }
  };

  // Stop camera scanning
  const stopCameraScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraScanning();
    };
  }, []);

  // Manual input handler
  const handleManualInput = (e) => {
    e.preventDefault();
    const input = e.target.elements.manualCode.value.trim();
    if (input) {
      processScan(input);
      e.target.reset();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Scan Product</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scan Mode Selection */}
        <div className="mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setScanMode('usb')}
              className={`flex-1 py-2 px-4 rounded ${
                scanMode === 'usb'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              USB Scanner
            </button>
            <button
              onClick={() => setScanMode('camera')}
              className={`flex-1 py-2 px-4 rounded ${
                scanMode === 'camera'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Camera
            </button>
          </div>
        </div>

        {/* USB Scanner Mode */}
        {scanMode === 'usb' && (
          <div>
            <div className="mb-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                Position your cursor in the field below and scan a product barcode or QR code.
              </p>
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={scannedData}
              onChange={(e) => setScannedData(e.target.value)}
              onKeyDown={handleScannerInput}
              placeholder="Waiting for scan..."
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            
            <div className="mt-4 text-center text-sm text-gray-600">
              <p>Scanner will auto-detect when scan is complete</p>
            </div>
          </div>
        )}

        {/* Camera Mode */}
        {scanMode === 'camera' && (
          <div>
            {!isScanning ? (
              <button
                onClick={startCameraScanning}
                className="w-full py-3 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Camera Scanning
              </button>
            ) : (
              <div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded mb-4"
                />
                <button
                  onClick={stopCameraScanning}
                  className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Stop Scanning
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Input */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium mb-2">Manual Entry</h3>
          <form onSubmit={handleManualInput} className="flex gap-2">
            <input
              type="text"
              name="manualCode"
              placeholder="Enter code manually"
              className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Submit
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-gray-600">
          <p className="font-medium mb-1">Supported formats:</p>
          <ul className="list-disc list-inside">
            <li>QR Codes (product data)</li>
            <li>Code 128, Code 39 (standard barcodes)</li>
            <li>EAN-13, EAN-8 (retail barcodes)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;