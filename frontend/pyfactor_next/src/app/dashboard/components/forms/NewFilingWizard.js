'use client';

import React, { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

const NewFilingWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    filingType: '',
    period: '',
    documents: [],
    review: false,
    submit: false
  });

  const steps = [
    'Select Filing Type',
    'Choose Period',
    'Upload Documents',
    'Review',
    'Submit'
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => Math.min(prevStep + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0));
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      filingType: '',
      period: '',
      documents: [],
      review: false,
      submit: false
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8">New Tax Filing Wizard</h1>
      
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${index < activeStep 
                    ? 'bg-green-600 text-white' 
                    : index === activeStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'}
                `}>
                  {index < activeStep ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-sm mt-2 text-center">{label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  h-1 w-24 mx-2
                  ${index < activeStep ? 'bg-green-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-6 min-h-[300px]">
        {activeStep === 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Filing Type</h2>
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="radio" 
                  name="filingType" 
                  value="sales-tax"
                  onChange={(e) => setFormData({...formData, filingType: e.target.value})}
                  className="mr-3"
                />
                <span>Sales Tax Return</span>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="radio" 
                  name="filingType" 
                  value="payroll-tax"
                  onChange={(e) => setFormData({...formData, filingType: e.target.value})}
                  className="mr-3"
                />
                <span>Payroll Tax Return</span>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="radio" 
                  name="filingType" 
                  value="income-tax"
                  onChange={(e) => setFormData({...formData, filingType: e.target.value})}
                  className="mr-3"
                />
                <span>Income Tax Return</span>
              </label>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Choose Filing Period</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">
                Drag and drop your documents here, or click to browse
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Browse Files
              </button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Review Your Filing</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Filing Type</p>
                <p className="font-medium">{formData.filingType || 'Not selected'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Period</p>
                <p className="font-medium">{formData.period || 'Not selected'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="font-medium">{formData.documents.length} files uploaded</p>
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="text-center py-8">
            <CheckIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Filing Complete!</h2>
            <p className="text-gray-600">
              Your tax filing has been submitted successfully.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={activeStep === 0}
          className={`
            px-4 py-2 rounded-md font-medium
            ${activeStep === 0 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
          `}
        >
          Back
        </button>
        
        <div className="space-x-3">
          {activeStep === steps.length - 1 ? (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Start New Filing
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewFilingWizard;
