'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

/**
 * PayrollReports Component
 * Provides reporting functionality for company payroll data
 * Only accessible to owners
 */
const PayrollReports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [timeFrame, setTimeFrame] = useState('ytd');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const toast = useToast();
  
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (departments.length > 0 && selectedDepartments.length === 0) {
      setSelectedDepartments([departments[0].id]);
    }
  }, [departments]);

  useEffect(() => {
    if (selectedDepartments.length > 0) {
      generateReport();
    }
  }, [reportType, timeFrame, selectedDepartments]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/departments/');
      setDepartments(response.data);
      if (response.data.length > 0) {
        setSelectedDepartments([response.data[0].id]);
      }
    } catch (error) {
      toast.error('Error loading departments: ' + (error.response?.data?.message || error.message));
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (selectedDepartments.length === 0) return;
    
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/payroll/reports/', {
        report_type: reportType,
        time_frame: timeFrame,
        department_ids: selectedDepartments
      });
      
      setReport(response.data);
    } catch (error) {
      toast.error('Error generating report: ' + (error.response?.data?.message || error.message));
      console.error('Error generating payroll report:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReportTypeChange = (e) => {
    setReportType(e.target.value);
  };
  
  const handleTimeFrameChange = (e) => {
    setTimeFrame(e.target.value);
  };
  
  const handleDepartmentChange = (e) => {
    setSelectedDepartments([e.target.value]);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const handleExportReport = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post('/api/payroll/export-report/', {
        report_type: reportType,
        time_frame: timeFrame,
        department_ids: selectedDepartments,
        format: 'pdf'
      }, {
        responseType: 'blob'
      });
      
      // Create a blob from the PDF stream
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and click it to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-report-${reportType}-${timeFrame}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Error exporting report: ' + (error.response?.data?.message || error.message));
      console.error('Error exporting report:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderReportContent = () => {
    if (!report) return null;
    
    return (
      <div className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Gross Pay</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(report.summary.grossPay)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Net Pay</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(report.summary.netPay)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Total Tax</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(report.summary.totalTax)}</p>
          </div>
        </div>
        
        {/* Payroll by Department */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Payroll by Department</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.departments.map((dept, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dept.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(dept.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Additional Report Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tax Withholding */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Tax Withholdings</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Federal Tax</span>
                  <span className="text-sm font-medium">{formatCurrency(report.taxWithholding.federal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">State Tax</span>
                  <span className="text-sm font-medium">{formatCurrency(report.taxWithholding.state)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">FICA</span>
                  <span className="text-sm font-medium">{formatCurrency(report.taxWithholding.fica)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Tax</span>
                    <span className="text-sm font-medium">{formatCurrency(report.taxWithholding.total)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Percent of Gross</span>
                    <span className="text-xs font-medium">{report.taxWithholding.percentOfGross}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Deductions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Benefit Deductions</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Health Insurance</span>
                  <span className="text-sm font-medium">{formatCurrency(report.deductions.healthInsurance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">401(k)</span>
                  <span className="text-sm font-medium">{formatCurrency(report.deductions.retirement401k)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Other Benefits</span>
                  <span className="text-sm font-medium">{formatCurrency(report.deductions.otherBenefits)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Deductions</span>
                    <span className="text-sm font-medium">{formatCurrency(report.deductions.total)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Percent of Gross</span>
                    <span className="text-xs font-medium">{report.deductions.percentOfGross}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payroll Reports</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Type */}
          <div>
            <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              id="report-type"
              value={reportType}
              onChange={handleReportTypeChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="summary">Summary Report</option>
              <option value="detailed">Detailed Report</option>
              <option value="tax">Tax Report</option>
              <option value="benefits">Benefits Report</option>
            </select>
          </div>
          
          {/* Time Frame */}
          <div>
            <label htmlFor="time-frame" className="block text-sm font-medium text-gray-700 mb-1">
              Time Frame
            </label>
            <select
              id="time-frame"
              value={timeFrame}
              onChange={handleTimeFrameChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="ytd">Year to Date</option>
              <option value="q1">Q1 (Jan-Mar)</option>
              <option value="q2">Q2 (Apr-Jun)</option>
              <option value="q3">Q3 (Jul-Sep)</option>
              <option value="q4">Q4 (Oct-Dec)</option>
              <option value="last12">Last 12 Months</option>
            </select>
          </div>
          
          {/* Departments */}
          <div>
            <label htmlFor="departments" className="block text-sm font-medium text-gray-700 mb-1">
              Departments
            </label>
            <select
              id="departments"
              value={selectedDepartments[0]}
              onChange={handleDepartmentChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            Export Report
          </button>
        </div>
      </div>
      
      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        renderReportContent()
      )}
    </div>
  );
};

export default PayrollReports; 