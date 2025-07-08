'use client';

import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/i18n';

import { useEffect } from 'react';
import { initializeCountryDetection } from '@/services/countryDetectionService';
import AppBar from '@/app/components/AppBar';
import Hero from '@/app/components/Hero';
import Features from '@/app/components/Features';
import Highlights from '@/app/components/Highlights';
// import Pricing from '@/app/components/Pricing';
import GeoPricing from '@/components/pricing/GeoPricing';
import FAQ from '@/app/components/FAQ';
import ContactForm from '@/app/components/ContactForm';
import Footer from '@/app/components/Footer';
import CookieBanner from '@/components/Cookie/CookieBanner';

// Add a function to clear tenant data
const clearTenantData = () => {
  // Clear specific tenant cookies
  document.cookie = 'tenantId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'businessid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Clear localStorage tenant references
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tenantId');
    localStorage.removeItem('businessid');
    localStorage.removeItem('selectedTenant');
  }
  
  console.log('Tenant data cleared successfully');
};

export default function Home() {
  // Run the cleanup on page load
  useEffect(() => {
    // Initialize country detection for dynamic pricing and language
    async function initCountryDetection() {
      try {
        const { country, language, isDeveloping } = await initializeCountryDetection();
        console.log('✅ Country detection initialized:', { country, language, isDeveloping });
        
        // Check if user has manually selected a language before
        const userSelectedLanguage = localStorage.getItem('i18nextLng');
        const userDidManuallySelect = localStorage.getItem('userManuallySelectedLanguage');
        
        // If no manual selection (user actually clicked the dropdown), set language based on country
        if (!userSelectedLanguage || userDidManuallySelect !== 'true') {
          console.log(`🌐 Setting language to ${language} based on country ${country}`);
          i18nInstance.changeLanguage(language);
        } else {
          console.log(`🌐 User has manually selected language: ${userSelectedLanguage}, respecting their choice`);
        }
      } catch (error) {
        console.error('❌ Error initializing country detection:', error);
      }
    }
    
    initCountryDetection();
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset') === 'true';
    
    if (isReset) {
      clearTenantData();
      console.log('Reset completed, tenant data cleared');
    }
    
    // Check for the deleted tenant ID
    const hasBadTenantId = 
      localStorage.getItem('tenantId') === 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102' ||
      document.cookie.includes('tenantId=e53b800b-c4e1-5fd1-abc6-ba3a785c0102') ||
      document.cookie.includes('businessid=e53b800b-c4e1-5fd1-abc6-ba3a785c0102');
    
    if (hasBadTenantId) {
      clearTenantData();
      console.log('Deleted tenant detected and cleared');
    }
  }, []);

  return (
    <>
    <I18nextProvider i18n={i18nInstance}>
      <main className="min-h-screen">
      {/* NavBar */}
      <div className="sticky top-0 z-50 bg-white">
        <AppBar />
      </div>
      
      {/* Hero Section - Light blue gradient background */}
      <div className="bg-gradient-to-b from-blue-50 to-white">
        <Hero />
      </div>
      
      {/* Features Section - Light neutral background */}
      <div className="bg-gray-50">
        <Features />
      </div>
      
      {/* Highlights Section - Soft purple background */}
      <div className="bg-purple-50">
        <Highlights />
      </div>
      
      
      {/* Pricing Section - Light cyan background */}
      <div className="bg-cyan-50">
        <GeoPricing />
      </div>
      
      {/* FAQ Section - Light amber background */}
      <div className="bg-amber-50">
        <FAQ />
      </div>
      
      {/* Contact Form Section - Light green background */}
      <div className="bg-green-50">
        <ContactForm />
      </div>
      
      {/* Footer */}
      <div className="bg-white">
        <Footer />
      </div>
      
      {/* Cookie Banner */}
      <CookieBanner />
    </main>
    </I18nextProvider>
    </>
  );
}
