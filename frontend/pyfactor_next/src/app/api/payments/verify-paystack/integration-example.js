/**
 * Example integration for Paystack payment verification
 * This shows how to use the verify-paystack endpoint in your React components
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Example React component
export function PaystackPaymentVerification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const verifyPayment = async (reference) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/verify-paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Payment verified successfully:', data);
        
        // Handle successful verification
        if (data.subscription) {
          // Redirect to success page or dashboard
          router.push('/dashboard?payment=success');
        }
      } else {
        // Handle verification error
        setError(data.error || 'Payment verification failed');
        console.error('Verification failed:', data);
        
        // Check if payment requires support intervention
        if (data.requires_support) {
          setError('Payment was successful but requires support assistance. Please contact support with reference: ' + reference);
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Example usage with Paystack callback
  const handlePaystackCallback = (response) => {
    console.log('Paystack response:', response);
    
    if (response.reference) {
      // Verify the payment
      verifyPayment(response.reference);
    }
  };

  // Example Paystack configuration
  const paystackConfig = {
    reference: new Date().getTime().toString(),
    email: 'user@example.com',
    amount: 1500 * 100, // Amount in kobo
    currency: 'NGN',
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    metadata: {
      plan: 'professional',
      billing_cycle: 'monthly',
      custom_fields: []
    },
    onSuccess: (response) => {
      console.log('Payment successful:', response);
      verifyPayment(response.reference);
    },
    onCancel: () => {
      console.log('Payment cancelled');
      setError('Payment was cancelled');
    }
  };

  return (
    <div>
      {loading && <p>Verifying payment...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}

// Example of how to handle Paystack redirect/callback URL
export function PaystackCallbackPage() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Get reference from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref'); // Alternative parameter name

    const paymentReference = reference || trxref;

    if (paymentReference) {
      // Verify the payment
      verifyPaymentOnLoad(paymentReference);
    } else {
      setVerifying(false);
      router.push('/pricing?error=no-reference');
    }
  }, []);

  const verifyPaymentOnLoad = async (reference) => {
    try {
      const response = await fetch('/api/payments/verify-paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Payment verified successfully
        router.push('/dashboard?payment=success&plan=' + data.subscription?.plan);
      } else {
        // Verification failed
        router.push('/pricing?error=verification-failed&message=' + encodeURIComponent(data.error));
      }
    } catch (error) {
      console.error('Verification error:', error);
      router.push('/pricing?error=verification-error');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return null;
}