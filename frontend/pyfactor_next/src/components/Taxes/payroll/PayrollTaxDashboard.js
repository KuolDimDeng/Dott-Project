'use client';

// PayrollTaxDashboard - Main dashboard for payroll tax management
// Updated to use Tailwind CSS instead of MUI
import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  DocumentTextIcon, 
  CalculatorIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@components/ui/StandardSpinner';

const PayrollTaxDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [activeTab, setActiveTab] = useState('forms');

  useEffect(() => {
    fetchPayrollTaxData();
  }, []);

  const fetchPayrollTaxData = async () => {
    try {
      setLoading(true);
      // Fetch data from API
      const [formsRes, depositsRes, deadlinesRes] = await Promise.all([
        fetch('/api/taxes/payroll/forms'),
        fetch('/api/taxes/payroll/deposits'),
        fetch('/api/taxes/payroll/deadlines')
      ]);

      if (formsRes.ok) {
        const formsData = await formsRes.json();
        setForms(formsData);
      }

      if (depositsRes.ok) {
        const depositsData = await depositsRes.json();
        setDeposits(depositsData);
      }

      if (deadlinesRes.ok) {
        const deadlinesData = await deadlinesRes.json();
        setUpcomingDeadlines(deadlinesData);
      }
    } catch (error) {
      console.error('Error fetching payroll tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    {
      title: 'Form 941',
      value: 'Q3 2024',
      icon: DocumentTextIcon,
      status: 'current',
      description: 'Quarterly Employment Tax'
    },
    {
      title: 'Form 940',
      value: '2024',
      icon: DocumentTextIcon,
      status: 'upcoming',
      description: 'Annual FUTA Tax Return'
    },
    {
      title: 'Next Deposit Due',
      value: '7/15/2024',
      icon: CalendarIcon,
      status: 'warning',
      description: 'Federal Tax Deposit'
    },
    {
      title: 'YTD Tax Liability',
      value: '$45,678',
      icon: CalculatorIcon,
      status: 'info',
      description: 'Total payroll taxes'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'current':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'forms', label: 'Tax Forms', icon: DocumentTextIcon },
    { id: 'deposits', label: 'Tax Deposits', icon: BuildingOfficeIcon },
    { id: 'deadlines', label: 'Deadlines', icon: CalendarIcon },
    { id: 'calculate', label: 'Calculate', icon: CalculatorIcon }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black flex items-center">
          <CalculatorIcon className="h-6 w-6 text-blue-600 mr-2" />
          Payroll Tax Management
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <card.icon className="h-8 w-8 text-blue-600" />
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(card.status)}`}>
                {card.status.toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            <p className="text-xs text-gray-500 mt-2">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Payroll Tax Forms</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Generate Form
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Form 941</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Q3 2024</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          In Progress
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">10/31/2024</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                        <button className="text-blue-600 hover:text-blue-800">
                          <ArrowDownTrayIcon className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Form 941</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Q2 2024</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Filed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">7/31/2024</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-blue-600 hover:text-blue-800 mr-3">View</button>
                        <button className="text-blue-600 hover:text-blue-800">
                          <ArrowDownTrayIcon className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Deposits Tab */}
          {activeTab === 'deposits' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Federal Tax Deposits</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Record Deposit
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deposit Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confirmation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">7/15/2024</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Federal Income & FICA</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">$8,456.23</td>
                      <td className="px-4 py-3 text-sm text-gray-500">EFTPS-123456</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">6/30/2024</td>
                      <td className="px-4 py-3 text-sm text-gray-500">Federal Income & FICA</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">$9,234.56</td>
                      <td className="px-4 py-3 text-sm text-gray-500">EFTPS-123455</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Deadlines Tab */}
          {activeTab === 'deadlines' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Upcoming Tax Deadlines</h2>
              
              <div className="space-y-3">
                {[
                  { date: '7/15/2024', title: 'Federal Tax Deposit', type: 'Monthly Depositor', status: 'due_soon' },
                  { date: '7/31/2024', title: 'Form 941 - Q2 2024', type: 'Quarterly Return', status: 'upcoming' },
                  { date: '8/15/2024', title: 'Federal Tax Deposit', type: 'Monthly Depositor', status: 'upcoming' },
                  { date: '10/31/2024', title: 'Form 941 - Q3 2024', type: 'Quarterly Return', status: 'upcoming' }
                ].map((deadline, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {deadline.status === 'due_soon' ? (
                        <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-3" />
                      ) : (
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{deadline.title}</p>
                        <p className="text-sm text-gray-500">{deadline.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${deadline.status === 'due_soon' ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {deadline.date}
                      </p>
                      <p className="text-xs text-gray-500">
                        {deadline.status === 'due_soon' ? 'Due Soon' : 'Upcoming'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calculate Tab */}
          {activeTab === 'calculate' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Calculate Payroll Taxes</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Quick Calculator</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gross Wages
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pay Period
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option>Weekly</option>
                        <option>Bi-weekly</option>
                        <option>Semi-monthly</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Calculate Taxes
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Results</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Federal Income Tax</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Social Security (6.2%)</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Medicare (1.45%)</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">State Income Tax</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold">
                      <span>Total Employee Taxes</span>
                      <span>$0.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollTaxDashboard;