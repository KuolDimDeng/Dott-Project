'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';

export default function TestOnboardingData() {
  const { user } = useSession();
  const [businessInfo, setBusinessInfo] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState(null);
  
  useEffect(() => {
    // Get business info
    const fetchData = async () => {
      try {
        // Get business info
        const bizResponse = await fetch('/api/onboarding/business-info');
        if (bizResponse.ok) {
          const bizData = await bizResponse.json();
          setBusinessInfo(bizData);
          
          // If we have a country, fetch pricing
          if (bizData.country) {
            const countryCode = bizData.country.length === 2 ? bizData.country : 'KE';
            
            // Fetch pricing
            const pricingResponse = await fetch(`/api/pricing/by-country?country=${countryCode}`);
            const pricingData = await pricingResponse.json();
            setPricingData(pricingData);
            
            // Fetch payment methods
            const paymentResponse = await fetch(`/api/payment-methods/available?country=${countryCode}`);
            const paymentData = await paymentResponse.json();
            setPaymentMethods(paymentData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user]);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Onboarding Data Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">User Data</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Business Info</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(businessInfo, null, 2)}
          </pre>
          {businessInfo && (
            <div className="mt-2 text-sm">
              <p>Country: {businessInfo.country} (type: {typeof businessInfo.country})</p>
              <p>Is 2-letter code: {businessInfo.country?.length === 2 ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
        
        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Pricing Data</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(pricingData, null, 2)}
          </pre>
          {pricingData && (
            <div className="mt-2 text-sm">
              <p>Country: {pricingData.country_code}</p>
              <p>Discount: {pricingData.discount_percentage}%</p>
              <p>Currency: {pricingData.currency}</p>
            </div>
          )}
        </div>
        
        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Payment Methods</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(paymentMethods, null, 2)}
          </pre>
          {paymentMethods && (
            <div className="mt-2 text-sm">
              <p>Available methods: {paymentMethods.methods?.join(', ')}</p>
              <p>Has M-Pesa: {paymentMethods.methods?.includes('mpesa') ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}