'use client';

import React, { useState, useEffect } from 'react';

/**
 * PayrollHistory Component
 * Displays historical payroll information for HR managers and owners
 */
const PayrollHistory = () => {
  const [loading, setLoading] = useState(true);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  
  // Load payroll history data
  useEffect(() => {
    const fetchPayrollHistory = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Generate sample data for the last 12 pay periods
          const currentYear = new Date().getFullYear();
          const sampleData = [];
          
          for (let i = 0; i < 12; i++) {
            const month = 11 - (i % 12);
            const year = currentYear - Math.floor(i / 12);
            const day = i % 2 === 0 ? 15 : 30;
            
            // Adjust for February
            const payDate = month === 1 && day === 30 ? `${year}-02-28` : `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            sampleData.push({
              id: `PR${year}${(month + 1).toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`,
              payPeriodStart: month === 0 && day === 30 ? `${year-1}-12-16` : 
                             day === 15 ? `${year}-${(month + 1).toString().padStart(2, '0')}-01` : 
                             `${year}-${(month + 1).toString().padStart(2, '0')}-16`,
              payPeriodEnd: day === 15 ? `${year}-${(month + 1).toString().padStart(2, '0')}-15` : 
                           month === 11 ? `${year}-12-31` : 
                           `${year}-${(month + 2).toString().padStart(2, '0')}-15`,
              payDate,
              totalGross: 370000 + Math.floor(Math.random() * 10000),
              totalNet: 280000 + Math.floor(Math.random() * 8000),
              totalTaxes: 55000 + Math.floor(Math.random() * 2000),
              totalDeductions: 35000 + Math.floor(Math.random() * 1500),
              employeeCount: 140 + Math.floor(Math.random() * 5),
              status: 'Completed',
              isReconciled: i < 10
            });
          }
          
          setPayrollHistory(sampleData);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[PayrollHistory] Error fetching history:', error);
        setLoading(false);
      }
    };
    
    fetchPayrollHistory();
  }, []);
  
  // Filter payroll history based on selected year and period
  const filteredHistory = payrollHistory.filter(item => {
    const payrollYear = new Date(item.payDate).getFullYear();
    const payrollMonth = new Date(item.payDate).getMonth();
    
    const yearMatch = payrollYear === selectedYear;
    
    if (selectedPeriod === 'all') {
      return yearMatch;
    } else if (selectedPeriod === 'q1') {
      return yearMatch && payrollMonth < 3;
    } else if (selectedPeriod === 'q2') {
      return yearMatch && payrollMonth >= 3 && payrollMonth < 6;
    } else if (selectedPeriod === 'q3') {
      return yearMatch && payrollMonth >= 6 && payrollMonth < 9;
    } else if (selectedPeriod === 'q4') {
      return yearMatch && payrollMonth >= 9;
    }
    
    return false;
  });
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };
  
  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };
  
  const handleViewDetails = (payrollId) => {
    // In a real app, this would navigate to payroll details page
    console.log(`View details for payroll: ${payrollId}`);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Year
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {[2023, 2022, 2021, 2020].map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Period
            </label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={handlePeriodChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Periods</option>
              <option value="q1">Q1 (Jan-Mar)</option>
              <option value="q2">Q2 (Apr-Jun)</option>
              <option value="q3">Q3 (Jul-Sep)</option>
              <option value="q4">Q4 (Oct-Dec)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Payroll History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payroll History</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filteredHistory.length} payroll periods in selected timeframe
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payroll ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Period
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((payroll) => (
                <tr key={payroll.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payroll.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(payroll.payPeriodStart)} - {formatDate(payroll.payPeriodEnd)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(payroll.payDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payroll.employeeCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(payroll.totalGross)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(payroll.totalNet)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${payroll.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {payroll.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                    <button 
                      onClick={() => handleViewDetails(payroll.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredHistory.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No payroll history found for the selected period.
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollHistory; 