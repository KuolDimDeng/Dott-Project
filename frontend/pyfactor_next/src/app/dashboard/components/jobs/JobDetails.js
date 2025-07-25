'use client';

import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { 
  XMarkIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClockIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const JobDetails = ({ job, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [labor, setLabor] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [costing, setCosting] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job) {
      fetchJobDetails();
    }
  }, [job]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const [materialsData, laborData, expensesData, costingData] = await Promise.all([
        jobService.getJobMaterials(job.id),
        jobService.getJobLabor(job.id),
        jobService.getJobExpenses(job.id),
        jobService.getJobCosting(job.id)
      ]);
      
      setMaterials(materialsData);
      setLabor(laborData);
      setExpenses(expensesData);
      setCosting(costingData);
    } catch (err) {
      logger.error('Error fetching job details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      quote: { color: 'bg-blue-100 text-blue-800', label: 'Quote' },
      scheduled: { color: 'bg-yellow-100 text-yellow-800', label: 'Scheduled' },
      in_progress: { color: 'bg-orange-100 text-orange-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      invoiced: { color: 'bg-purple-100 text-purple-800', label: 'Invoiced' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' }
    };

    const config = statusConfig[status] || statusConfig.quote;
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BriefcaseIcon },
    { id: 'materials', label: 'Materials', icon: CubeIcon },
    { id: 'labor', label: 'Labor', icon: UserGroupIcon },
    { id: 'expenses', label: 'Expenses', icon: DocumentTextIcon },
    { id: 'costing', label: 'Costing', icon: ChartBarIcon }
  ];

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BriefcaseIcon className="h-6 w-6 text-blue-600 mr-2" />
                {job.job_number} - {job.name}
              </h3>
              <div className="mt-1 flex items-center space-x-4">
                {getStatusBadge(job.status)}
                <span className="text-sm text-gray-500">
                  Created {formatDate(job.created_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onEdit}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Edit Job
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center">
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Job Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Job Information</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Customer:</dt>
                          <dd className="text-gray-900">{job.customer?.name || 'N/A'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Location:</dt>
                          <dd className="text-gray-900">{job.location || 'N/A'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Quoted Amount:</dt>
                          <dd className="text-gray-900 font-medium">{formatCurrency(job.quoted_amount)}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Dates */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Important Dates</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Quote Date:</dt>
                          <dd className="text-gray-900">{formatDate(job.quote_date)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Scheduled Date:</dt>
                          <dd className="text-gray-900">{formatDate(job.scheduled_date)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Start Date:</dt>
                          <dd className="text-gray-900">{formatDate(job.start_date)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Completion Date:</dt>
                          <dd className="text-gray-900">{formatDate(job.completion_date)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Description */}
                  {job.description && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {job.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Materials Tab */}
              {activeTab === 'materials' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Materials Used</h4>
                  {materials.length === 0 ? (
                    <p className="text-gray-500">No materials added yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Material
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {materials.map((material) => (
                            <tr key={material.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {material.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {material.quantity} {material.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(material.unit_cost)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {formatCurrency(material.total_cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Labor Tab */}
              {activeTab === 'labor' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Labor Hours</h4>
                  {labor.length === 0 ? (
                    <p className="text-gray-500">No labor entries added yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Hours
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {labor.map((entry) => (
                            <tr key={entry.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.employee_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(entry.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.hours}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(entry.hourly_rate)}/hr
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {formatCurrency(entry.total_cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Other Expenses</h4>
                  {expenses.length === 0 ? (
                    <p className="text-gray-500">No expenses added yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {expenses.map((expense) => (
                            <tr key={expense.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {expense.category}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(expense.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {formatCurrency(expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Costing Tab */}
              {activeTab === 'costing' && costing && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cost Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Cost Summary</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Material Costs:</dt>
                          <dd className="text-gray-900">{formatCurrency(costing.material_cost)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Labor Costs:</dt>
                          <dd className="text-gray-900">{formatCurrency(costing.labor_cost)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Other Expenses:</dt>
                          <dd className="text-gray-900">{formatCurrency(costing.expense_cost)}</dd>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <dt className="text-gray-700 font-medium">Total Cost:</dt>
                          <dd className="text-gray-900 font-medium">{formatCurrency(costing.total_cost)}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Profit Analysis */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Profit Analysis</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Quoted Amount:</dt>
                          <dd className="text-gray-900">{formatCurrency(job.quoted_amount)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Total Cost:</dt>
                          <dd className="text-gray-900">{formatCurrency(costing.total_cost)}</dd>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <dt className="text-gray-700 font-medium">Profit:</dt>
                          <dd className={`font-medium ${costing.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(costing.profit)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Profit Margin:</dt>
                          <dd className={`font-medium ${costing.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {costing.profit_margin?.toFixed(2)}%
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;