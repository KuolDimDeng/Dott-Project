'use client';

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

function Step4_ReviewPayroll({ wizardData, updateWizardData, onNext, onPrevious }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Review & Approve</h3>
        <p className="mt-1 text-sm text-gray-500">
          Review calculations and approve payroll for processing
        </p>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default Step4_ReviewPayroll;