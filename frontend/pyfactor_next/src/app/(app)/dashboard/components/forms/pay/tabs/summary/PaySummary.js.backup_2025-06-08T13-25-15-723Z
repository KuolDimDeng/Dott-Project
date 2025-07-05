'use client';

import React, { useState, useEffect } from 'react';
import SummaryCard from './SummaryCard';

// Icons for the summary cards
const PaycheckIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
  </svg>
);

const TaxIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"></path>
  </svg>
);

const YtdIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
  </svg>
);

const BenefitsIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
  </svg>
);

/**
 * PaySummary Component
 * Displays a summary of employee's pay information
 */
const PaySummary = ({ employeeId }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulated API call to fetch pay summary data
    const fetchPaySummary = async () => {
      try {
        setLoading(true);
        
        // In a real application, this would be an API call
        // await fetch(`/api/employees/${employeeId}/pay-summary`)
        
        // Simulating API response
        const response = {
          status: 'success',
          data: {
            nextPaycheck: {
              amount: 3250.75,
              date: '2023-11-15',
              details: [
                { label: 'Gross Pay', value: 4500.00 },
                { label: 'Federal Tax', value: -850.25 },
                { label: 'State Tax', value: -225.00 },
                { label: 'Benefits', value: -174.00 }
              ]
            },
            taxWithholding: {
              amount: 1075.25,
              trendPercent: -2.5,
              details: [
                { label: 'Federal Tax', value: 850.25 },
                { label: 'State Tax', value: 225.00 }
              ]
            },
            ytdEarnings: {
              amount: 45500.00,
              trendPercent: 5.2,
              details: [
                { label: 'Base Salary', value: 42500.00 },
                { label: 'Bonuses', value: 3000.00 }
              ]
            },
            benefits: {
              amount: 174.00,
              details: [
                { label: 'Health Insurance', value: 125.00 },
                { label: '401(k)', value: 49.00 }
              ]
            }
          }
        };
        
        // Simulate network delay
        setTimeout(() => {
          setSummaryData(response.data);
          setLoading(false);
        }, 800);
      } catch (err) {
        setError('Error fetching pay summary data');
        setLoading(false);
      }
    };

    fetchPaySummary();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Pay Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          title="Next Paycheck"
          amount={summaryData.nextPaycheck.amount}
          date={summaryData.nextPaycheck.date}
          icon={<PaycheckIcon />}
          details={summaryData.nextPaycheck.details}
        />
        
        <SummaryCard
          title="Tax Withholding"
          amount={summaryData.taxWithholding.amount}
          showTrend={true}
          trendPercent={summaryData.taxWithholding.trendPercent}
          icon={<TaxIcon />}
          details={summaryData.taxWithholding.details}
        />
        
        <SummaryCard
          title="YTD Earnings"
          amount={summaryData.ytdEarnings.amount}
          showTrend={true}
          trendPercent={summaryData.ytdEarnings.trendPercent}
          icon={<YtdIcon />}
          details={summaryData.ytdEarnings.details}
        />
        
        <SummaryCard
          title="Benefits Deductions"
          amount={summaryData.benefits.amount}
          icon={<BenefitsIcon />}
          details={summaryData.benefits.details}
        />
      </div>
    </div>
  );
};

export default PaySummary; 