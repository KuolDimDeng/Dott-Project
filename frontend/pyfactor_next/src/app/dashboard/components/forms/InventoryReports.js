'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';

export default function InventoryReports() {
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [exportSettings, setExportSettings] = useState({
    includeFilters: true,
    includeSummary: true,
    includeDate: true
  });

  // Inventory specific report types
  const inventoryReportTypes = [
    { value: 'stock-levels', label: 'Stock Levels Report' },
    { value: 'stock-movements', label: 'Stock Movements Report' },
    { value: 'low-stock', label: 'Low Stock Alert Report' },
    { value: 'stock-valuation', label: 'Stock Valuation Report' },
    { value: 'stock-adjustments', label: 'Stock Adjustments Report' },
    { value: 'location-stock', label: 'Stock by Location' },
    { value: 'supplier-performance', label: 'Supplier Performance Report' },
    { value: 'product-turnover', label: 'Product Turnover Report' },
    { value: 'expiring-stock', label: 'Expiring Stock Report' },
    { value: 'dead-stock', label: 'Dead Stock Report' }
  ];

  // Initialize tenant ID
  useEffect(() => {
    const initializeTenant = async () => {
      const id = await getSecureTenantId();
      if (id) {
        setTenantId(id);
        console.log('[InventoryReports] Tenant ID initialized:', id);
      }
    };
    initializeTenant();
  }, []);

  // Generate inventory report
  const handleGenerateReport = async () => {
    if (!reportType || !startDate || !endDate) {
      toast.error('Please select report type and date range');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date');
      return;
    }

    setLoading(true);
    console.log('[InventoryReports] Generating report:', { reportType, startDate, endDate });

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'X-Tenant-ID': tenantId
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/reports/inventory`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenant_id: tenantId,
          report_type: reportType,
          start_date: startDate,
          end_date: endDate
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[InventoryReports] Report data received:', data);
      
      // Format the report data
      const formattedData = formatReportData(data, reportType);
      setReportData(formattedData);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('[InventoryReports] Error generating report:', error);
      toast.error('Failed to generate report. Using sample data.');
      
      // Generate mock data for demonstration
      generateMockReport(reportType);
    } finally {
      setLoading(false);
    }
  };

  // Format report data based on type
  const formatReportData = (data, type) => {
    const dateRangeStr = `${format(new Date(startDate), 'MM/dd/yyyy')} - ${format(new Date(endDate), 'MM/dd/yyyy')}`;
    
    switch(type) {
      case 'stock-levels':
        return {
          title: 'Stock Levels Report',
          dateRange: dateRangeStr,
          columns: ['Product Code', 'Product Name', 'Current Stock', 'Min Stock', 'Max Stock', 'Status', 'Value'],
          data: data.items || [],
          summary: data.summary || {}
        };
      case 'stock-movements':
        return {
          title: 'Stock Movements Report',
          dateRange: dateRangeStr,
          columns: ['Date', 'Product', 'Type', 'Quantity', 'From', 'To', 'Reference', 'User'],
          data: data.movements || [],
          summary: data.summary || {}
        };
      case 'low-stock':
        return {
          title: 'Low Stock Alert Report',
          dateRange: dateRangeStr,
          columns: ['Product Code', 'Product Name', 'Current Stock', 'Min Stock', 'Days to Stockout', 'Reorder Qty'],
          data: data.lowStockItems || [],
          summary: data.summary || {}
        };
      default:
        return {
          title: 'Inventory Report',
          dateRange: dateRangeStr,
          data: data.items || [],
          summary: data.summary || {}
        };
    }
  };

  // Generate mock report data
  const generateMockReport = (type) => {
    const dateRangeStr = `${format(new Date(startDate), 'MM/dd/yyyy')} - ${format(new Date(endDate), 'MM/dd/yyyy')}`;
    let mockData = null;

    switch(type) {
      case 'stock-levels':
        mockData = {
          title: 'Stock Levels Report',
          dateRange: dateRangeStr,
          columns: ['Product Code', 'Product Name', 'Current Stock', 'Min Stock', 'Max Stock', 'Status', 'Value'],
          data: [
            ['PRD-001', 'Widget A', 150, 50, 500, 'In Stock', '$15,000.00'],
            ['PRD-002', 'Widget B', 25, 30, 300, 'Low Stock', '$2,500.00'],
            ['PRD-003', 'Widget C', 0, 20, 200, 'Out of Stock', '$0.00'],
            ['PRD-004', 'Widget D', 300, 100, 1000, 'In Stock', '$45,000.00'],
            ['PRD-005', 'Widget E', 75, 50, 250, 'In Stock', '$5,625.00']
          ],
          summary: {
            totalProducts: 5,
            totalValue: '$68,125.00',
            inStock: 3,
            lowStock: 1,
            outOfStock: 1,
            averageStockLevel: '30%'
          }
        };
        break;
      
      case 'stock-movements':
        mockData = {
          title: 'Stock Movements Report',
          dateRange: dateRangeStr,
          columns: ['Date', 'Product', 'Type', 'Quantity', 'From', 'To', 'Reference', 'User'],
          data: [
            ['2024-01-15', 'Widget A', 'Purchase', 100, 'Supplier', 'Warehouse A', 'PO-2024-001', 'John Doe'],
            ['2024-01-16', 'Widget B', 'Sale', -50, 'Warehouse A', 'Customer', 'INV-2024-001', 'Jane Smith'],
            ['2024-01-17', 'Widget C', 'Transfer', 25, 'Warehouse A', 'Warehouse B', 'TRF-2024-001', 'Bob Johnson'],
            ['2024-01-18', 'Widget A', 'Adjustment', -5, 'Warehouse A', 'Damaged', 'ADJ-2024-001', 'Alice Brown'],
            ['2024-01-19', 'Widget D', 'Return', 10, 'Customer', 'Warehouse A', 'RET-2024-001', 'Charlie Wilson']
          ],
          summary: {
            totalMovements: 5,
            totalInbound: 110,
            totalOutbound: -55,
            netChange: 55,
            movementTypes: {
              purchase: 1,
              sale: 1,
              transfer: 1,
              adjustment: 1,
              return: 1
            }
          }
        };
        break;
      
      case 'low-stock':
        mockData = {
          title: 'Low Stock Alert Report',
          dateRange: dateRangeStr,
          columns: ['Product Code', 'Product Name', 'Current Stock', 'Min Stock', 'Days to Stockout', 'Reorder Qty'],
          data: [
            ['PRD-002', 'Widget B', 25, 30, 5, 275],
            ['PRD-006', 'Widget F', 15, 20, 3, 180],
            ['PRD-007', 'Widget G', 8, 15, 1, 142],
            ['PRD-008', 'Widget H', 40, 50, 8, 210],
            ['PRD-009', 'Widget I', 5, 10, 1, 95]
          ],
          summary: {
            criticalItems: 3,
            warningItems: 2,
            totalLowStock: 5,
            estimatedReorderCost: '$45,750.00',
            averageDaysToStockout: 3.6
          }
        };
        break;
      
      case 'stock-valuation':
        mockData = {
          title: 'Stock Valuation Report',
          dateRange: dateRangeStr,
          columns: ['Product Category', 'Total Quantity', 'Average Cost', 'Total Cost', 'Market Value', 'Profit Margin'],
          data: [
            ['Electronics', 500, '$150.00', '$75,000.00', '$112,500.00', '50%'],
            ['Accessories', 1200, '$25.00', '$30,000.00', '$42,000.00', '40%'],
            ['Components', 3500, '$5.00', '$17,500.00', '$26,250.00', '50%'],
            ['Tools', 250, '$80.00', '$20,000.00', '$30,000.00', '50%'],
            ['Supplies', 800, '$10.00', '$8,000.00', '$12,000.00', '50%']
          ],
          summary: {
            totalCategories: 5,
            totalQuantity: 6250,
            totalCostValue: '$150,500.00',
            totalMarketValue: '$222,750.00',
            averageMargin: '48%',
            potentialProfit: '$72,250.00'
          }
        };
        break;

      case 'supplier-performance':
        mockData = {
          title: 'Supplier Performance Report',
          dateRange: dateRangeStr,
          columns: ['Supplier', 'Orders', 'On-Time Delivery', 'Quality Score', 'Total Spend', 'Avg Lead Time'],
          data: [
            ['Acme Supplies', 25, '96%', '4.8/5', '$125,000', '3 days'],
            ['Global Parts Co', 18, '88%', '4.5/5', '$87,500', '5 days'],
            ['Quick Stock Ltd', 32, '92%', '4.6/5', '$156,000', '2 days'],
            ['Reliable Sources', 15, '100%', '4.9/5', '$67,000', '4 days'],
            ['Budget Supplies', 22, '75%', '3.8/5', '$45,000', '7 days']
          ],
          summary: {
            totalSuppliers: 5,
            totalOrders: 112,
            averageOnTime: '90.2%',
            averageQuality: '4.52/5',
            totalSpend: '$480,500',
            bestPerformer: 'Reliable Sources'
          }
        };
        break;

      default:
        mockData = {
          title: 'Inventory Report',
          dateRange: dateRangeStr,
          message: 'Report data not available for this report type'
        };
    }

    setReportData(mockData);
  };

  // Export to PDF
  const exportToPdf = () => {
    if (!reportData) return;

    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(reportData.title, 14, 22);
      
      // Add metadata
      doc.setFontSize(11);
      if (exportSettings.includeDate) {
        doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 32);
      }
      if (exportSettings.includeFilters && reportData.dateRange) {
        doc.text(`Date Range: ${reportData.dateRange}`, 14, 38);
      }
      
      if (reportData.columns && reportData.data) {
        // Add table
        doc.autoTable({
          startY: 45,
          head: [reportData.columns],
          body: reportData.data,
          theme: 'grid',
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          margin: { top: 50 },
          styles: {
            overflow: 'linebreak',
            cellPadding: 3,
            fontSize: 9
          }
        });
        
        // Add summary if available
        if (exportSettings.includeSummary && reportData.summary) {
          const summaryY = doc.lastAutoTable.finalY + 10;
          doc.setFontSize(14);
          doc.text('Summary', 14, summaryY);
          doc.setFontSize(10);
          
          let yOffset = summaryY + 8;
          Object.entries(reportData.summary).forEach(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase());
            doc.text(`${label}: ${value}`, 14, yOffset);
            yOffset += 6;
          });
        }
      }
      
      // Save PDF
      const fileName = `inventory_${reportType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      doc.save(fileName);
      toast.success('Report exported to PDF');
      
      console.log('[InventoryReports] PDF exported:', fileName);
    } catch (error) {
      console.error('[InventoryReports] Error exporting to PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!reportData) return;

    try {
      const wb = XLSX.utils.book_new();
      
      if (reportData.columns && reportData.data) {
        // Main data sheet
        const wsData = [
          reportData.columns,
          ...reportData.data
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Auto-size columns
        const colWidths = reportData.columns.map((col, i) => {
          const maxLength = Math.max(
            col.length,
            ...reportData.data.map(row => String(row[i] || '').length)
          );
          return { wch: Math.min(maxLength + 2, 50) };
        });
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
        
        // Summary sheet
        if (exportSettings.includeSummary && reportData.summary) {
          const summaryData = [
            ['Summary'],
            [''],
            ...Object.entries(reportData.summary).map(([key, value]) => [
              key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
              value
            ])
          ];
          const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
        }
        
        // Report info sheet
        if (exportSettings.includeFilters) {
          const infoData = [
            ['Report Information'],
            [''],
            ['Report Type', reportData.title],
            ['Date Range', reportData.dateRange],
            ['Generated On', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
            ['Generated By', 'Inventory Management System']
          ];
          const infoWs = XLSX.utils.aoa_to_sheet(infoData);
          XLSX.utils.book_append_sheet(wb, infoWs, 'Report Info');
        }
      }
      
      // Save file
      const fileName = `inventory_${reportType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Report exported to Excel');
      
      console.log('[InventoryReports] Excel exported:', fileName);
    } catch (error) {
      console.error('[InventoryReports] Error exporting to Excel:', error);
      toast.error('Failed to export Excel');
    }
  };

  // Render report data table
  const renderReportData = () => {
    if (!reportData) return null;

    return (
      <div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <h2 className="text-2xl font-bold">{reportData.title}</h2>
          <p className="text-blue-100 mt-1">{reportData.dateRange}</p>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {reportData.message ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{reportData.message}</p>
            </div>
          ) : (
            <>
              {/* Data Table */}
              {reportData.columns && reportData.data && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {reportData.columns.map((column, index) => (
                          <th
                            key={index}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {Array.isArray(row) ? (
                            row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {cell}
                              </td>
                            ))
                          ) : (
                            reportData.columns.map((col, cellIndex) => (
                              <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row[col] || '-'}
                              </td>
                            ))
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary Section */}
              {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(reportData.summary).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Export Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={exportSettings.includeFilters}
                  onChange={(e) => setExportSettings({...exportSettings, includeFilters: e.target.checked})}
                />
                <span className="ml-2 text-sm text-gray-600">Include Filters</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={exportSettings.includeSummary}
                  onChange={(e) => setExportSettings({...exportSettings, includeSummary: e.target.checked})}
                />
                <span className="ml-2 text-sm text-gray-600">Include Summary</span>
              </label>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportToPdf}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          Generate comprehensive reports for inventory analysis and insights
        </p>
      </div>

      {/* Report Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Configure Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Report Type */}
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              id="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a report type</option>
              {inventoryReportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={loading || !reportType || !startDate || !endDate}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
              loading || !reportType || !startDate || !endDate
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Report...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {renderReportData()}

      {/* Debug Log */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <p>Debug: Tenant ID: {tenantId}</p>
          <p>Report Type: {reportType}</p>
          <p>Date Range: {startDate} to {endDate}</p>
        </div>
      )}
    </div>
  );
}