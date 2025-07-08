'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TaxSettingsWizard from '@/app/dashboard/components/forms/TaxSettingsWizard';

export default function TaxSetupPage() {
  const router = useRouter();
  
  const handleNavigate = (destination) => {
    if (destination === 'taxFiling') {
      router.push('/dashboard/taxes/filing');
    } else {
      router.push('/dashboard');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <TaxSettingsWizard onNavigate={handleNavigate} />
    </div>
  );
}