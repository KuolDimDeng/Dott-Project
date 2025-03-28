// src/app/dashboard/components/taxes/SelfServiceGuide.js
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const SelfServiceGuide = ({ payrollRunId, countryCode }) => {
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (countryCode) {
      fetchComplianceData(countryCode);
    }
  }, [countryCode]);

  const fetchComplianceData = async (country) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/taxes/global-compliance/${country}/`);
      setComplianceData(response.data);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleDownloadReport = async () => {
    try {
      // Download a PDF report for self-service filing
      const response = await axiosInstance.get(`/api/payroll/runs/${payrollRunId}/report/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-report-${payrollRunId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (loading) {
    return <p className="text-gray-700 dark:text-gray-300">Loading compliance data...</p>;
  }

  if (!complianceData) {
    return <p className="text-gray-700 dark:text-gray-300">No compliance data available for {countryCode}</p>;
  }

  const steps = [
    {
      label: 'Gather Payroll Information',
      description: 'Download your payroll reports and employee payment details.',
      content: (
        <div className="mt-4">
          <button
            className="inline-flex items-center px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 mb-4"
            onClick={handleDownloadReport}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download Payroll Report
          </button>
          
          <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
            This report contains all the information you need to pay your employees and file taxes.
          </div>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Important Information</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Filing Frequency: {complianceData.filing_frequency}
            </p>
            {complianceData.special_considerations && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                Special Notes: {complianceData.special_considerations}
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      label: 'Pay Your Employees',
      description: 'Process payments to your employees using your local banking system.',
      content: (
        <div className="mt-4">
          <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
            Use the net pay amounts from your payroll report to pay your employees through your preferred payment method.
          </div>
          
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
            Common Payment Methods in {countryCode}:
          </h3>
          
          <ul className="space-y-2 mb-4">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-primary-main dark:text-primary-light mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">Direct Bank Transfer</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-primary-main dark:text-primary-light mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">Local Payment Apps</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-primary-main dark:text-primary-light mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">Check/Cheque (if applicable)</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      label: 'Submit Tax Payments',
      description: 'Pay required taxes to the appropriate tax authorities.',
      content: (
        <div className="mt-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
            Tax Authorities in {countryCode}:
          </h3>
          
          {complianceData.tax_authorities && complianceData.tax_authorities.map((authority, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">{authority.name}</h4>
              {authority.website && (
                <a 
                  href={authority.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center mt-2 text-primary-main hover:text-primary-dark dark:text-primary-light dark:hover:text-primary-light/80"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Visit Website
                </a>
              )}
            </div>
          ))}
          
          <div className="p-4 mt-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800">
            Remember to keep records of all tax payments for at least 7 years for audit purposes.
          </div>
        </div>
      )
    },
    {
      label: 'File Tax Returns',
      description: 'Submit the required tax filings to authorities.',
      content: (
        <div className="mt-4">
          <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
            Use the information from your payroll report to complete the required tax filings.
          </div>
          
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
            Filing Schedule:
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {complianceData.filing_frequency === 'monthly' ? 'File monthly, typically due by the 15th of the following month.' : 
             complianceData.filing_frequency === 'quarterly' ? 'File quarterly, typically due by the 15th of the month following the end of each quarter.' :
             'File according to local requirements.'}
          </p>
          
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
            Additional Resources:
          </h3>
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 mb-2"
            onClick={() => window.open(`/dashboard/taxes/compliance-guide/${countryCode}`)}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            View Detailed Compliance Guide
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
        Self-Service Payroll Guide for {complianceData.country}
      </h1>
      
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6"></div>
      
      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.label} className="mb-8">
            <div className="flex items-start mb-2">
              <div className="flex-shrink-0 mr-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  activeStep === index 
                    ? 'bg-primary-main text-white' 
                    : activeStep > index 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {activeStep > index ? (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-full ml-3.5 -mb-8 ${
                    activeStep > index ? 'bg-primary-main' : 'bg-gray-200 dark:bg-gray-700'
                  }`}></div>
                )}
              </div>
              <div className={`pt-1 ${activeStep !== index ? 'opacity-75' : ''}`}>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{step.label}</h3>
                {activeStep === index && (
                  <>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">{step.description}</p>
                    {step.content}
                    <div className="mt-4 flex space-x-2">
                      <button
                        className="px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
                        onClick={handleNext}
                      >
                        {index === steps.length - 1 ? 'Finish' : 'Continue'}
                      </button>
                      <button
                        className={`px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 ${
                          index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={handleBack}
                        disabled={index === 0}
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {activeStep === steps.length && (
          <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <p className="text-gray-700 dark:text-gray-300 mb-4">All steps completed - you&apos;re all set!</p>
            <button 
              onClick={() => setActiveStep(0)}
              className="px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfServiceGuide;