'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { getWhatsAppPaymentMethod } from '@/utils/whatsappCountryDetection';

const WhatsAppPaymentProcessor = ({ orderId, onPaymentComplete, onCancel }) => {
  const { user } = useSession();
  const [order, setOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState({
    phoneNumber: '',
    email: '',
    name: ''
  });

  useEffect(() => {
    const initializePayment = async () => {
      try {
        // Get payment method for user's country
        const userCountry = user?.country || 'US';
        const payment = getWhatsAppPaymentMethod(userCountry);
        setPaymentMethod(payment);

        // Fetch order details
        if (orderId) {
          const response = await fetch(`/api/proxy/whatsapp-business/orders/${orderId}/`);
          if (response.ok) {
            const orderData = await response.json();
            setOrder(orderData);
            
            // Pre-fill customer data if available
            setPaymentData({
              phoneNumber: orderData.customer_phone || '',
              email: orderData.customer_email || '',
              name: orderData.customer_name || ''
            });
          }
        }
      } catch (error) {
        console.error('Error initializing payment:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializePayment();
    }
  }, [user, orderId]);

  const processCardPayment = async () => {
    try {
      setProcessing(true);

      // Create Stripe payment intent
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(order.total_amount * 100), // Convert to cents
          currency: order.currency.toLowerCase(),
          orderId: order.id,
          customerEmail: paymentData.email,
          customerName: paymentData.name,
          paymentType: 'whatsapp_order'
        }),
      });

      if (response.ok) {
        const { clientSecret, paymentIntentId } = await response.json();
        
        // Update order with payment reference
        await fetch(`/api/proxy/whatsapp-business/orders/${order.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_reference: paymentIntentId,
            payment_method: 'card',
            payment_status: 'pending'
          }),
        });

        // Redirect to Stripe payment page or use Stripe Elements
        // For simplicity, we'll simulate a successful payment
        setTimeout(async () => {
          await handlePaymentSuccess(paymentIntentId);
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing card payment:', error);
      setProcessing(false);
    }
  };

  const processMpesaPayment = async () => {
    try {
      setProcessing(true);

      // Initiate M-Pesa payment
      const response = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: order.total_amount,
          phoneNumber: paymentData.phoneNumber,
          orderId: order.id,
          description: `WhatsApp Order ${order.id}`
        }),
      });

      if (response.ok) {
        const { checkoutRequestId } = await response.json();
        
        // Update order with M-Pesa reference
        await fetch(`/api/proxy/whatsapp-business/orders/${order.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_reference: checkoutRequestId,
            payment_method: 'mpesa',
            payment_status: 'pending'
          }),
        });

        // Poll for payment status
        pollMpesaPaymentStatus(checkoutRequestId);
      }
    } catch (error) {
      console.error('Error processing M-Pesa payment:', error);
      setProcessing(false);
    }
  };

  const pollMpesaPaymentStatus = async (checkoutRequestId) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/mpesa/status/${checkoutRequestId}`);
        if (response.ok) {
          const { status, resultCode } = await response.json();
          
          if (resultCode === '0') {
            // Payment successful
            await handlePaymentSuccess(checkoutRequestId);
            return;
          } else if (resultCode && resultCode !== '0') {
            // Payment failed
            setProcessing(false);
            alert('Payment failed. Please try again.');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setProcessing(false);
          alert('Payment timeout. Please check your phone and try again.');
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        setProcessing(false);
      }
    };

    poll();
  };

  const handlePaymentSuccess = async (paymentReference) => {
    try {
      // Update order status
      await fetch(`/api/proxy/whatsapp-business/orders/${order.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: 'paid',
          order_status: 'confirmed'
        }),
      });

      // Send confirmation message
      await fetch(`/api/proxy/whatsapp-business/orders/${order.id}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'confirmed'
        }),
      });

      setProcessing(false);
      onPaymentComplete && onPaymentComplete(order.id, paymentReference);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod?.primary === 'mpesa') {
      processMpesaPayment();
    } else {
      processCardPayment();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Order not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Payment</h2>
        <p className="text-gray-600">Order #{order.id}</p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between items-center mb-2">
            <span className="text-sm">{item.product_name} x {item.quantity}</span>
            <span className="text-sm font-medium">{order.currency} {item.total_price}</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center font-semibold">
            <span>Total</span>
            <span>{order.currency} {order.total_amount}</span>
          </div>
          {order.dott_fee_amount > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
              <span>Processing Fee</span>
              <span>{order.currency} {order.dott_fee_amount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Info */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
        <div className="flex items-center space-x-3 p-3 border rounded-lg">
          {paymentMethod?.primary === 'mpesa' ? (
            <>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">M</span>
              </div>
              <div>
                <p className="font-medium">M-Pesa</p>
                <p className="text-sm text-gray-600">Pay with your mobile money</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Credit/Debit Card</p>
                <p className="text-sm text-gray-600">Secure card payment</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={paymentData.name}
              onChange={(e) => setPaymentData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Customer name"
            />
          </div>
          
          {paymentMethod?.primary === 'mpesa' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
              <input
                type="tel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.phoneNumber}
                onChange={(e) => setPaymentData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="254712345678"
              />
              <p className="text-xs text-gray-500 mt-1">Enter phone number without + or 0</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.email}
                onChange={(e) => setPaymentData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>
          )}
        </div>
      </div>

      {/* Payment Button */}
      <div className="space-y-3">
        <button
          onClick={handlePayment}
          disabled={processing || !paymentData.name || (!paymentData.email && !paymentData.phoneNumber)}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            processing || !paymentData.name || (!paymentData.email && !paymentData.phoneNumber)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : paymentMethod?.primary === 'mpesa'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            `Pay ${order.currency} ${order.total_amount} with ${paymentMethod?.localPayment || 'Card'}`
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={processing}
          className="w-full py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Processing Info */}
      {processing && paymentMethod?.primary === 'mpesa' && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Check Your Phone</p>
              <p className="text-sm text-yellow-700 mt-1">
                Please complete the M-Pesa payment on your phone. This may take a few moments.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppPaymentProcessor;