'use client';


import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const InventoryReportsManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('inventory-valuation');
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    location: '',
    category: '',
    includeZeroStock: false
  });

  // Sample data for reports
  const sampleReports = {
    'inventory-valuation': [
      { id: 'P001', name: 'Widget A', sku: 'WIDG-A', category: 'Widgets', onHand: 150, unitCost: '$12.50', totalValue: '$1,875.00', location: 'Main Warehouse' },
      { id: 'P002', name: 'Widget B', sku: 'WIDG-B', category: 'Widgets', onHand: 235, unitCost: '$14.75', totalValue: '$3,466.25', location: 'Main Warehouse' },
      { id: 'P003', name: 'Gadget C', sku: 'GADG-C', category: 'Gadgets', onHand: 85, unitCost: '$24.99', totalValue: '$2,124.15', location: 'East Coast Distribution' },
      { id: 'P004', name: 'Gadget D', sku: 'GADG-D', category: 'Gadgets', onHand: 42, unitCost: '$32.50', totalValue: '$1,365.00', location: 'East Coast Distribution' },
      { id: 'P005', name: 'Accessory E', sku: 'ACC-E', category: 'Accessories', onHand: 320, unitCost: '$5.99', totalValue: '$1,916.80', location: 'Main Warehouse' },
    ],
    'stock-levels': [
      { id: 'P001', name: 'Widget A', sku: 'WIDG-A', category: 'Widgets', onHand: 150, minStock: 50, maxStock: 200, reorderPoint: 75, status: 'OK' },
      { id: 'P002', name: 'Widget B', sku: 'WIDG-B', category: 'Widgets', onHand: 235, minStock: 100, maxStock: 300, reorderPoint: 150, status: 'OK' },
      { id: 'P003', name: 'Gadget C', sku: 'GADG-C', category: 'Gadgets', onHand: 35, minStock: 40, maxStock: 120, reorderPoint: 60, status: 'Low' },
      { id: 'P004', name: 'Gadget D', sku: 'GADG-D', category: 'Gadgets', onHand: 0, minStock: 20, maxStock: 60, reorderPoint: 30, status: 'Out of Stock' },
      { id: 'P005', name: 'Accessory E', sku: 'ACC-E', category: 'Accessories', onHand: 320, minStock: 200, maxStock: 500, reorderPoint: 250, status: 'OK' },
    ],
    'movement-analysis': [
      { id: 'P001', name: 'Widget A', sku: 'WIDG-A', category: 'Widgets', opening: 130, received: 50, sold: 30, adjusted: 0, closing: 150 },
      { id: 'P002', name: 'Widget B', sku: 'WIDG-B', category: 'Widgets', opening: 200, received: 75, sold: 40, adjusted: 0, closing: 235 },
      { id: 'P003', name: 'Gadget C', sku: 'GADG-C', category: 'Gadgets', opening: 100, received: 25, sold: 38, adjusted: -2, closing: 85 },
      { id: 'P004', name: 'Gadget D', sku: 'GADG-D', category: 'Gadgets', opening: 55, received: 0, sold: 13, adjusted: 0, closing: 42 },
      { id: 'P005', name: 'Accessory E', sku: 'ACC-E', category: 'Accessories', opening: 270, received: 150, sold: 97, adjusted: -3, closing: 320 },
    ],
    'turnover-report': [
      { id: 'P001', name: 'Widget A', sku: 'WIDG-A', category: 'Widgets', avgStock: 140, unitsSold: 145, turnoverRate: '1.04', daysToSell: 87 },
      { id: 'P002', name: 'Widget B', sku: 'WIDG-B', category: 'Widgets', avgStock: 215, unitsSold: 320, turnoverRate: '1.49', daysToSell: 61 },
      { id: 'P003', name: 'Gadget C', sku: 'GADG-C', category: 'Gadgets', avgStock: 92, unitsSold: 410, turnoverRate: '4.46', daysToSell: 20 },
      { id: 'P004', name: 'Gadget D', sku: 'GADG-D', category: 'Gadgets', avgStock: 48, unitsSold: 72, turnoverRate: '1.50', daysToSell: 60 },
      { id: 'P005', name: 'Accessory E', sku: 'ACC-E', category: 'Accessories', avgStock: 295, unitsSold: 1240, turnoverRate: '4.20', daysToSell: 22 },
    ]
  };

  const reportTypes = [
    { value: 'inventory-valuation', label: 'Inventory Valuation Report' },
    { value: 'stock-levels', label: 'Stock Levels Report' },
    { value: 'movement-analysis', label: 'Inventory Movement Analysis' },
    { value: 'turnover-report', label: 'Inventory Turnover Report' }
  ];

  useEffect(() => {
    generateReport();
  }, [selectedReport]); // Generate report when selected report changes

  const generateReport = async () => {
    try {
      setIsLoading(true);
      console.log(`[InventoryReportsManagement] Generating ${selectedReport} report...`);
      
      // In a real app, this would be an API call with filters
      // For now, we'll use the sample data
      setTimeout(() => {
        setReportData(sampleReports[selectedReport] || []);
        setIsLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('[InventoryReportsManagement] Error generating report:', error);
      setReportData([]);
      toast.error('Failed to generate report. Please try again.');
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleApplyFilters = () => {
    // In a real app, this would regenerate the report with filters
    toast.success('Filters applied! Generating updated report...');
    generateReport();
  };

  const handleExportReport = (format) => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`);
    // In a real app, this would trigger a download
    setTimeout(() => {
      toast.success(`Report exported as ${format.toUpperCase()} successfully!`);
    }, 1500);
  };

  const renderReportFilters = () => {
    return (
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h3 className="text-lg font-medium mb-3">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Locations</option>
              <option value="main">Main Warehouse</option>
              <option value="east">East Coast Distribution</option>
              <option value="west">West Retail Store</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Categories</option>
              <option value="widgets">Widgets</option>
              <option value="gadgets">Gadgets</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeZeroStock"
              name="includeZeroStock"
              checked={filters.includeZeroStock}
              onChange={handleFilterChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="includeZeroStock" className="ml-2 block text-sm text-gray-700">
              Include zero stock items
            </label>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleApplyFilters}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    );
  };

  const renderInventoryValuationReport = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center p-6 text-gray-500">
          No inventory valuation data available.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full h-16 border-gray-300 border-b py-8 bg-gray-50">
              <th className="text-left pl-4">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">SKU</th>
              <th className="text-left">Category</th>
              <th className="text-right">On Hand</th>
              <th className="text-right">Unit Cost</th>
              <th className="text-right">Total Value</th>
              <th className="text-left">Location</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, index) => (
              <tr key={item.id || index} className="h-16 border-gray-300 border-b hover:bg-gray-50">
                <td className="pl-4 font-medium">{item.id}</td>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.category}</td>
                <td className="text-right">{item.onHand}</td>
                <td className="text-right">{item.unitCost}</td>
                <td className="text-right font-medium">{item.totalValue}</td>
                <td>{item.location}</td>
              </tr>
            ))}
            <tr className="h-16 bg-gray-50 font-semibold">
              <td colSpan="6" className="pl-4 text-right">Total Inventory Value:</td>
              <td className="text-right">$10,747.20</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderStockLevelsReport = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center p-6 text-gray-500">
          No stock levels data available.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full h-16 border-gray-300 border-b py-8 bg-gray-50">
              <th className="text-left pl-4">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">SKU</th>
              <th className="text-left">Category</th>
              <th className="text-right">On Hand</th>
              <th className="text-right">Min Stock</th>
              <th className="text-right">Max Stock</th>
              <th className="text-right">Reorder Point</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, index) => (
              <tr key={item.id || index} className="h-16 border-gray-300 border-b hover:bg-gray-50">
                <td className="pl-4 font-medium">{item.id}</td>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.category}</td>
                <td className="text-right">{item.onHand}</td>
                <td className="text-right">{item.minStock}</td>
                <td className="text-right">{item.maxStock}</td>
                <td className="text-right">{item.reorderPoint}</td>
                <td className="text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.status === 'OK' ? 'bg-green-100 text-green-800' : 
                    item.status === 'Low' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMovementAnalysisReport = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center p-6 text-gray-500">
          No movement analysis data available.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full h-16 border-gray-300 border-b py-8 bg-gray-50">
              <th className="text-left pl-4">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">SKU</th>
              <th className="text-left">Category</th>
              <th className="text-right">Opening Stock</th>
              <th className="text-right">Received</th>
              <th className="text-right">Sold</th>
              <th className="text-right">Adjusted</th>
              <th className="text-right">Closing Stock</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, index) => (
              <tr key={item.id || index} className="h-16 border-gray-300 border-b hover:bg-gray-50">
                <td className="pl-4 font-medium">{item.id}</td>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.category}</td>
                <td className="text-right">{item.opening}</td>
                <td className="text-right text-green-600">{item.received}</td>
                <td className="text-right text-red-600">{item.sold}</td>
                <td className="text-right">{item.adjusted}</td>
                <td className="text-right font-medium">{item.closing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTurnoverReport = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center p-6 text-gray-500">
          No turnover data available.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full h-16 border-gray-300 border-b py-8 bg-gray-50">
              <th className="text-left pl-4">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">SKU</th>
              <th className="text-left">Category</th>
              <th className="text-right">Avg. Stock</th>
              <th className="text-right">Units Sold</th>
              <th className="text-right">Turnover Rate</th>
              <th className="text-right">Days to Sell</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, index) => (
              <tr key={item.id || index} className="h-16 border-gray-300 border-b hover:bg-gray-50">
                <td className="pl-4 font-medium">{item.id}</td>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.category}</td>
                <td className="text-right">{item.avgStock}</td>
                <td className="text-right">{item.unitsSold}</td>
                <td className="text-right font-medium">{item.turnoverRate}</td>
                <td className="text-right">{item.daysToSell}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Generating report...</p>
          </div>
        </div>
      );
    }

    switch (selectedReport) {
      case 'inventory-valuation':
        return renderInventoryValuationReport();
      case 'stock-levels':
        return renderStockLevelsReport();
      case 'movement-analysis':
        return renderMovementAnalysisReport();
      case 'turnover-report':
        return renderTurnoverReport();
      default:
        return (
          <div className="text-center p-6 text-gray-500">
            Please select a report type.
          </div>
        );
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Inventory Reports</h1>
      
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="mb-4 md:mb-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExportReport('pdf')}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
              <button
                onClick={() => handleExportReport('excel')}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={() => handleExportReport('csv')}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          {renderReportFilters()}
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
};

export default InventoryReportsManagement; 