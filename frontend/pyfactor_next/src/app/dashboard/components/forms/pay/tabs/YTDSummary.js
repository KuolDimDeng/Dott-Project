'use client';

import React from 'react';

const YTDSummary = ({ ytdSummary }) => {
  if (!ytdSummary) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No YTD data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Year-to-date summary information could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Calculate percentages for the deduction breakdown
  const totalDeductions = 
    ytdSummary.federalTax + 
    ytdSummary.stateTax + 
    ytdSummary.medicare + 
    ytdSummary.socialSecurity + 
    ytdSummary.retirement401k + 
    ytdSummary.healthInsurance + 
    (ytdSummary.otherDeductions || 0);
  
  const calculatePercentage = (amount) => {
    return ((amount / ytdSummary.grossPay) * 100).toFixed(1);
  };
  
  // For the progress bar
  const netPayPercentage = ((ytdSummary.netPay / ytdSummary.grossPay) * 100).toFixed(1);
  const deductionsPercentage = ((totalDeductions / ytdSummary.grossPay) * 100).toFixed(1);
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Year-to-Date Pay Summary
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Summary of your earnings and deductions for the current year
          </p>
        </div>
        
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">YTD Gross Pay</div>
              <div className="mt-1 text-2xl font-semibold text-blue-600">
                {formatCurrency(ytdSummary.grossPay)}
              </div>
              <div className="mt-1 text-sm text-gray-500">Total earnings before deductions</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">YTD Deductions</div>
              <div className="mt-1 text-2xl font-semibold text-red-600">
                {formatCurrency(totalDeductions)}
              </div>
              <div className="mt-1 text-sm text-gray-500">Total taxes and benefit deductions</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">YTD Net Pay</div>
              <div className="mt-1 text-2xl font-semibold text-green-600">
                {formatCurrency(ytdSummary.netPay)}
              </div>
              <div className="mt-1 text-sm text-gray-500">Total take-home pay</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-gray-700">Gross Pay to Net Pay Ratio</span>
              <span className="text-gray-500">{netPayPercentage}% of gross pay is net pay</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-green-600 h-4 rounded-full" 
                style={{ width: `${netPayPercentage}%` }}
              >
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              YTD Tax Deductions
            </h3>
          </div>
          
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Federal Income Tax</span>
                  <span className="text-gray-900">{formatCurrency(ytdSummary.federalTax)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${calculatePercentage(ytdSummary.federalTax)}%` }}
                  >
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">
                  {calculatePercentage(ytdSummary.federalTax)}% of gross pay
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">State Income Tax</span>
                  <span className="text-gray-900">{formatCurrency(ytdSummary.stateTax)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full" 
                    style={{ width: `${calculatePercentage(ytdSummary.stateTax)}%` }}
                  >
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">
                  {calculatePercentage(ytdSummary.stateTax)}% of gross pay
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Medicare</span>
                  <span className="text-gray-900">{formatCurrency(ytdSummary.medicare)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${calculatePercentage(ytdSummary.medicare)}%` }}
                  >
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">
                  {calculatePercentage(ytdSummary.medicare)}% of gross pay
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Social Security</span>
                  <span className="text-gray-900">{formatCurrency(ytdSummary.socialSecurity)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full" 
                    style={{ width: `${calculatePercentage(ytdSummary.socialSecurity)}%` }}
                  >
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">
                  {calculatePercentage(ytdSummary.socialSecurity)}% of gross pay
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700">Total Tax Deductions</span>
                <span className="text-gray-900">
                  {formatCurrency(ytdSummary.federalTax + ytdSummary.stateTax + ytdSummary.medicare + ytdSummary.socialSecurity)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              YTD Benefit Deductions
            </h3>
          </div>
          
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">401(k) Retirement</span>
                  <span className="text-gray-900">{formatCurrency(ytdSummary.retirement401k)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full" 
                    style={{ width: `${calculatePercentage(ytdSummary.retirement401k)}%` }}
                  >
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">
                  {calculatePercentage(ytdSummary.retirement401k)}% of gross pay
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Health Insurance</span>
                  <span className="text-gray-900">{formatCurrency(ytdSummary.healthInsurance)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${calculatePercentage(ytdSummary.healthInsurance)}%` }}
                  >
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">
                  {calculatePercentage(ytdSummary.healthInsurance)}% of gross pay
                </div>
              </div>
              
              {ytdSummary.otherDeductions > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">Other Deductions</span>
                    <span className="text-gray-900">{formatCurrency(ytdSummary.otherDeductions)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full" 
                      style={{ width: `${calculatePercentage(ytdSummary.otherDeductions)}%` }}
                    >
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-right mt-1">
                    {calculatePercentage(ytdSummary.otherDeductions)}% of gross pay
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700">Total Benefit Deductions</span>
                <span className="text-gray-900">
                  {formatCurrency(ytdSummary.retirement401k + ytdSummary.healthInsurance + (ytdSummary.otherDeductions || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            YTD Gross to Net Pay Breakdown
          </h3>
        </div>
        
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">Gross Pay Allocation</div>
              <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                <div 
                  className="bg-green-600 h-full flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${netPayPercentage}%` }}
                >
                  Net Pay {netPayPercentage}%
                </div>
                <div 
                  className="bg-red-500 h-full flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${deductionsPercentage}%` }}
                >
                  Deductions {deductionsPercentage}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">YTD Pay Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pay Periods</span>
                    <span className="text-gray-900">
                      {(ytdSummary.grossPay / (ytdSummary.grossPay / 26 * 2)).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Average Gross Per Period</span>
                    <span className="text-gray-900">
                      {formatCurrency(ytdSummary.grossPay / (ytdSummary.grossPay / 26 * 2))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Average Net Per Period</span>
                    <span className="text-gray-900">
                      {formatCurrency(ytdSummary.netPay / (ytdSummary.grossPay / 26 * 2))}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">YTD Percentages</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Federal Tax Rate</span>
                    <span className="text-gray-900">
                      {(ytdSummary.federalTax / ytdSummary.grossPay * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Tax Rate</span>
                    <span className="text-gray-900">
                      {((ytdSummary.federalTax + ytdSummary.stateTax) / ytdSummary.grossPay * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Deduction Rate</span>
                    <span className="text-gray-900">
                      {(totalDeductions / ytdSummary.grossPay * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YTDSummary;