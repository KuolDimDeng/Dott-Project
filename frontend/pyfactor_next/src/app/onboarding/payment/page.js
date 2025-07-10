'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { DynamicStripeProvider } from '@/components/payment/DynamicStripeProvider';
import { useSession } from '@/hooks/useSession-v2';
import { logger } from '@/utils/logger';
import { refreshSessionData, waitForSessionUpdate } from '@/utils/sessionRefresh';
import { safeJsonParse, handleFetchError } from '@/utils/responseParser';
import { getCountryCode } from '@/utils/countryMapping';
// Removed sessionStatus import - using session-v2 system

// PaymentForm component that uses Stripe hooks
function PaymentForm({ plan, billingCycle, urlCountry }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const user = session?.user;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [tenantId, setTenantId] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [regionalPricing, setRegionalPricing] = useState(null);
  const [country, setCountry] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [mpesaPhone, setMpesaPhone] = useState('');

  // Fetch session data to get tenant ID and business info from onboarding progress
  useEffect(() => {
    const fetchSessionAndBusinessInfo = async () => {
      try {
        logger.info('[PaymentForm] Fetching session data and onboarding progress...');
        
        // Fetch session data which includes onboarding progress
        const sessionResponse = await fetch('/api/auth/session-v2', {
          credentials: 'include'
        });
        
        if (sessionResponse.ok) {
          const sessionData = await safeJsonParse(sessionResponse, 'PaymentForm-SessionData');
          
          // Enhanced debug logging
          console.log('🚨 [PaymentForm] Full session data:', JSON.stringify(sessionData, null, 2));
          
          logger.info('[PaymentForm] Session data received:', {
            authenticated: sessionData.authenticated,
            tenantId: sessionData.user?.tenantId,
            email: sessionData.user?.email,
            onboardingProgress: sessionData.user?.onboardingProgress,
            allUserKeys: sessionData.user ? Object.keys(sessionData.user) : 'no user'
          });
          
          // Extract tenant ID
          if (sessionData.user?.tenantId) {
            setTenantId(sessionData.user.tenantId);
            logger.info('[PaymentForm] Set tenant ID:', sessionData.user.tenantId);
          } else {
            logger.warn('[PaymentForm] No tenant ID in session data');
          }
          
          // Extract business info from session data - check multiple locations
          const user = sessionData.user;
          logger.info('[PaymentForm] Looking for business info in session data');
          
          // Check multiple possible locations for business info
          const businessName = user?.businessName || 
                             user?.business_name || 
                             user?.onboardingProgress?.businessName ||
                             sessionData.businessName ||
                             sessionData.business_name;
                             
          const businessType = user?.businessType || 
                             user?.business_type || 
                             user?.onboardingProgress?.businessType ||
                             sessionData.businessType ||
                             sessionData.business_type ||
                             'Other';
          
          // Extract country from onboarding data
          const userCountry = urlCountry ||
                            user?.country || 
                            user?.onboardingProgress?.country ||
                            sessionData.country ||
                            sessionData.onboardingProgress?.country;
          
          if (userCountry) {
            setCountry(userCountry);
            logger.info('[PaymentForm] Country found:', userCountry);
            logger.info('[PaymentForm] Country source:', urlCountry ? 'URL' : 'Session');
          }
          
          if (businessName) {
            setBusinessInfo({
              businessName: businessName,
              businessType: businessType
            });
            logger.info('[PaymentForm] Business info found:', {
              businessName: businessName,
              businessType: businessType,
              source: user?.businessName ? 'user.businessName' : 
                      user?.business_name ? 'user.business_name' :
                      user?.onboardingProgress?.businessName ? 'onboardingProgress' :
                      'sessionData'
            });
          } else {
            logger.warn('[PaymentForm] No business info found in session, checking cookies');
            
            // Fallback: Check cookies for business info
            const cookies = document.cookie.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              acc[key] = decodeURIComponent(value || '');
              return acc;
            }, {});
            
            const cookieBusinessName = cookies.businessName || '';
            const cookieBusinessType = cookies.businessType || 'Other';
            
            if (cookieBusinessName) {
              setBusinessInfo({
                businessName: cookieBusinessName,
                businessType: cookieBusinessType
              });
              logger.info('[PaymentForm] Business info found in cookies:', {
                businessName: cookieBusinessName,
                businessType: cookieBusinessType
              });
            } else {
              logger.error('[PaymentForm] No business info found in any location', {
                checkedLocations: [
                  'user.businessName',
                  'user.business_name',
                  'user.onboardingProgress.businessName',
                  'sessionData.businessName',
                  'sessionData.business_name',
                  'cookies.businessName'
                ],
                userData: user ? Object.keys(user) : 'no user data',
                cookieNames: Object.keys(cookies)
              });
            }
          }
        } else {
          logger.error('[PaymentForm] Session fetch failed with status:', sessionResponse.status);
        }
      } catch (error) {
        logger.error('[PaymentForm] Error fetching session data:', error);
      }
    };
    fetchSessionAndBusinessInfo();
  }, []);

  // Fetch regional pricing when country is available
  useEffect(() => {
    const fetchRegionalPricing = async () => {
      if (!country || !plan) return;
      
      try {
        logger.info('[PaymentForm] Fetching regional pricing for:', country);
        
        // Convert country name to country code
        const countryCode = getCountryCode(country) || country;
        logger.info('[PaymentForm] Country code:', countryCode);
        
        // Fetch pricing for the country
        const pricingResponse = await fetch(`/api/pricing/by-country?country=${countryCode}`);
        if (pricingResponse.ok) {
          const pricingData = await safeJsonParse(pricingResponse, 'PaymentForm-RegionalPricing');
          logger.info('[PaymentForm] Regional pricing data:', pricingData);
          console.log('🎯 [PaymentForm] Full regional pricing response:', JSON.stringify(pricingData, null, 2));
          setRegionalPricing(pricingData);
          
          // Check if this is a developing country that should have M-Pesa
          if (country === 'Kenya' || country === 'KE') {
            logger.info('[PaymentForm] Kenya detected, adding M-Pesa payment option');
            setPaymentMethods(['card', 'mpesa']);
            
            // If discount is available and user is in Kenya, show M-Pesa as default
            if (pricingData.discount_percentage > 0) {
              setSelectedPaymentMethod('mpesa');
            }
          }
        }
        
        // Fetch available payment methods from backend
        const paymentMethodsResponse = await fetch(`/api/payment-methods/available?country=${countryCode}`);
        if (paymentMethodsResponse.ok) {
          const methodsData = await safeJsonParse(paymentMethodsResponse, 'PaymentForm-PaymentMethods');
          logger.info('[PaymentForm] Available payment methods:', methodsData);
          if (methodsData.methods && methodsData.methods.length > 0) {
            setPaymentMethods(methodsData.methods);
            logger.info('[PaymentForm] Payment methods set to:', methodsData.methods);
            
            // Debug log for M-Pesa
            if (methodsData.methods.includes('mpesa')) {
              logger.info('[PaymentForm] M-Pesa payment method is available!');
            } else {
              logger.warn('[PaymentForm] M-Pesa not in payment methods:', methodsData.methods);
            }
          }
        } else {
          logger.error('[PaymentForm] Failed to fetch payment methods');
          // Fallback for Kenya
          if (countryCode === 'KE' || country === 'Kenya') {
            logger.info('[PaymentForm] Using fallback payment methods for Kenya');
            setPaymentMethods(['card', 'mpesa']);
          }
        }
      } catch (error) {
        logger.error('[PaymentForm] Error fetching regional pricing:', error);
      }
    };
    
    fetchRegionalPricing();
  }, [country, plan]);

  // Card element styling - modern design
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        letterSpacing: '0.025em',
        fontFamily: 'Source Code Pro, monospace',
        '::placeholder': {
          color: '#aab7c4',
        },
        padding: '10px',
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  const getPrice = () => {
    // Get base price
    const prices = {
      professional: { monthly: 15, '6month': 75, yearly: 144 },
      enterprise: { monthly: 45, '6month': 225, yearly: 432 }
    };
    const basePrice = prices[plan.toLowerCase()]?.[billingCycle] || 0;
    
    // Use regional pricing if available
    if (regionalPricing && regionalPricing.pricing) {
      const planPricing = regionalPricing.pricing[plan.toLowerCase()];
      if (planPricing) {
        if (billingCycle === 'monthly') return planPricing.monthly;
        if (billingCycle === '6month') return planPricing.six_month;
        if (billingCycle === 'yearly') return planPricing.yearly;
      }
    }
    
    // If we have a discount percentage but no pricing data, apply discount manually
    if (regionalPricing && regionalPricing.discount_percentage > 0) {
      const discountMultiplier = 1 - (regionalPricing.discount_percentage / 100);
      return Math.round(basePrice * discountMultiplier * 100) / 100; // Round to 2 decimal places
    }
    
    return basePrice;
  };
  
  const getOriginalPrice = () => {
    // Always return original USD price for comparison
    const prices = {
      professional: { monthly: 15, '6month': 75, yearly: 144 },
      enterprise: { monthly: 45, '6month': 225, yearly: 432 }
    };
    return prices[plan.toLowerCase()]?.[billingCycle] || 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (selectedPaymentMethod === 'card' && (!stripe || !elements)) {
      logger.error('Stripe not loaded');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Handle M-Pesa payment via Paystack
      if (selectedPaymentMethod === 'mpesa') {
        if (!mpesaPhone.trim()) {
          throw new Error('Please enter your M-Pesa phone number');
        }
        
        logger.info('[PaymentForm] Redirecting to Paystack for M-Pesa payment:', {
          phone: mpesaPhone,
          plan: plan,
          billingCycle: billingCycle,
          amount: getPrice(),
          currency: regionalPricing?.currency || 'USD'
        });
        
        // Build Paystack payment page URL based on plan and billing cycle
        let paystackUrl = '';
        const planLower = plan.toLowerCase();
        
        if (planLower === 'professional') {
          if (billingCycle === 'monthly') {
            paystackUrl = 'https://paystack.shop/pay/professional-kenya-monthly';
          } else if (billingCycle === '6month') {
            paystackUrl = 'https://paystack.shop/pay/professional-kenya-6monthly';
          } else if (billingCycle === 'yearly') {
            paystackUrl = 'https://paystack.shop/pay/professional-yearly';
          }
        } else if (planLower === 'enterprise') {
          if (billingCycle === 'monthly') {
            paystackUrl = 'https://paystack.shop/pay/enterprise-kenya-monthly';
          } else if (billingCycle === '6month') {
            paystackUrl = 'https://paystack.shop/pay/enterprise-kenya-6monthly';
          } else if (billingCycle === 'yearly') {
            paystackUrl = 'https://paystack.shop/pay/enterprise-kenya-yearly';
          }
        }
        
        if (!paystackUrl) {
          throw new Error('Invalid plan or billing cycle selected');
        }
        
        // Pre-fill customer data in the URL
        const params = new URLSearchParams({
          email: user?.email || '',
          phone: mpesaPhone,
          first_name: user?.given_name || user?.first_name || '',
          last_name: user?.family_name || user?.last_name || '',
          'business name': businessInfo?.businessName || user?.businessName || '',
          // Add reference to link back to user
          ref: `dott_${user?.id || user?.email}_${Date.now()}`
        });
        
        // Redirect to Paystack payment page
        const redirectUrl = `${paystackUrl}?${params.toString()}`;
        logger.info('[PaymentForm] Redirecting to Paystack:', redirectUrl);
        
        // Save payment intent to session for verification later
        await fetch('/api/payments/save-pending', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            plan: plan,
            billingCycle: billingCycle,
            paymentMethod: 'mpesa',
            amount: getPrice(),
            currency: 'KES',
            paystackUrl: paystackUrl
          }),
        });
        
        // Redirect to Paystack
        window.location.href = redirectUrl;
        
        return;
      }
      
      // Original card payment flow continues below
      // Validate required fields
      if (!cardholderName.trim()) {
        throw new Error('Please enter the cardholder name');
      }
      if (!postalCode.trim()) {
        throw new Error('Please enter your postal code');
      }
      
      // Check if we have business info (required for completion)
      if (!businessInfo?.businessName && !user?.businessName) {
        logger.error('[PaymentForm] No business information available');
        throw new Error('Business information is missing. Please complete the business setup step first.');
      }

      // Get card elements
      const cardNumber = elements.getElement(CardNumberElement);
      const cardExpiry = elements.getElement(CardExpiryElement);
      const cardCvc = elements.getElement(CardCvcElement);
      
      if (!cardNumber || !cardExpiry || !cardCvc) {
        throw new Error('Card elements not found');
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumber,
        billing_details: {
          email: user?.email,
          name: cardholderName,
          address: {
            postal_code: postalCode,
          },
        },
      });

      if (pmError) {
        throw pmError;
      }

      logger.info('Payment method created:', paymentMethod.id);

      // Get CSRF token from session using v2 endpoint
      let csrfToken = null;
      try {
        const sessionResponse = await fetch('/api/auth/session-v2', {
          credentials: 'include'
        });
        
        if (sessionResponse.ok) {
          const sessionData = await safeJsonParse(sessionResponse, 'PaymentForm-CSRFToken');
          csrfToken = sessionData.csrfToken;
          logger.info('Got CSRF token from session');
        }
      } catch (error) {
        logger.error('Failed to get CSRF token from session:', error);
      }
      
      // Fallback to dedicated CSRF endpoint if session doesn't provide one
      if (!csrfToken) {
        try {
          const csrfResponse = await fetch('/api/auth/csrf-token', {
            credentials: 'include'
          });
          
          if (csrfResponse.ok) {
            const csrfData = await safeJsonParse(csrfResponse, 'PaymentForm-CSRFFallback');
            csrfToken = csrfData.csrfToken;
            logger.info('Got CSRF token from dedicated endpoint');
          }
        } catch (error) {
          logger.error('Failed to get CSRF token from dedicated endpoint:', error);
        }
      }

      // Warn if no CSRF token is available
      if (!csrfToken) {
        logger.warn('No CSRF token available - payment may fail');
      }

      // Create subscription through secure backend proxy
      logger.info('Calling create-subscription API with:', {
        plan: plan.toLowerCase(),
        billingCycle: billingCycle,
        hasCSRFToken: !!csrfToken,
      });

      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': csrfToken }),
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          payment_method_id: paymentMethod.id,
          plan: plan.toLowerCase(),
          billing_cycle: billingCycle,
        }),
      });

      // Log response details
      logger.info('API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Use safe JSON parsing utility
      let result;
      try {
        result = await safeJsonParse(response, 'PaymentForm-CreateSubscription');
        logger.info('Response JSON:', result);
      } catch (parseError) {
        // Convert parsing errors to user-friendly messages
        const errorMessage = parseError.message.includes('Server returned') || 
                            parseError.message.includes('Backend service') ||
                            parseError.message.includes('Authentication expired')
          ? `Payment System Error: ${parseError.message}`
          : 'Payment System Error: Unable to process server response. Please refresh the page and try again.';
        
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        logger.error('Subscription creation failed:', {
          status: response.status,
          error: result.error || result.detail || 'Unknown error',
          fullResponse: result,
        });
        throw new Error(result.error || result.detail || 'Subscription creation failed');
      }

      // Handle 3D Secure if required
      if (result.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.clientSecret
        );

        if (confirmError) {
          throw confirmError;
        }
      }

      logger.info('Subscription created successfully');
      logger.info('[PaymentForm] Tenant ID for redirect:', tenantId);
      
      // Use same backend completion API as subscription form for consistency
      try {
        logger.info('[PaymentForm] Completing payment and onboarding via unified API...');
        
        // Log current session data before completion
        console.log('🔍 [PaymentForm] Current session data BEFORE payment completion:', {
          email: user?.email,
          tenantId: tenantId,
          subscription_plan: user?.subscription_plan,
          given_name: user?.given_name,
          family_name: user?.family_name,
          first_name: user?.first_name,
          last_name: user?.last_name,
          name: user?.name
        });
        
        // Prepare the payload
        const completionPayload = {
          // Include business information (required by complete-all endpoint)
          businessName: businessInfo?.businessName || user?.businessName || 'Unnamed Business',
          businessType: businessInfo?.businessType || user?.businessType || 'Other',
          // Use same data structure as subscription form
          subscriptionPlan: plan.toLowerCase(),
          selectedPlan: plan.toLowerCase(),
          billingCycle: billingCycle,
          planType: 'paid',
          // Include user name fields from session
          given_name: user?.given_name || '',
          family_name: user?.family_name || '',
          first_name: user?.first_name || '',
          last_name: user?.last_name || '',
          // Payment verification data
          paymentVerified: true,
          paymentIntentId: result.paymentIntentId || result.clientSecret,
          subscriptionId: result.subscription?.id || result.subscriptionId,
          tenantId: tenantId,
          requestId: `payment_${Date.now()}`,
          timestamp: new Date().toISOString()
        };
        
        console.log('🔍 [PaymentForm] PAYMENT COMPLETION - Sending to complete-all:', completionPayload);
        logger.info('[PaymentForm] Sending completion payload:', completionPayload);
        
        const completePaymentResponse = await fetch('/api/onboarding/complete-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'x-csrf-token': csrfToken }),
          },
          credentials: 'include',
          body: JSON.stringify(completionPayload),
        });
        
        if (!completePaymentResponse.ok) {
          let errorData = {};
          try {
            errorData = await safeJsonParse(completePaymentResponse, 'PaymentForm-CompleteError');
          } catch (parseError) {
            // If we can't parse the error, use a generic message
            logger.error('Failed to parse error response:', parseError);
          }
          throw new Error(errorData.error || `Payment completion failed: ${completePaymentResponse.status}`);
        }
        
        const completeResult = await safeJsonParse(completePaymentResponse, 'PaymentForm-CompleteResult');
        console.log('🔍 [PaymentForm] Complete-all API response:', {
          success: completeResult.success,
          tenantId: completeResult.tenantId || completeResult.tenant_id,
          onboarding_completed: completeResult.onboarding_completed,
          needs_onboarding: completeResult.needs_onboarding,
          sessionRefreshRequired: completeResult.sessionRefreshRequired
        });
        logger.info('[PaymentForm] Payment completion successful:', completeResult);
        
        // Update tenantId if received from backend
        if (!tenantId && (completeResult.tenant_id || completeResult.tenantId)) {
          const backendTenantId = completeResult.tenant_id || completeResult.tenantId;
          setTenantId(backendTenantId);
          tenantId = backendTenantId;
        }
        
        // CRITICAL: Refresh session data to ensure DashAppBar shows correct info
        if (completeResult.sessionRefreshRequired) {
          logger.info('[PaymentForm] Refreshing session data after payment completion...');
          
          // Wait for session to be updated in backend
          const updatedSession = await waitForSessionUpdate(5, 1000);
          
          if (updatedSession) {
            console.log('🔍 [PaymentForm] Session data AFTER refresh:', {
              email: updatedSession.user?.email,
              businessName: updatedSession.user?.businessName,
              subscriptionPlan: updatedSession.user?.subscriptionPlan,
              given_name: updatedSession.user?.given_name,
              family_name: updatedSession.user?.family_name,
              first_name: updatedSession.user?.first_name,
              last_name: updatedSession.user?.last_name,
              name: updatedSession.user?.name,
              needsOnboarding: updatedSession.user?.needsOnboarding
            });
            logger.info('[PaymentForm] Session refreshed successfully:', {
              businessName: updatedSession.user?.businessName,
              subscriptionPlan: updatedSession.user?.subscriptionPlan,
              needsOnboarding: updatedSession.user?.needsOnboarding
            });
          } else {
            logger.warn('[PaymentForm] Session refresh timeout, proceeding anyway');
          }
        }
        
      } catch (error) {
        logger.error('[PaymentForm] Payment completion failed:', error);
        setError(error.message || 'Failed to complete payment. Please contact support.');
        return;
      }
      
      setSuccess(true);
      
      // Brief delay to ensure session updates are complete, then redirect
      setTimeout(() => {
        logger.info('[PaymentForm] Redirecting to dashboard after successful payment');
        
        if (tenantId) {
          const redirectUrl = `/${tenantId}/dashboard?welcome=true&payment_completed=true`;
          logger.info('[PaymentForm] Redirecting to tenant dashboard:', redirectUrl);
          window.location.href = redirectUrl;
        } else {
          logger.warn('[PaymentForm] No tenant ID available, redirecting to general dashboard');
          window.location.href = '/dashboard?welcome=true&payment_completed=true';
        }
      }, 1000); // Reduced from 3000ms to 1000ms

    } catch (err) {
      logger.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {selectedPaymentMethod === 'mpesa' ? (
            <>
              <h3 className="text-lg font-semibold text-green-800 mb-2">M-Pesa Payment Initiated!</h3>
              <p className="text-green-700 mb-2">Check your phone for the M-Pesa payment prompt</p>
              <p className="text-sm text-green-600">Enter your PIN to complete the payment</p>
              <p className="text-sm text-gray-600 mt-4">Redirecting to your dashboard...</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Successful!</h3>
              <p className="text-green-700">Redirecting to your dashboard...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Subscription</h2>
        <div className="flex items-center justify-center gap-2 text-lg">
          <span className="text-gray-600">{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</span>
          <span className="text-gray-400">•</span>
          <span className="font-semibold text-gray-900">
            {regionalPricing && regionalPricing.currency !== 'USD' ? (
              <>
                {regionalPricing.currency === 'KES' ? 'KSh' : regionalPricing.currency} {Math.round(getPrice() * (regionalPricing.exchange_info?.rate || 110))}/{billingCycle === 'monthly' ? 'month' : billingCycle === '6month' ? '6 months' : 'year'}
              </>
            ) : (
              <>${getPrice()}/{billingCycle === 'monthly' ? 'month' : billingCycle === '6month' ? '6 months' : 'year'}</>
            )}
          </span>
          {regionalPricing && regionalPricing.discount_percentage > 0 && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-green-600 font-semibold">
                {regionalPricing.discount_percentage}% OFF
              </span>
            </>
          )}
        </div>
        {regionalPricing && regionalPricing.discount_percentage > 0 && (
          <div className="mt-2">
            <span className="text-gray-500 line-through">
              Original: {regionalPricing.currency !== 'USD' ? (
                <>
                  {regionalPricing.currency === 'KES' ? 'KSh' : regionalPricing.currency} {Math.round(getOriginalPrice() * (regionalPricing.exchange_info?.rate || 110))}/{billingCycle === 'monthly' ? 'month' : billingCycle === '6month' ? '6 months' : 'year'}
                </>
              ) : (
                <>${getOriginalPrice()}/{billingCycle === 'monthly' ? 'month' : billingCycle === '6month' ? '6 months' : 'year'}</>
              )}
            </span>
          </div>
        )}
      </div>
      
      {/* Regional Discount Banner */}
      {regionalPricing && regionalPricing.discount_percentage > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🎉</span>
            <div>
              <p className="text-green-800 font-semibold">
                {regionalPricing.discount_percentage}% regional discount applied!
              </p>
              <p className="text-green-700 text-sm">
                Special pricing for businesses in {country}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Payment Method Selection */}
        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
            <p>Country: {country}</p>
            <p>Payment Methods: {JSON.stringify(paymentMethods)}</p>
            <p>Selected: {selectedPaymentMethod}</p>
            <p>Regional Pricing: {regionalPricing ? 'Yes' : 'No'}</p>
            {regionalPricing && (
              <>
                <p>Discount: {regionalPricing.discount_percentage}%</p>
                <p>Currency: {regionalPricing.currency}</p>
                <p>Exchange Rate: {regionalPricing.exchange_info?.rate || 'N/A'}</p>
                <p>Pricing Data: {JSON.stringify(regionalPricing.pricing || 'None')}</p>
                <p>Calculated Price: ${getPrice()}</p>
                <p>Original Price: ${getOriginalPrice()}</p>
              </>
            )}
          </div>
        )}
        
        {paymentMethods.length > 1 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.includes('card') && (
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('card')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    selectedPaymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="font-medium">Credit/Debit Card</p>
                  <p className="text-sm text-gray-500">Visa, Mastercard, Amex</p>
                </button>
              )}
              {paymentMethods.includes('mpesa') && (
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('mpesa')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    selectedPaymentMethod === 'mpesa'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                  <p className="font-medium">M-Pesa</p>
                  <p className="text-sm text-gray-500">Mobile Money</p>
                  {regionalPricing && regionalPricing.currency !== 'USD' && (
                    <p className="text-xs text-green-600 mt-1">
                      Pay in {regionalPricing.currency}
                    </p>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Show card form only if card payment is selected */}
        {selectedPaymentMethod === 'card' && (
          <>
        {/* Cardholder Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>

        {/* Card Number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Card Number
          </label>
          <div className="relative">
            <CardNumberElement
              options={cardElementOptions}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
              onReady={() => {
                logger.info('CardNumberElement ready');
              }}
              onChange={(e) => {
                if (e.error) {
                  setError(e.error.message);
                } else if (error && error.includes('card number')) {
                  setError(null);
                }
              }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Expiry and CVC Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expiration Date
            </label>
            <CardExpiryElement
              options={cardElementOptions}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
              onChange={(e) => {
                if (e.error) {
                  setError(e.error.message);
                } else if (error && error.includes('expir')) {
                  setError(null);
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CVC
            </label>
            <CardCvcElement
              options={cardElementOptions}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
              onChange={(e) => {
                if (e.error) {
                  setError(e.error.message);
                } else if (error && error.includes('security code')) {
                  setError(null);
                }
              }}
            />
          </div>
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="12345"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>
          </>
        )}
        
        {/* M-Pesa Payment Form */}
        {selectedPaymentMethod === 'mpesa' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter your M-Pesa registered phone number</p>
            </div>
            
            {regionalPricing && regionalPricing.currency !== 'USD' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Price in {regionalPricing.currency}:</strong> {' '}
                  {regionalPricing.currency === 'KES' ? 'KSh' : regionalPricing.currency} {' '}
                  {Math.round(getPrice() * (regionalPricing.exchange_info?.rate || 110))}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Exchange rate: 1 USD = {regionalPricing.exchange_info?.rate || 110} {regionalPricing.currency}
                </p>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">How M-Pesa payment works:</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Click "Pay with M-Pesa" below</li>
                <li>2. You'll receive a payment prompt on your phone</li>
                <li>3. Enter your M-Pesa PIN to complete payment</li>
                <li>4. You'll be redirected once payment is confirmed</li>
              </ol>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={(selectedPaymentMethod === 'card' && !stripe) || isProcessing}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all transform ${
            (selectedPaymentMethod === 'card' && !stripe) || isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : selectedPaymentMethod === 'mpesa'
              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-[0.98] shadow-lg hover:shadow-xl'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] shadow-lg hover:shadow-xl'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Payment...
            </span>
          ) : selectedPaymentMethod === 'mpesa' ? (
            `Pay with M-Pesa - ${regionalPricing?.currency === 'KES' ? 'KSh' : '$'}${regionalPricing?.currency === 'KES' ? Math.round(getPrice() * (regionalPricing.exchange_info?.rate || 110)) : getPrice()}`
          ) : (
            `Subscribe for $${getPrice()}/${billingCycle === 'monthly' ? 'mo' : billingCycle === '6month' ? '6mo' : 'yr'}`
          )}
        </button>

        {/* Security Badge */}
        <div className="flex items-center justify-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secured by Stripe
        </div>
      </div>

      {/* Footer Text */}
      <p className="mt-6 text-sm text-center text-gray-500">
        You can cancel or change your plan anytime from your dashboard.
      </p>
      
      {/* Back Button */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            // Navigate back to subscription selection with country preserved
            const countryToPass = urlCountry || country;
            router.push(`/onboarding?step=subscription${countryToPass ? `&country=${encodeURIComponent(countryToPass)}` : ''}`);
          }}
          className="text-gray-600 hover:text-gray-800 underline"
        >
          ← Back to plan selection
        </button>
      </div>
    </form>
  );
}

// Main PaymentPage component
export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing') || 'monthly';
    const countryParam = searchParams.get('country');

    logger.info('PaymentPage initialized', {
      planParam,
      billingParam,
      countryParam,
    });

    if (!planParam || planParam.toLowerCase() === 'free') {
      // Redirect to dashboard if free plan or no plan
      logger.info('Redirecting to dashboard - free plan or no plan selected');
      router.push('/dashboard');
      return;
    }

    setPlan(planParam);
    setBillingCycle(billingParam);
    setLoading(false);
  }, [searchParams, router]);

  if (loading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <DynamicStripeProvider>
        <PaymentForm plan={plan} billingCycle={billingCycle} urlCountry={searchParams.get('country')} />
      </DynamicStripeProvider>
    </div>
  );
}