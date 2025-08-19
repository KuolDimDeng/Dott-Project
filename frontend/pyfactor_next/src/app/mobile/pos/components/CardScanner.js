'use client';

import { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CameraIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { 
  isValidCardNumber, 
  isValidExpiry, 
  isValidCVC, 
  getCardType,
  paymentRateLimiter,
  clearSensitiveData,
  logSecurityEvent,
  sanitizeCardNumber
} from '../utils/security';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CardScanner({ onCardScanned, onClose, amount, currencyCode }) {
  const [scanMode, setScanMode] = useState('choose'); // choose, camera, manual, payment-api
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const formRef = useRef(null);

  // Check for Web Payment API support
  const supportsPaymentRequest = typeof window !== 'undefined' && 'PaymentRequest' in window;

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Method 1: Web Payment Request API (Built-in browser support)
  const useWebPaymentAPI = async () => {
    if (!supportsPaymentRequest) {
      setScanMode('manual');
      return;
    }

    try {
      const supportedPayments = [{
        supportedMethods: 'basic-card',
        data: {
          supportedNetworks: ['visa', 'mastercard', 'amex', 'discover'],
          supportedTypes: ['debit', 'credit', 'prepaid']
        }
      }];

      const details = {
        total: {
          label: 'Total',
          amount: { 
            currency: currencyCode || 'USD', 
            value: amount.toFixed(2) 
          }
        }
      };

      const options = {
        requestPayerName: true,
        requestPayerEmail: false,
        requestPayerPhone: false
      };

      const request = new PaymentRequest(supportedPayments, details, options);
      
      // Check if can make payment
      const canMakePayment = await request.canMakePayment();
      if (!canMakePayment) {
        setScanMode('manual');
        return;
      }

      // Show payment UI
      const paymentResponse = await request.show();
      
      // Get card details (securely handled by browser)
      const stripe = await stripePromise;
      const { token, error } = await stripe.createToken({
        card: {
          number: paymentResponse.details.cardNumber,
          exp_month: paymentResponse.details.expiryMonth,
          exp_year: paymentResponse.details.expiryYear,
          cvc: paymentResponse.details.cardSecurityCode,
          name: paymentResponse.details.cardholderName
        }
      });

      if (error) {
        throw error;
      }

      // Complete the payment UI
      await paymentResponse.complete('success');

      // Send token to parent
      onCardScanned({ token: token.id, last4: paymentResponse.details.cardNumber.slice(-4) });
      
    } catch (error) {
      console.error('Payment API error:', error);
      toast.error('Payment cancelled or failed');
      setScanMode('choose');
    }
  };

  // Method 2: Camera OCR Scanning
  const startCameraScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setScanMode('camera');
      
      // Start OCR scanning
      setTimeout(() => scanFrame(), 1000);
      
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Camera not available');
      setScanMode('manual');
    }
  };

  // OCR Processing (simplified - in production use ML model)
  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current || scanMode !== 'camera') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Here you would use Tesseract.js or a card detection ML model
    // For demo, we'll simulate detection
    
    // In production: Use card detection model
    const detectedCard = await detectCardInImage(canvas);
    
    if (detectedCard) {
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Validate and format
      setCardData(detectedCard);
      setScanMode('confirm');
    } else {
      // Continue scanning
      requestAnimationFrame(() => scanFrame());
    }
  };

  // Simulate card detection (replace with real OCR/ML)
  const detectCardInImage = async (canvas) => {
    // In production: Use Tesseract.js or TensorFlow.js model
    // This is a placeholder for demonstration
    
    // Simulate detection after 3 seconds
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo: return null to keep scanning
        // In production: return detected card data or null
        resolve(null);
      }, 100);
    });
  };

  // Method 3: Manual Entry with Enhanced Security
  const handleManualEntry = async () => {
    setIsProcessing(true);

    try {
      // Check rate limiting
      try {
        paymentRateLimiter.canAttempt();
      } catch (rateLimitError) {
        toast.error(rateLimitError.message);
        logSecurityEvent('PAYMENT_RATE_LIMITED', { 
          timestamp: new Date().toISOString() 
        });
        setIsProcessing(false);
        return;
      }

      // Validate card data
      if (!cardData.number || !cardData.expiry || !cardData.cvc) {
        toast.error('Please fill all card fields');
        setIsProcessing(false);
        return;
      }

      // Enhanced card validation
      if (!isValidCardNumber(cardData.number)) {
        paymentRateLimiter.recordAttempt();
        logSecurityEvent('INVALID_CARD_NUMBER', { 
          attempted: sanitizeCardNumber(cardData.number) 
        });
        toast.error('Invalid card number');
        setIsProcessing(false);
        return;
      }

      if (!isValidExpiry(cardData.expiry)) {
        paymentRateLimiter.recordAttempt();
        logSecurityEvent('INVALID_EXPIRY', { expiry: cardData.expiry });
        toast.error('Invalid or expired card');
        setIsProcessing(false);
        return;
      }

      const cardType = getCardType(cardData.number);
      if (!isValidCVC(cardData.cvc, cardType)) {
        paymentRateLimiter.recordAttempt();
        logSecurityEvent('INVALID_CVC', { cardType });
        toast.error('Invalid security code');
        setIsProcessing(false);
        return;
      }

      // Parse expiry
      const [expMonth, expYear] = cardData.expiry.split('/');

      // Log payment attempt
      logSecurityEvent('PAYMENT_ATTEMPT', {
        cardType,
        last4: cardData.number.slice(-4),
        amount: amount
      });

      // Create Stripe token
      const stripe = await stripePromise;
      const { token, error } = await stripe.createToken({
        card: {
          number: cardData.number.replace(/\s/g, ''),
          exp_month: parseInt(expMonth),
          exp_year: parseInt('20' + expYear),
          cvc: cardData.cvc,
          name: cardData.name
        }
      });

      if (error) {
        paymentRateLimiter.recordAttempt();
        logSecurityEvent('STRIPE_TOKEN_ERROR', { 
          error: error.message,
          type: error.type 
        });
        throw error;
      }

      // Success - reset rate limiter
      paymentRateLimiter.recordSuccess();
      
      // Log successful tokenization
      logSecurityEvent('PAYMENT_TOKEN_CREATED', {
        token: token.id.substring(0, 10) + '...',
        last4: token.card.last4,
        brand: token.card.brand,
        amount: amount
      });

      // Clear sensitive data from memory
      const clearedData = clearSensitiveData(formRef);
      setCardData(clearedData);

      // Send token to parent
      onCardScanned({ 
        token: token.id, 
        last4: token.card.last4,
        brand: token.card.brand 
      });
      
    } catch (error) {
      console.error('Tokenization error:', error);
      toast.error(error.message || 'Invalid card details');
      
      // Clear sensitive data on error
      const clearedData = clearSensitiveData(formRef);
      setCardData(clearedData);
    } finally {
      setIsProcessing(false);
    }
  };

  // Format card number input
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry input
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
      <div className="bg-white w-full max-h-[90vh] rounded-t-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {scanMode === 'choose' && 'Payment Method'}
              {scanMode === 'camera' && 'Scan Card'}
              {scanMode === 'manual' && 'Enter Card Details'}
              {scanMode === 'confirm' && 'Confirm Card'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[75vh]">
          {/* Choose Method */}
          {scanMode === 'choose' && (
            <div className="space-y-3">
              <div className="text-center mb-6">
                <p className="text-2xl font-bold text-gray-900">
                  {currencyCode} {amount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Choose payment method</p>
              </div>

              {supportsPaymentRequest && (
                <button
                  onClick={() => useWebPaymentAPI()}
                  className="w-full p-4 bg-blue-600 text-white rounded-xl flex items-center justify-between hover:bg-blue-700"
                >
                  <div className="flex items-center">
                    <CreditCardIcon className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <p className="font-semibold">Quick Pay</p>
                      <p className="text-sm opacity-90">Use saved cards or scan</p>
                    </div>
                  </div>
                  <span className="text-xs bg-blue-500 px-2 py-1 rounded">FASTEST</span>
                </button>
              )}

              <button
                onClick={startCameraScanning}
                className="w-full p-4 bg-green-600 text-white rounded-xl flex items-center justify-between hover:bg-green-700"
              >
                <div className="flex items-center">
                  <CameraIcon className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <p className="font-semibold">Scan with Camera</p>
                    <p className="text-sm opacity-90">Point at card to scan</p>
                  </div>
                </div>
                <span className="text-xs bg-green-500 px-2 py-1 rounded">AI POWERED</span>
              </button>

              <button
                onClick={() => setScanMode('manual')}
                className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl flex items-center justify-between hover:bg-gray-200"
              >
                <div className="flex items-center">
                  <CreditCardIcon className="w-6 h-6 mr-3 text-gray-600" />
                  <div className="text-left">
                    <p className="font-semibold">Enter Manually</p>
                    <p className="text-sm text-gray-600">Type card details</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Camera Scanning */}
          {scanMode === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white rounded-xl w-80 h-48 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-xl"></div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white bg-black bg-opacity-50 px-4 py-2 rounded-full inline-block">
                    Position card within frame
                  </p>
                </div>
              </div>

              <button
                onClick={() => setScanMode('manual')}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
              >
                Enter Manually Instead
              </button>
            </div>
          )}

          {/* Manual Entry */}
          {scanMode === 'manual' && (
            <div className="space-y-4">
              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardData.number}
                    onChange={(e) => setCardData({
                      ...cardData,
                      number: formatCardNumber(e.target.value)
                    })}
                    maxLength="19"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  />
                </div>

                {/* Expiry and CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({
                        ...cardData,
                        expiry: formatExpiry(e.target.value)
                      })}
                      maxLength="5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVC
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardData.cvc}
                      onChange={(e) => setCardData({
                        ...cardData,
                        cvc: e.target.value.replace(/\D/g, '').slice(0, 4)
                      })}
                      maxLength="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>
                </div>

                {/* Card Type Indicator */}
                {cardData.number.length >= 4 && (
                  <div className="text-sm text-gray-600 mb-2">
                    Card Type: <span className="font-medium">
                      {getCardType(cardData.number).toUpperCase()}
                    </span>
                    {isValidCardNumber(cardData.number) && (
                      <span className="ml-2 text-green-600">✓ Valid</span>
                    )}
                  </div>
                )}

                {/* Cardholder Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={cardData.name}
                    onChange={(e) => setCardData({
                      ...cardData,
                      name: e.target.value
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center space-x-4 py-2">
                <img src="/static/images/stripe-badge.png" alt="Stripe" className="h-8" />
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  PCI Compliant
                </div>
              </div>

              {/* Process Button */}
              <button
                onClick={handleManualEntry}
                disabled={isProcessing || !cardData.number || !cardData.expiry || !cardData.cvc}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                  isProcessing || !cardData.number || !cardData.expiry || !cardData.cvc
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Pay ${currencyCode} ${amount.toFixed(2)}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}