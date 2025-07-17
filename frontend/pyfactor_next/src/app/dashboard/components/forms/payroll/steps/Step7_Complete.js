'use client';

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

function Step7_Complete({ wizardData, updateWizardData, onPrevious, isLastStep }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Payroll Complete!</h3>
        <p className="mt-1 text-sm text-gray-500">
          Payroll has been successfully processed
        </p>
      </div>
      
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900">Summary</h4>
        <ul className="mt-2 space-y-1 text-sm text-green-700">
          <li>• {wizardData.selectedEmployees?.length || 0} employees paid</li>
          <li>• Total payroll amount: ${wizardData.summary?.totalGrossPay?.toFixed(2) || '0.00'}</li>
          <li>• Pay date: {wizardData.payPeriod?.payDate || 'N/A'}</li>
        </ul>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={() => window.location.href = '/dashboard/payroll'}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          View Payroll History
        </button>
      </div>
    </div>
  );
}

export default Step7_Complete;