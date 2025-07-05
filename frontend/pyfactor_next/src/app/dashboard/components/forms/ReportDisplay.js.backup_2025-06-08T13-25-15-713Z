import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';
import { format, isValid, parseISO } from 'date-fns';
import { optimizeJsPDF } from '@/utils/pdfOptimizer';

export default function ReportDisplay({ type = 'general' }) {
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generalReportTypes = [
    { value: 'profit-loss', label: 'Profit and Loss' },
    { value: 'balance-sheet', label: 'Balance Sheet' },
    { value: 'cash-flow', label: 'Cash Flow' },
    { value: 'tax-summary', label: 'Tax Summary' },
  ];

  const salesReportTypes = [
    { value: 'sales-by-customer', label: 'Sales by Customer' },
    { value: 'sales-by-product', label: 'Sales by Product' },
    { value: 'sales-by-service', label: 'Sales by Service' },
    { value: 'invoice-aging', label: 'Invoice Aging' }, 
    { value: 'sales-tax', label: 'Sales Tax' },
    { value: 'sales-by-rep', label: 'Sales by Representative' },
    { value: 'estimate-conversion', label: 'Estimate to Invoice Conversion' },
  ];

  const reportTypes = type === 'sales' ? salesReportTypes : generalReportTypes;

  const handleSubmit = async () => {
    if (!reportType || !startDate || !endDate) {
      toast.error('Please select report type and date range');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/reports/', {
        params: {
          type: reportType,
          start_date: startDate,
          end_date: endDate,
        },
      });

      setReportData(response.data);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
      
      // For demo purposes, generate mock data
      if (type === 'sales') {
        generateMockSalesReport(reportType);
      } else {
        setReportData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateMockSalesReport = (reportType) => {
    let mockData = null;
    const formattedStartDate = startDate ? format(new Date(startDate), 'MM/dd/yyyy') : '';
    const formattedEndDate = endDate ? format(new Date(endDate), 'MM/dd/yyyy') : '';
    const dateRangeStr = `${formattedStartDate} - ${formattedEndDate}`;
    
    switch(reportType) {
      case 'sales-by-customer':
        mockData = {
          title: 'Sales by Customer',
          dateRange: dateRangeStr,
          columns: ['Customer', 'Number of Orders', 'Total Amount', 'Average Order'],
          data: [
            ['Acme Corporation', 12, '$45,678.90', '$3,806.58'],
            ['Globex Industries', 8, '$32,456.78', '$4,057.10'],
            ['Wayne Enterprises', 6, '$28,765.43', '$4,794.24'],
            ['Stark Industries', 5, '$23,987.65', '$4,797.53'],
            ['Umbrella Corporation', 4, '$19,876.54', '$4,969.14'],
          ],
          summary: {
            totalCustomers: 5,
            totalOrders: 35,
            totalSales: '$150,765.30',
            averageOrderValue: '$4,307.58'
          }
        };
        break;
      case 'sales-by-product':
        mockData = {
          title: 'Sales by Product',
          dateRange: dateRangeStr,
          columns: ['Product', 'Quantity Sold', 'Total Revenue', 'Average Price'],
          data: [
            ['Product A', 156, '$15,600.00', '$100.00'],
            ['Product B', 98, '$14,700.00', '$150.00'],
            ['Product C', 75, '$22,500.00', '$300.00'],
            ['Product D', 45, '$13,500.00', '$300.00'],
            ['Product E', 32, '$9,600.00', '$300.00'],
          ],
          summary: {
            totalProducts: 5,
            totalQuantity: 406,
            totalRevenue: '$75,900.00',
            averagePrice: '$186.95'
          }
        };
        break;
      case 'sales-by-service':
        mockData = {
          title: 'Sales by Service',
          dateRange: dateRangeStr,
          columns: ['Service', 'Hours Billed', 'Total Revenue', 'Average Rate'],
          data: [
            ['Consulting', 250, '$37,500.00', '$150.00/hr'],
            ['Development', 320, '$48,000.00', '$150.00/hr'],
            ['Design', 180, '$22,500.00', '$125.00/hr'],
            ['Support', 420, '$42,000.00', '$100.00/hr'],
            ['Training', 150, '$22,500.00', '$150.00/hr'],
          ],
          summary: {
            totalServices: 5,
            totalHours: 1320,
            totalRevenue: '$172,500.00',
            averageRate: '$130.68/hr'
          }
        };
        break;
      case 'invoice-aging':
        mockData = {
          title: 'Invoice Aging Report',
          dateRange: dateRangeStr,
          columns: ['Customer', 'Invoice #', 'Date', 'Amount', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '>90 Days'],
          data: [
            ['Acme Corporation', 'INV-1001', '01/15/2023', '$5,678.90', '$5,678.90', '', '', '', ''],
            ['Globex Industries', 'INV-1002', '12/05/2022', '$4,567.89', '', '$4,567.89', '', '', ''],
            ['Wayne Enterprises', 'INV-1003', '11/20/2022', '$6,789.01', '', '', '$6,789.01', '', ''],
            ['Stark Industries', 'INV-1004', '10/10/2022', '$3,456.78', '', '', '', '$3,456.78', ''],
            ['Umbrella Corporation', 'INV-1005', '09/01/2022', '$7,890.12', '', '', '', '', '$7,890.12'],
          ],
          summary: {
            totalInvoices: 5,
            totalAmount: '$28,382.70',
            current: '$5,678.90',
            '1-30Days': '$4,567.89',
            '31-60Days': '$6,789.01',
            '61-90Days': '$3,456.78',
            'over90Days': '$7,890.12'
          }
        };
        break;
      default:
        mockData = {
          title: 'Sales Report',
          dateRange: dateRangeStr,
          message: 'Sample report data not available for this report type'
        };
    }
    
    setReportData(mockData);
  };

  const exportToPdf = () => {
    try {
      // Create a new PDF document with memory optimization
      const doc = optimizeJsPDF(new jsPDF());
      
      // Add a title
      doc.setFontSize(18);
      doc.text(reportData.title, 14, 22);
      
      // Add metadata and filter info
      doc.setFontSize(11);
      doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd')}`, 14, 32);
      if (reportData.dateRange) {
        doc.text(`Date Range: ${reportData.dateRange}`, 14, 38);
      }
      
      // Create a table with the report data
      const columns = reportData.columns || [];
      const data = reportData.data || [];
      
      // Create table headers
      const headers = Array.isArray(columns) 
        ? columns.map(col => typeof col === 'string' ? col : (col.title || col.label || ''))
        : [];
      
      // Create table body
      const body = data.map(row => {
        if (Array.isArray(row)) {
          return row;
        } else {
          return headers.map(header => {
            const field = columns.find(col => 
              (col.title || col.label) === header)?.field || header;
            
            const value = row[field];
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value);
            }
            return value || '';
          });
        }
      });
      
      // Add the table
      doc.autoTable({
        startY: 45,
        head: [headers],
        body: body,
        theme: 'grid',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        margin: { top: 50 },
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
        }
      });
      
      // Add summary if available
      if (reportData.summary) {
        const summaryY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text('Summary', 14, summaryY);
        doc.setFontSize(11);
        
        let yOffset = summaryY + 10;
        Object.entries(reportData.summary).forEach(([key, value]) => {
          // Format the key as a readable label
          const label = key.replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/([0-9]+)/g, ' $1');
            
          doc.text(`${label}: ${value}`, 14, yOffset);
          yOffset += 7;
        });
      }
      
      // Save the PDF
      doc.save(`${reportData.title.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      
      toast.success('Report exported to PDF');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export to PDF');
    }
  };
  
  const exportToCSV = () => {
    if (!reportData) return;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    if (reportData.message) {
      const messageData = [[reportData.title], [reportData.dateRange], [reportData.message]];
      const ws = XLSX.utils.aoa_to_sheet(messageData);
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
    } else {
      // Create worksheet with headers and data
      const data = [
        reportData.columns.map(col => col.title || col.label),
        ...reportData.data.map(row => 
          reportData.columns.map(col => {
            if (typeof row[col.field] === 'object' && row[col.field] !== null) {
              return JSON.stringify(row[col.field]);
            }
            return row[col.field];
          })
        )
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
      
      // Add summary sheet if available
      if (reportData.summary) {
        const summaryData = [
          ['Metric', 'Value'],
          ...Object.entries(reportData.summary).map(([key, value]) => [
            key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            value
          ])
        ];
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      }
    }
    
    // Generate and save the file
    const fileName = `${reportData.title.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const renderReportData = () => {
    if (!reportData) return null;

    return (
      <div className="mt-6">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-2 text-xl font-semibold">{reportData.title}</h2>
          <p className="mb-4 text-sm text-gray-600">{reportData.dateRange}</p>

          {reportData.message ? (
            <p>{reportData.message}</p>
          ) : (
            <>
              <div className="mb-6 mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {reportData.columns.map((column, index) => (
                        <th 
                          key={index}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          {column.title || column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {reportData.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {reportData.columns.map((column, cellIndex) => (
                          <td key={cellIndex} className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {typeof row[column.field] === 'object' && row[column.field] !== null ? JSON.stringify(row[column.field]) : row[column.field]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {reportData.summary && (
                <div>
                  <h3 className="mb-3 text-lg font-medium">Summary</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {Object.entries(reportData.summary).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str) { return str.toUpperCase(); })}
                        </p>
                        <p className="mt-1 text-lg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex justify-end space-x-4">
            <button 
              onClick={exportToPdf}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </button>
            <button 
              onClick={exportToCSV}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download CSV
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        {type === 'sales' ? 'Sales Reports' : 'Reports'}
      </h1>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-medium">Generate Report</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="reportType" className="mb-1 block text-sm font-medium text-gray-700">
              Report Type
            </label>
            <select
              id="reportType"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="">Select Report Type</option>
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="mr-3 -ml-1 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Generate Report'}
          </button>
        </div>
      </div>

      {renderReportData()}
    </div>
  );
}