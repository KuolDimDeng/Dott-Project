'use client';


import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const PayHistory = ({ payStatements }) => {
  const [filteredStatements, setFilteredStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last6Months');
  const [sortOption, setSortOption] = useState('date-desc');
  
  useEffect(() => {
    setLoading(true);
    
    if (!payStatements || payStatements.length === 0) {
      setFilteredStatements([]);
      setLoading(false);
      return;
    }
    
    // Filter by date range
    const filtered = filterByDateRange(payStatements, dateRange);
    
    // Sort the filtered statements
    const sorted = sortStatements(filtered, sortOption);
    
    // Simulate API call for realistic UX
    setTimeout(() => {
      setFilteredStatements(sorted);
      setLoading(false);
    }, 500);
  }, [payStatements, dateRange, sortOption]);
  
  const filterByDateRange = (statements, range) => {
    if (!statements) return [];
    
    const today = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'last3Months':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'last6Months':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case 'yearToDate':
        startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
        break;
      case 'lastYear':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        const endOfLastYear = new Date(today.getFullYear(), 0, 0);
        return statements.filter(statement => {
          const payDate = new Date(statement.payDate);
          return payDate >= startDate && payDate <= endOfLastYear;
        });
      case 'allTime':
        return [...statements];
      default:
        startDate.setMonth(today.getMonth() - 6); // Default to last 6 months
    }
    
    return statements.filter(statement => {
      return new Date(statement.payDate) >= startDate;
    });
  };
  
  const sortStatements = (statements, sortOption) => {
    if (!statements) return [];
    
    const statementsCopy = [...statements];
    
    switch (sortOption) {
      case 'date-desc':
        return statementsCopy.sort((a, b) => new Date(b.payDate) - new Date(a.payDate));
      case 'date-asc':
        return statementsCopy.sort((a, b) => new Date(a.payDate) - new Date(b.payDate));
      case 'amount-desc':
        return statementsCopy.sort((a, b) => b.grossPay - a.grossPay);
      case 'amount-asc':
        return statementsCopy.sort((a, b) => a.grossPay - b.grossPay);
      default:
        return statementsCopy.sort((a, b) => new Date(b.payDate) - new Date(a.payDate));
    }
  };
  
  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
  };
  
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };
  
  // Mock data for pay history charts
  const generateMockChartData = () => {
    // Create 6 months of data
    const monthLabels = [];
    const grossPayData = [];
    const netPayData = [];
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthLabels.push(format(month, 'MMM yyyy'));
      
      // Generate some realistic looking data with small variations
      const baseGrossPay = 3500;
      const variation = Math.random() * 200 - 100; // Random variation between -100 and 100
      const grossPay = baseGrossPay + variation;
      grossPayData.push(grossPay.toFixed(2));
      
      // Net pay is typically ~75-80% of gross
      const netPayFactor = 0.75 + (Math.random() * 0.05); // Random between 75-80%
      netPayData.push((grossPay * netPayFactor).toFixed(2));
    }
    
    return { monthLabels, grossPayData, netPayData };
  };
  
  const chartData = generateMockChartData();
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Pay History
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label htmlFor="dateRangeFilter" className="block text-sm font-medium text-gray-700">
              Date Range
            </label>
            <select
              id="dateRangeFilter"
              name="dateRangeFilter"
              value={dateRange}
              onChange={handleDateRangeChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="last3Months">Last 3 Months</option>
              <option value="last6Months">Last 6 Months</option>
              <option value="yearToDate">Year to Date</option>
              <option value="lastYear">Last Year</option>
              <option value="allTime">All Time</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="sortOption" className="block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <select
              id="sortOption"
              name="sortOption"
              value={sortOption}
              onChange={handleSortChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (Highest First)</option>
              <option value="amount-asc">Amount (Lowest First)</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredStatements.length === 0 ? (
          <div className="text-center py-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payment history</h3>
            <p className="mt-1 text-sm text-gray-500">
              No pay statements found for the selected period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pay Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pay Period
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Pay
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Pay
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStatements.map((statement, index) => (
                  <tr key={statement.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(statement.payDate), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(statement.payPeriodStart), 'MM/dd/yyyy')} - {format(new Date(statement.payPeriodEnd), 'MM/dd/yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {statement.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${statement.grossPay.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${statement.netPay.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => alert(`Viewing pay statement details for ${statement.id} from ${statement.payDate}`)}
                        className="text-blue-600 hover:text-blue-900 focus:outline-none focus:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => alert(`Downloading pay statement for ${statement.id} from ${statement.payDate}`)}
                        className="ml-4 text-gray-600 hover:text-gray-900 focus:outline-none focus:underline"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Pay Trends
        </h3>
        
        <div className="h-64 relative">
          {/* This is a simplified visualization. In a real app, you'd use Chart.js, Recharts, or similar */}
          <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-gray-500">
            {chartData.monthLabels.map((month, index) => (
              <div key={index} className="text-center" style={{ width: `${100 / chartData.monthLabels.length}%` }}>
                {month}
              </div>
            ))}
          </div>
          
          <div className="absolute left-0 bottom-0 top-6 flex flex-col justify-between text-xs text-gray-500">
            <div>$4,000</div>
            <div>$3,500</div>
            <div>$3,000</div>
            <div>$2,500</div>
            <div>$2,000</div>
            <div>$1,500</div>
            <div>$1,000</div>
            <div>$500</div>
            <div>$0</div>
          </div>
          
          <div className="absolute bottom-0 left-10 right-0 top-6 flex items-end">
            {chartData.grossPayData.map((amount, index) => {
              const grossHeight = `${(parseFloat(amount) / 4000) * 100}%`;
              const netAmount = chartData.netPayData[index];
              const netHeight = `${(parseFloat(netAmount) / 4000) * 100}%`;
              
              return (
                <div 
                  key={index} 
                  className="flex items-end space-x-1"
                  style={{ width: `${100 / chartData.monthLabels.length}%` }}
                >
                  <div 
                    className="w-4 bg-blue-500 rounded-t-sm"
                    style={{ height: grossHeight }}
                    title={`Gross Pay: $${amount}`}
                  ></div>
                  <div 
                    className="w-4 bg-green-500 rounded-t-sm"
                    style={{ height: netHeight }}
                    title={`Net Pay: $${netAmount}`}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mt-4 flex justify-center space-x-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-sm mr-2"></div>
            <span className="text-sm text-gray-700">Gross Pay</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-sm mr-2"></div>
            <span className="text-sm text-gray-700">Net Pay</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayHistory; 