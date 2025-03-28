// src/app/dashboard/components/Reports.js
import React, { useState } from 'react';
import ReportDisplay from '../forms/ReportDisplay';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState(null);

  const handleReportSelect = (reportType) => {
    setSelectedReport(reportType);
  };

  return (
    <div className="grid gap-6">
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-around flex-wrap gap-4">
          <button 
            className="px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
            onClick={() => handleReportSelect('balance_sheet')}
          >
            Balance Sheet
          </button>
          <button 
            className="px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
            onClick={() => handleReportSelect('cash_flow')}
          >
            Cash Flow
          </button>
          <button 
            className="px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
            onClick={() => handleReportSelect('income_statement')}
          >
            Income Statement
          </button>
        </div>
      </div>
      <div className="w-full">
        {selectedReport ? (
          <ReportDisplay reportType={selectedReport} />
        ) : (
          <h2 className="text-lg font-semibold text-center text-gray-700 dark:text-gray-300">
            Select a report type to view
          </h2>
        )}
      </div>
    </div>
  );
};

export default Reports;
