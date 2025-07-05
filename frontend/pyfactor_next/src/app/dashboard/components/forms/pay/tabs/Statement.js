'use client';


import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const Statement = ({ userData }) => {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Define available years for the dropdown (current year and 3 years prior)
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 4; i++) {
    years.push(currentYear - i);
  }
  
  // Mock data for pay statements
  const mockStatements = [
    {
      id: 'stmt-20231215',
      payDate: '2023-12-15',
      payPeriod: { start: '2023-12-01', end: '2023-12-15' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20231130',
      payDate: '2023-11-30',
      payPeriod: { start: '2023-11-16', end: '2023-11-30' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20231115',
      payDate: '2023-11-15',
      payPeriod: { start: '2023-11-01', end: '2023-11-15' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20231031',
      payDate: '2023-10-31',
      payPeriod: { start: '2023-10-16', end: '2023-10-31' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20231015',
      payDate: '2023-10-15',
      payPeriod: { start: '2023-10-01', end: '2023-10-15' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20230930',
      payDate: '2023-09-30',
      payPeriod: { start: '2023-09-16', end: '2023-09-30' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20230915',
      payDate: '2023-09-15',
      payPeriod: { start: '2023-09-01', end: '2023-09-15' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20230831',
      payDate: '2023-08-31',
      payPeriod: { start: '2023-08-16', end: '2023-08-31' },
      grossPay: 2458.33,
      netPay: 1845.28,
      type: 'Regular'
    },
    {
      id: 'stmt-20221215',
      payDate: '2022-12-15',
      payPeriod: { start: '2022-12-01', end: '2022-12-15' },
      grossPay: 2333.33,
      netPay: 1756.92,
      type: 'Regular'
    },
    {
      id: 'stmt-20221130',
      payDate: '2022-11-30',
      payPeriod: { start: '2022-11-16', end: '2022-11-30' },
      grossPay: 2333.33,
      netPay: 1756.92,
      type: 'Regular'
    },
    {
      id: 'stmt-20221115',
      payDate: '2022-11-15',
      payPeriod: { start: '2022-11-01', end: '2022-11-15' },
      grossPay: 2333.33,
      netPay: 1756.92,
      type: 'Regular'
    },
    {
      id: 'stmt-20221031',
      payDate: '2022-10-31',
      payPeriod: { start: '2022-10-16', end: '2022-10-31' },
      grossPay: 2333.33,
      netPay: 1756.92,
      type: 'Regular'
    }
  ];
  
  useEffect(() => {
    setLoading(true);
    
    // Simulate API fetch with mock data
    setTimeout(() => {
      // Filter statements by the selected year
      const filteredStatements = mockStatements.filter(statement => 
        new Date(statement.payDate).getFullYear() === selectedYear
      );
      
      setStatements(filteredStatements);
      setLoading(false);
    }, 800);
  }, [selectedYear]);
  
  const downloadStatement = async (statementId) => {
    setIsDownloading(true);
    
    try {
      // In a real app, this would be an API call to download the statement
      console.log('[Statement] Downloading statement:', statementId);
      
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulating download completed
      alert(`Statement ${statementId} download started. Check your downloads folder.`);
    } catch (error) {
      console.error('[Statement] Error downloading statement:', error);
      alert('Failed to download statement. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Filter statements based on search term
  const filteredStatements = searchTerm 
    ? statements.filter(statement => 
        format(new Date(statement.payDate), 'MMM dd, yyyy').toLowerCase().includes(searchTerm.toLowerCase()) ||
        statement.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : statements;
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Pay Statements
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            View and download your pay statements
          </p>
        </div>
        
        <div className="px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 mb-6">
            <div className="flex items-center space-x-4">
              <label htmlFor="yearFilter" className="block text-sm font-medium text-gray-700">
                Year:
              </label>
              <select
                id="yearFilter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search statements..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-10 pr-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-10">
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No statements found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No pay statements available for the selected year or search criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
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
                  {filteredStatements.map(statement => (
                    <tr key={statement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {format(new Date(statement.payDate), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {format(new Date(statement.payPeriod.start), 'MM/dd/yyyy')} - {format(new Date(statement.payPeriod.end), 'MM/dd/yyyy')}
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
                          onClick={() => downloadStatement(statement.id)}
                          disabled={isDownloading}
                          className="text-blue-600 hover:text-blue-900 focus:outline-none focus:underline disabled:opacity-50"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => alert(`Viewing statement details for ${statement.id}`)}
                          className="ml-4 text-gray-600 hover:text-gray-900 focus:outline-none focus:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Annual Tax Documents
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h4 className="font-medium">W-2 Form (2023)</h4>
              <p className="text-sm text-gray-500">Wage and Tax Statement</p>
            </div>
            <button 
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-800 text-sm rounded-md hover:bg-gray-200"
              onClick={() => alert('Download W-2 Form - This would download your W-2 form')}
            >
              Download
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h4 className="font-medium">W-2 Form (2022)</h4>
              <p className="text-sm text-gray-500">Wage and Tax Statement</p>
            </div>
            <button 
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-800 text-sm rounded-md hover:bg-gray-200"
              onClick={() => alert('Download W-2 Form - This would download your W-2 form')}
            >
              Download
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h4 className="font-medium">1095-C Form (2023)</h4>
              <p className="text-sm text-gray-500">Employer-Provided Health Insurance Offer and Coverage</p>
            </div>
            <button 
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-800 text-sm rounded-md hover:bg-gray-200"
              onClick={() => alert('Download 1095-C Form - This would download your 1095-C form')}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statement; 