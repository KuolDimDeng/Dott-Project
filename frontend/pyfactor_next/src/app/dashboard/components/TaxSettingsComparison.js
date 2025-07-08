'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  CogIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function TaxSettingsComparison() {
  const router = useRouter();
  
  const oldApproachIssues = [
    'All fields shown at once - overwhelming',
    'Claude gets all data in one request - less focused',
    'No clear progression or guidance',
    'Easy to miss important fields',
    'No intermediate saves - risk of data loss'
  ];
  
  const newApproachBenefits = [
    'Step-by-step process - easy to follow',
    'Claude focuses on one topic at a time',
    'Clear progression with visual indicators',
    'Contextual help at each step',
    'Auto-saves progress after each step'
  ];
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tax Settings Configuration</h1>
        <p className="text-lg text-gray-600">Choose your preferred setup method</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Old Approach */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CogIcon className="h-6 w-6 mr-2 text-gray-600" />
              Classic Form (Current)
            </h2>
            <p className="text-gray-600 mt-2">All fields in one long form</p>
          </div>
          
          <div className="space-y-3 mb-6">
            {oldApproachIssues.map((issue, index) => (
              <div key={index} className="flex items-start">
                <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{issue}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => router.push('/dashboard/settings/tax')}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Use Classic Form
          </button>
        </div>
        
        {/* New Approach */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-6 relative">
          <div className="absolute -top-3 -right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            Recommended
          </div>
          
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <SparklesIcon className="h-6 w-6 mr-2 text-blue-600" />
              Step-by-Step Wizard (New)
            </h2>
            <p className="text-gray-600 mt-2">Guided setup with AI assistance</p>
          </div>
          
          <div className="space-y-3 mb-6">
            {newApproachBenefits.map((benefit, index) => (
              <div key={index} className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => router.push('/dashboard/tax-setup')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            Start Wizard
            <ArrowRightIcon className="h-5 w-5 ml-2" />
          </button>
        </div>
      </div>
      
      {/* How the Wizard Works */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How the Step-by-Step Wizard Works</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { step: 1, title: 'Business Info', desc: 'Location & contact details' },
            { step: 2, title: 'Tax Rates', desc: 'AI suggests rates for your area' },
            { step: 3, title: 'Benefits', desc: 'Insurance & payroll taxes' },
            { step: 4, title: 'Filing Info', desc: 'Deadlines & websites' },
            { step: 5, title: 'Review', desc: 'Confirm all settings' }
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                {item.step}
              </div>
              <p className="font-medium text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <SparklesIcon className="h-4 w-4 inline mr-1" />
            <strong>AI Advantage:</strong> At each step, Claude AI analyzes your specific location and business type 
            to provide accurate, focused suggestions. This step-by-step approach gives Claude better context, 
            resulting in more accurate tax information.
          </p>
        </div>
      </div>
    </div>
  );
}