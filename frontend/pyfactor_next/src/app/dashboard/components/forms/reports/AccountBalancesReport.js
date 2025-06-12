'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/services/api/reports';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const GenericReportTemplate = ({ reportType, title }) => {
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
        report_type: reportType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };

      const response = await reportsApi.generate(params);
      if (response.data) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await reportsApi.export({
        report_type: reportType,
        format,
        data: reportData
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${dateRange.startDate}_${dateRange.endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        
        {/* Date Range Controls */}
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center text-gray-600">
            <p className="text-lg mb-4">Report data will be displayed here</p>
            <p>This is a template component. Customize it based on the specific report requirements.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericReportTemplate;