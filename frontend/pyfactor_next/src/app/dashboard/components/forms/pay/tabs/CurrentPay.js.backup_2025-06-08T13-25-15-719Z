'use client';

import React from 'react';
import { format } from 'date-fns';

const CurrentPay = ({ currentPay }) => {
  if (!currentPay) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pay data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Current pay information could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currentPay.currency || 'USD'
    }).format(amount);
  };
  
  // Calculate percentages for deduction breakdown chart
  const totalDeductions = Object.values(currentPay.deductions).reduce((sum, amount) => sum + amount, 0);
  const getDeductionPercentage = (amount) => {
    return (amount / totalDeductions * 100).toFixed(1);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Current Pay Summary
          </h3>
        </div>
        
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-500">Next Pay Date</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {format(new Date(currentPay.nextPayDate), 'MMM dd, yyyy')}
              </div>
              <div className="mt-1 text-sm text-gray-500">{currentPay.payPeriod}</div>
            </div>
            
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-500">Gross Pay</div>
              <div className="mt-1 text-2xl font-semibold text-blue-600">
                {formatCurrency(currentPay.grossPay)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {currentPay.regularHours} regular hours {currentPay.overtimeHours > 0 && `+ ${currentPay.overtimeHours} overtime`}
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-500">Net Pay</div>
              <div className="mt-1 text-2xl font-semibold text-green-600">
                {formatCurrency(currentPay.netPay)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                After taxes and deductions
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Deductions Breakdown
            </h3>
          </div>
          
          <div className="px-6 py-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium text-gray-900">
                Gross Pay
              </div>
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(currentPay.grossPay)}
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Taxes
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="text-gray-500">Federal Income Tax</div>
                  <div className="text-gray-900">-{formatCurrency(currentPay.deductions.federalTax)}</div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="text-gray-500">State Income Tax</div>
                  <div className="text-gray-900">-{formatCurrency(currentPay.deductions.stateTax)}</div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="text-gray-500">Medicare</div>
                  <div className="text-gray-900">-{formatCurrency(currentPay.deductions.medicare)}</div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="text-gray-500">Social Security</div>
                  <div className="text-gray-900">-{formatCurrency(currentPay.deductions.socialSecurity)}</div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Benefits & Other Deductions
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="text-gray-500">401(k) Retirement</div>
                  <div className="text-gray-900">-{formatCurrency(currentPay.deductions.retirement401k)}</div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="text-gray-500">Health Insurance</div>
                  <div className="text-gray-900">-{formatCurrency(currentPay.deductions.healthInsurance)}</div>
                </div>
                
                {currentPay.deductions.otherDeductions > 0 && (
                  <div className="flex justify-between text-sm">
                    <div className="text-gray-500">Other Deductions</div>
                    <div className="text-gray-900">-{formatCurrency(currentPay.deductions.otherDeductions)}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
              <div className="text-sm font-medium text-gray-900">
                Net Pay
              </div>
              <div className="text-sm font-medium text-green-600">
                {formatCurrency(currentPay.netPay)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Deductions Visualization
            </h3>
          </div>
          
          <div className="px-6 py-5">
            <div className="text-sm text-gray-500 mb-4">
              This chart shows how your deductions are distributed
            </div>
            
            {/* Simplified donut chart visualization */}
            <div className="relative h-64 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(totalDeductions)}
                  </div>
                  <div className="text-sm text-gray-500">Total Deductions</div>
                </div>
              </div>
              
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="12" />
                
                {/* SVG segments for each deduction type with stroke-dasharray and stroke-dashoffset for donut slices */}
                {Object.entries(currentPay.deductions).reduce((acc, [key, value], index, array) => {
                  // Calculate cumulative percentages for positioning
                  const previousPercentage = array
                    .slice(0, index)
                    .reduce((sum, [, deductionValue]) => sum + (deductionValue / totalDeductions * 100), 0);
                  
                  const percentage = value / totalDeductions * 100;
                  const offset = 251.2 - (previousPercentage * 251.2 / 100);
                  const dashArray = (percentage * 251.2 / 100) + ' ' + (251.2 - percentage * 251.2 / 100);
                  
                  // Color mapping
                  const colors = {
                    federalTax: '#3b82f6', // blue
                    stateTax: '#60a5fa', // light blue
                    medicare: '#10b981', // green
                    socialSecurity: '#34d399', // light green
                    retirement401k: '#f59e0b', // amber
                    healthInsurance: '#fbbf24', // yellow
                    otherDeductions: '#d1d5db', // gray
                  };
                  
                  return [
                    ...acc,
                    <circle 
                      key={key}
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke={colors[key] || '#d1d5db'} 
                      strokeWidth="12" 
                      strokeDasharray={dashArray}
                      strokeDashoffset={offset}
                      transform="rotate(-90 50 50)"
                    />
                  ];
                }, [])}
              </svg>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Federal Tax ({getDeductionPercentage(currentPay.deductions.federalTax)}%)</span>
              </div>
              
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-300 rounded-full mr-2"></div>
                <span className="text-gray-600">State Tax ({getDeductionPercentage(currentPay.deductions.stateTax)}%)</span>
              </div>
              
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                <span className="text-gray-600">Medicare ({getDeductionPercentage(currentPay.deductions.medicare)}%)</span>
              </div>
              
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-600">Social Security ({getDeductionPercentage(currentPay.deductions.socialSecurity)}%)</span>
              </div>
              
              <div className="flex items-center">
                <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                <span className="text-gray-600">401(k) ({getDeductionPercentage(currentPay.deductions.retirement401k)}%)</span>
              </div>
              
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                <span className="text-gray-600">Health Insurance ({getDeductionPercentage(currentPay.deductions.healthInsurance)}%)</span>
              </div>
              
              {currentPay.deductions.otherDeductions > 0 && (
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                  <span className="text-gray-600">Other ({getDeductionPercentage(currentPay.deductions.otherDeductions)}%)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Net Pay Distribution
          </h3>
        </div>
        
        <div className="px-6 py-5">
          <div className="text-sm text-gray-500 mb-4">
            Here's how your net pay will be distributed
          </div>
          
          <div className="border rounded-lg border-gray-200 overflow-hidden">
            <div className="px-4 py-4 sm:px-6 flex justify-between items-center bg-gray-50">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Direct Deposit</h4>
                <p className="text-xs text-gray-500">
                  {currentPay.deposit?.bankName || 'Your Bank'} {currentPay.deposit?.accountType || 'Account'} (****{currentPay.deposit?.accountLastFour || '1234'})
                </p>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(currentPay.netPay)}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>
              Your pay will be deposited on {format(new Date(currentPay.nextPayDate), 'EEEE, MMMM d, yyyy')}.
            </p>
            <p className="mt-2">
              You can update your direct deposit information in the Deposit tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentPay; 