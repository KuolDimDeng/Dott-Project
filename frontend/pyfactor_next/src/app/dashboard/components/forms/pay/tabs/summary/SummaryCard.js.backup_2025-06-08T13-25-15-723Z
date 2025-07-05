'use client';

import React from 'react';

/**
 * SummaryCard Component
 * Displays a summary of pay information in a card format
 */
const SummaryCard = ({ title, amount, date, showTrend = false, trendPercent = 0, icon, details = [] }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const renderTrend = () => {
    if (!showTrend) return null;
    
    const isPositive = trendPercent >= 0;
    const trendClass = isPositive ? 'text-green-600' : 'text-red-600';
    const arrowIcon = isPositive ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
      </svg>
    );
    
    return (
      <div className={`flex items-center ${trendClass}`}>
        {arrowIcon}
        <span className="ml-1 text-sm font-medium">
          {Math.abs(trendPercent)}%
        </span>
      </div>
    );
  };
  
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {typeof amount === 'number' ? formatCurrency(amount) : amount}
              </div>
              <div className="ml-2">
                {renderTrend()}
              </div>
            </dd>
            {date && (
              <div className="text-sm text-gray-500 mt-1">
                {formatDate(date)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {details.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <div className="space-y-1">
              {details.map((detail, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-500">{detail.label}</span>
                  <span className="text-gray-900 font-medium">
                    {typeof detail.value === 'number' ? formatCurrency(detail.value) : detail.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryCard; 