'use client';


import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

/**
 * PayStubs Component
 * Allows employees to view and download their pay stubs
 */
const PayStubs = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [payStubs, setPayStubs] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStub, setSelectedStub] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  const availableYears = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2
  ];
  
  useEffect(() => {
    const fetchPayStubs = async () => {
      setLoading(true);
      
      try {
        // Simulate API call
        setTimeout(() => {
          // Generate sample pay stubs based on selected year
          const stubCount = selectedYear === new Date().getFullYear() ? 
            Math.floor(new Date().getMonth() / 2) + 1 : // Bi-monthly for current year up to current month
            6; // 6 stubs for past years
            
          const sampleStubs = Array.from({ length: stubCount }, (_, i) => {
            const date = new Date(selectedYear, i * 2, 15); // 15th of every other month
            const isPaid = date <= new Date();
            const grossAmount = 2450 + Math.floor(Math.random() * 500);
            const taxAmount = grossAmount * 0.24;
            const deductionsAmount = grossAmount * 0.08;
            const netAmount = grossAmount - taxAmount - deductionsAmount;
            
            return {
              id: `${selectedYear}-${i + 1}`,
              payPeriod: `${format(date, 'MMM 1')} - ${format(date, 'MMM 15')}`,
              payDate: format(date, 'MMM dd, yyyy'),
              grossAmount,
              netAmount,
              taxAmount,
              deductionsAmount,
              status: isPaid ? 'Paid' : 'Scheduled',
              downloadUrl: isPaid ? `#stub-${selectedYear}-${i + 1}` : null
            };
          });
          
          setPayStubs(sampleStubs.reverse()); // Most recent first
          setSelectedStub(null);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[PayStubs] Error fetching pay stubs:', error);
        setLoading(false);
      }
    };
    
    fetchPayStubs();
  }, [selectedYear]);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const handleDownload = (stub) => {
    setDownloading(true);
    
    // Simulate API call to download pay stub
    setTimeout(() => {
      console.log(`[PayStubs] Downloading pay stub: ${stub.id}`);
      setDownloading(false);
      
      // In a real application, this would trigger a file download
      // For this example, we'll just show an alert
      alert(`Pay stub for ${stub.payPeriod} would download here.`);
    }, 1500);
  };
  
  const handleViewDetails = (stub) => {
    setSelectedStub(stub);
  };
  
  const handleCloseDetails = () => {
    setSelectedStub(null);
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
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Pay Stubs</h3>
              <p className="mt-1 text-sm text-gray-500">
                View and download your past pay stubs.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <select
                id="year-select"
                name="year-select"
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {payStubs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pay stubs</h3>
              <p className="mt-1 text-sm text-gray-500">
                No pay stubs available for the selected year.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden border-b border-gray-200 shadow sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pay Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pay Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payStubs.map((stub) => (
                    <tr key={stub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stub.payPeriod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stub.payDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(stub.grossAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(stub.netAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          stub.status === 'Paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {stub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(stub)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        {stub.status === 'Paid' && (
                          <button
                            type="button"
                            onClick={() => handleDownload(stub)}
                            className="text-blue-600 hover:text-blue-900"
                            disabled={downloading}
                          >
                            {downloading ? 'Downloading...' : 'Download'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {selectedStub && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleCloseDetails}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Pay Stub Details
                  </h3>
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={handleCloseDetails}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div>
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Pay Period</p>
                        <p className="font-medium">{selectedStub.payPeriod}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pay Date</p>
                        <p className="font-medium">{selectedStub.payDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium">{selectedStub.status}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Earnings</span>
                      <span className="font-medium">{formatCurrency(selectedStub.grossAmount)}</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-600">Regular Pay</span>
                        <span className="text-sm">{formatCurrency(selectedStub.grossAmount)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Taxes</span>
                      <span className="font-medium">{formatCurrency(selectedStub.taxAmount)}</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-600">Federal Income Tax</span>
                        <span className="text-sm">{formatCurrency(selectedStub.taxAmount * 0.6)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-600">Social Security</span>
                        <span className="text-sm">{formatCurrency(selectedStub.taxAmount * 0.25)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-600">Medicare</span>
                        <span className="text-sm">{formatCurrency(selectedStub.taxAmount * 0.15)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Deductions</span>
                      <span className="font-medium">{formatCurrency(selectedStub.deductionsAmount)}</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-600">Health Insurance</span>
                        <span className="text-sm">{formatCurrency(selectedStub.deductionsAmount * 0.7)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-gray-600">401(k)</span>
                        <span className="text-sm">{formatCurrency(selectedStub.deductionsAmount * 0.3)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between py-2 pt-4 border-t">
                      <span className="font-bold">Net Pay</span>
                      <span className="font-bold">{formatCurrency(selectedStub.netAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedStub.status === 'Paid' && (
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => handleDownload(selectedStub)}
                    disabled={downloading}
                  >
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                )}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayStubs; 