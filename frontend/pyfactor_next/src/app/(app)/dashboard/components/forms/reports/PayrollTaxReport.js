'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const PayrollTaxReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: 'payroll_wage_tax',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };

      const response = await reportsApi.generate(params);
      if (response.data) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      // Use mock data for demonstration
      setReportData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    return {
      period: {
        start: dateRange.startDate,
        end: dateRange.endDate
      },
      summary: {
        totalWages: 450000,
        totalEmployees: 25,
        totalTaxWithheld: 135000,
        totalEmployerTaxes: 45000
      },
      taxBreakdown: {
        federal: {
          incomeTax: 85000,
          socialSecurity: 27900,
          medicare: 6525,
          unemployment: 1500
        },
        state: {
          incomeTax: 18000,
          unemployment: 3600,
          disability: 2475
        }
      },
      employeeSummary: [
        {
          name: 'John Smith',
          id: 'EMP001',
          grossWages: 85000,
          federalWithholding: 18700,
          stateWithholding: 4250,
          socialSecurity: 5270,
          medicare: 1232.50
        },
        {
          name: 'Jane Doe',
          id: 'EMP002',
          grossWages: 95000,
          federalWithholding: 22800,
          stateWithholding: 5700,
          socialSecurity: 5890,
          medicare: 1377.50
        },
        {
          name: 'Mike Johnson',
          id: 'EMP003',
          grossWages: 65000,
          federalWithholding: 12350,
          stateWithholding: 2925,
          socialSecurity: 4030,
          medicare: 942.50
        }
      ]
    };
  };

  const handleExport = async (format) => {
    try {
      const response = await reportsApi.export({
        report_type: 'payroll_wage_tax',
        format,
        data: reportData
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_tax_report_${dateRange.startDate}_${dateRange.endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Payroll & Wage Tax Report</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <button
                onClick={generateReport}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generate
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={!reportData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={!reportData}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Wages</p>
              <p className="text-xl font-bold">{formatCurrency(reportData.summary.totalWages)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-xl font-bold">{reportData.summary.totalEmployees}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Employee Tax Withheld</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(reportData.summary.totalTaxWithheld)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Employer Taxes</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(reportData.summary.totalEmployerTaxes)}</p>
            </div>
          </div>

          {/* Tax Breakdown */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Tax Breakdown</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Federal Taxes */}
                <div>
                  <h3 className="font-semibold mb-3">Federal Taxes</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Income Tax Withheld</span>
                      <span className="font-medium">{formatCurrency(reportData.taxBreakdown.federal.incomeTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Social Security</span>
                      <span className="font-medium">{formatCurrency(reportData.taxBreakdown.federal.socialSecurity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Medicare</span>
                      <span className="font-medium">{formatCurrency(reportData.taxBreakdown.federal.medicare)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Federal Unemployment (FUTA)</span>
                      <span className="font-medium">{formatCurrency(reportData.taxBreakdown.federal.unemployment)}</span>
                    </div>
                  </div>
                </div>

                {/* State Taxes */}
                <div>
                  <h3 className="font-semibold mb-3">State Taxes</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Income Tax Withheld</span>
                      <span className="font-medium">{formatCurrency(reportData.taxBreakdown.state.incomeTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">State Unemployment (SUTA)</span>
                      <span className="font-medium">{formatCurrency(reportData.taxBreakdown.state.unemployment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">State Disability Insurance</span>
                      <span className="font-medium">{formatCurrency(reportData.taxBreakdown.state.disability)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Summary Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Employee Tax Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Wages
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Federal W/H
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State W/H
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Social Security
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medicare
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Withheld
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.employeeSummary.map((employee) => {
                    const totalWithheld = employee.federalWithholding + employee.stateWithholding + 
                                        employee.socialSecurity + employee.medicare;
                    return (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(employee.grossWages)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(employee.federalWithholding)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(employee.stateWithholding)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(employee.socialSecurity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(employee.medicare)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                          {formatCurrency(totalWithheld)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollTaxReport;