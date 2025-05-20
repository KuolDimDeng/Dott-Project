'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';

const CRMReportsPage = () => {
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState('leads-by-source');

  const handleReportChange = (report) => {
    setSelectedReport(report);
  };

  const handleExportReport = () => {
    alert(`Exporting ${selectedReport} report`);
  };

  // List of available reports
  const reportOptions = [
    { id: 'leads-by-source', name: 'Leads by Source', description: 'Analysis of lead sources and their conversion rates' },
    { id: 'sales-pipeline', name: 'Sales Pipeline', description: 'Overview of sales pipeline by stage and value' },
    { id: 'contact-activity', name: 'Contact Activity', description: 'Activity tracking for contacts in your CRM' },
    { id: 'campaign-performance', name: 'Campaign Performance', description: 'Performance metrics for marketing campaigns' },
    { id: 'deal-conversion', name: 'Deal Conversion', description: 'Conversion rates from opportunities to closed deals' },
    { id: 'revenue-forecast', name: 'Revenue Forecast', description: 'Projected revenue based on pipeline and probabilities' }
  ];

  // Report data examples (mock data)
  const reportData = {
    'leads-by-source': {
      title: 'Leads by Source',
      type: 'bar',
      data: [
        { source: 'Website', count: 45, conversionRate: 15 },
        { source: 'Referral', count: 32, conversionRate: 22 },
        { source: 'Social Media', count: 28, conversionRate: 8 },
        { source: 'Email Campaign', count: 24, conversionRate: 12 },
        { source: 'Trade Show', count: 18, conversionRate: 18 },
        { source: 'Cold Call', count: 12, conversionRate: 5 }
      ]
    },
    'sales-pipeline': {
      title: 'Sales Pipeline',
      type: 'funnel',
      data: [
        { stage: 'Qualification', count: 45, value: 675000 },
        { stage: 'Needs Analysis', count: 30, value: 450000 },
        { stage: 'Proposal', count: 20, value: 300000 },
        { stage: 'Negotiation', count: 15, value: 225000 },
        { stage: 'Closed Won', count: 10, value: 150000 }
      ]
    },
    'contact-activity': {
      title: 'Contact Activity',
      type: 'table',
      data: [
        { activity: 'Emails Sent', count: 450, conversionImpact: 'Medium' },
        { activity: 'Calls Made', count: 320, conversionImpact: 'High' },
        { activity: 'Meetings Held', count: 120, conversionImpact: 'Very High' },
        { activity: 'Website Visits', count: 780, conversionImpact: 'Low' },
        { activity: 'Document Downloads', count: 230, conversionImpact: 'Medium' }
      ]
    },
    'campaign-performance': {
      title: 'Campaign Performance',
      type: 'bar',
      data: [
        { campaign: 'Q4 Product Launch', sent: 1500, opened: 750, clicked: 300, converted: 45 },
        { campaign: 'Healthcare Outreach', sent: 1200, opened: 480, clicked: 180, converted: 30 },
        { campaign: 'Trade Show Follow-up', sent: 500, opened: 320, clicked: 180, converted: 35 },
        { campaign: 'Enterprise Webinar', sent: 1000, opened: 450, clicked: 200, converted: 15 }
      ]
    },
    'deal-conversion': {
      title: 'Deal Conversion',
      type: 'pie',
      data: [
        { status: 'Won', count: 24, percentage: 40 },
        { status: 'Lost', count: 18, percentage: 30 },
        { status: 'Pending', count: 18, percentage: 30 }
      ]
    },
    'revenue-forecast': {
      title: 'Revenue Forecast',
      type: 'line',
      data: [
        { month: 'Jan', projected: 120000, actual: 115000 },
        { month: 'Feb', projected: 135000, actual: 140000 },
        { month: 'Mar', projected: 150000, actual: 145000 },
        { month: 'Apr', projected: 145000, actual: 130000 },
        { month: 'May', projected: 160000, actual: 170000 },
        { month: 'Jun', projected: 175000, actual: 180000 }
      ]
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  // Render appropriate report based on selection
  const renderReportContent = () => {
    const report = reportData[selectedReport];
    
    if (!report) {
      return (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-500">Please select a report to view</p>
        </div>
      );
    }

    switch (report.type) {
      case 'bar':
        if (selectedReport === 'leads-by-source') {
          return (
            <div className="bg-white dark:bg-blue-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-700">{report.title}</h3>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Leads: 159</p>
                  <p className="text-sm text-gray-600">Average Conversion Rate: 13.3%</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-blue-600 rounded-full" style={{ width: '13.3%' }}></div>
                </div>
              </div>
              <div className="space-y-4">
                {report.data.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{item.source}</span>
                      <span className="text-gray-600">{item.count} leads</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Conversion Rate</span>
                      <span className="text-green-500">{item.conversionRate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div 
                        className="h-2 bg-blue-400 rounded-full" 
                        style={{ width: `${(item.count / 45) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else {
          // Campaign Performance
          return (
            <div className="bg-white dark:bg-blue-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-700">{report.title}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Campaign</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Sent</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Open Rate</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Click Rate</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.data.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{item.campaign}</td>
                        <td className="px-4 py-3 text-sm">{item.sent}</td>
                        <td className="px-4 py-3 text-sm">{Math.round((item.opened / item.sent) * 100)}%</td>
                        <td className="px-4 py-3 text-sm">{Math.round((item.clicked / item.opened) * 100)}%</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          {Math.round((item.converted / item.sent) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">Performance Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Average Open Rate</p>
                    <p className="text-xl font-bold text-blue-500">40%</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Average Click Rate</p>
                    <p className="text-xl font-bold text-purple-500">45%</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Average Conversion</p>
                    <p className="text-xl font-bold text-green-500">3%</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      
      case 'funnel':
        return (
          <div className="bg-white dark:bg-blue-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-700">{report.title}</h3>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Opportunities: {report.data[0].count}</p>
                <p className="text-sm text-gray-600">Pipeline Value: {formatCurrency(report.data[0].value)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {report.data.map((item, index) => (
                <div key={index} className="relative">
                  <div 
                    className={`p-4 rounded-lg ${
                      index === 0 ? 'bg-blue-50' : 
                      index === report.data.length - 1 ? 'bg-green-50' : 
                      'bg-indigo-50'
                    }`}
                    style={{ width: `${(item.count / report.data[0].count) * 100}%` }}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{item.stage}</span>
                      <span>{item.count} deals</span>
                    </div>
                    <p className="text-sm text-gray-600">{formatCurrency(item.value)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">Conversion Rate</h4>
                <p className="text-2xl font-bold text-green-500">
                  {Math.round((report.data[report.data.length - 1].count / report.data[0].count) * 100)}%
                </p>
                <p className="text-sm text-gray-500">From qualification to closed won</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">Average Deal Size</h4>
                <p className="text-2xl font-bold text-blue-500">
                  {formatCurrency(report.data[report.data.length - 1].value / report.data[report.data.length - 1].count)}
                </p>
                <p className="text-sm text-gray-500">Based on closed won deals</p>
              </div>
            </div>
          </div>
        );
        
      case 'table':
        return (
          <div className="bg-white dark:bg-blue-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-700">{report.title}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Activity Type</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Count</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Conversion Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.data.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{item.activity}</td>
                      <td className="px-4 py-3 text-sm">{item.count}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.conversionImpact === 'Very High' ? 'bg-green-50 text-green-600' :
                          item.conversionImpact === 'High' ? 'bg-blue-50 text-blue-600' :
                          item.conversionImpact === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {item.conversionImpact}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-600 mb-1">Key Insight</h4>
              <p className="text-gray-700">
                Direct interactions like meetings and calls have the highest impact on conversion rates. 
                Consider allocating more resources to these high-impact activities.
              </p>
            </div>
          </div>
        );
        
      case 'pie':
        return (
          <div className="bg-white dark:bg-blue-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-700">{report.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex justify-center items-center">
                <div className="relative h-64 w-64">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-lg font-medium text-gray-700">60 Deals</p>
                  </div>
                  <svg viewBox="0 0 36 36" className="w-full h-full">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeDasharray="40, 100"
                      strokeDashoffset="0"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="3"
                      strokeDasharray="30, 100"
                      strokeDashoffset="40"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="3"
                      strokeDasharray="30, 100"
                      strokeDashoffset="70"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <div className="space-y-4">
                  {report.data.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`h-4 w-4 rounded-full mr-2 ${
                        item.status === 'Won' ? 'bg-green-400' :
                        item.status === 'Lost' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.status}</span>
                          <span>{item.count} deals ({item.percentage}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                          <div 
                            className={`h-1.5 rounded-full ${
                              item.status === 'Won' ? 'bg-green-400' :
                              item.status === 'Lost' ? 'bg-red-400' : 'bg-yellow-400'
                            }`} 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">Win Rate</h4>
                  <p className="text-2xl font-bold text-green-500">40%</p>
                  <p className="text-sm text-gray-500">Historical deal conversion rate</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'line':
        return (
          <div className="bg-white dark:bg-blue-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-700">{report.title}</h3>
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 rounded-full bg-blue-400 mr-1"></div>
                <span className="text-sm text-gray-600 mr-4">Projected</span>
                <div className="h-3 w-3 rounded-full bg-green-400 mr-1"></div>
                <span className="text-sm text-gray-600">Actual</span>
              </div>
              <div className="h-64 relative">
                {/* Line graph would typically be implemented with a charting library */}
                <div className="absolute bottom-0 left-0 w-full h-full flex flex-col justify-end">
                  <div className="w-full border-t border-gray-200 h-8 mb-6 relative">
                    {report.data.map((item, index) => (
                      <div key={index} className="absolute" style={{ left: `${index * (100 / (report.data.length - 1))}%`, bottom: '0' }}>
                        <div className="text-xs text-gray-500 -ml-4">{item.month}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end justify-between h-48 relative pb-8">
                    {report.data.map((item, index) => {
                      const maxValue = Math.max(...report.data.map(d => Math.max(d.projected, d.actual)));
                      const projectedHeight = (item.projected / maxValue) * 100;
                      const actualHeight = (item.actual / maxValue) * 100;
                      
                      return (
                        <div key={index} className="flex items-end space-x-1 mx-1" style={{ height: '100%' }}>
                          <div className="bg-blue-400 w-3" style={{ height: `${projectedHeight}%` }}></div>
                          <div className="bg-green-400 w-3" style={{ height: `${actualHeight}%` }}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 mb-1">YTD Revenue</h4>
                <p className="text-xl font-bold text-green-500">{formatCurrency(880000)}</p>
                <p className="text-sm text-gray-500">Total revenue year to date</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Projected Q3 Revenue</h4>
                <p className="text-xl font-bold text-blue-500">{formatCurrency(510000)}</p>
                <p className="text-sm text-gray-500">Based on current pipeline</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Forecast Accuracy</h4>
                <p className="text-xl font-bold text-purple-500">96.7%</p>
                <p className="text-sm text-gray-500">Avg. accuracy this year</p>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-500">Report type not supported</p>
          </div>
        );
    }
  };

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-700">CRM Reports</h1>
          <div className="flex space-x-3">
            <button 
              onClick={handleExportReport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Export Report
            </button>
            <button 
              onClick={() => {}}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Share Report
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-blue-50 rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-700 mb-4">Available Reports</h2>
              <div className="space-y-2">
                {reportOptions.map(report => (
                  <div 
                    key={report.id} 
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedReport === report.id 
                        ? 'bg-blue-50 dark:bg-blue-100 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-blue-100'
                    }`}
                    onClick={() => handleReportChange(report.id)}
                  >
                    <h3 className="font-medium text-gray-800 dark:text-gray-700">{report.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-600 mt-1">{report.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-3">
            {renderReportContent()}
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default CRMReportsPage;