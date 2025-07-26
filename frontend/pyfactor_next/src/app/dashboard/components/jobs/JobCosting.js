'use client';

import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const JobCosting = ({ jobs = [] }) => {
  // Ensure jobs is always an array
  const jobsList = Array.isArray(jobs) ? jobs : [];
  const [selectedJob, setSelectedJob] = useState(null);
  const [costingData, setCostingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (selectedJob) {
      fetchJobCosting();
    }
  }, [selectedJob]);

  const fetchJobCosting = async () => {
    if (!selectedJob) return;
    
    setLoading(true);
    try {
      const costing = await jobService.getJobCosting(selectedJob.id);
      setCostingData(costing);
    } catch (err) {
      logger.error('Error fetching job costing:', err);
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

  const calculateTotals = () => {
    const totals = {
      totalQuoted: 0,
      totalCost: 0,
      totalProfit: 0,
      jobCount: 0,
      completedCount: 0
    };

    jobs.forEach(job => {
      if (job.status !== 'cancelled' && job.status !== 'closed') {
        totals.totalQuoted += job.quoted_amount || 0;
        totals.totalCost += job.total_cost || 0;
        totals.jobCount++;
        if (job.status === 'completed' || job.status === 'paid') {
          totals.completedCount++;
        }
      }
    });

    totals.totalProfit = totals.totalQuoted - totals.totalCost;
    totals.profitMargin = totals.totalQuoted > 0 
      ? ((totals.totalProfit / totals.totalQuoted) * 100).toFixed(2)
      : 0;

    return totals;
  };

  const totals = calculateTotals();

  const getMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-4">
          <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
          Job Costing Analysis
        </h2>
        <p className="text-gray-600">
          Track costs, profits, and margins for all your jobs
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quoted</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalQuoted)}</p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Costs</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalCost)}</p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.totalProfit)}
              </p>
            </div>
            {totals.totalProfit >= 0 ? (
              <ArrowTrendingUpIcon className="h-12 w-12 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="h-12 w-12 text-red-500" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className={`text-2xl font-bold ${getMarginColor(totals.profitMargin)}`}>
                {totals.profitMargin}%
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Job Selection and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Select a Job</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {jobsList.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No jobs available</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {jobsList.map((job) => (
                  <li
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                      selectedJob?.id === job.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.job_number}</p>
                        <p className="text-sm text-gray-600">{job.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{job.customer?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(job.quoted_amount)}
                        </p>
                        {job.total_cost && (
                          <p className="text-xs text-gray-500">
                            Cost: {formatCurrency(job.total_cost)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Costing Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedJob ? `Costing: ${selectedJob.job_number}` : 'Costing Details'}
            </h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : selectedJob && costingData ? (
              <div className="space-y-4">
                {/* Cost Breakdown */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Cost Breakdown</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-600">Materials</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatCurrency(costingData.material_cost || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-600">Labor</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatCurrency(costingData.labor_cost || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-600">Other Expenses</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatCurrency(costingData.expense_cost || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 font-medium">
                      <dt className="text-gray-900">Total Cost</dt>
                      <dd className="text-gray-900">
                        {formatCurrency(costingData.total_cost || 0)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Profit Analysis */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Profit Analysis</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-600">Quoted Amount</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedJob.quoted_amount || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <dt className="text-sm text-gray-600">Total Cost</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatCurrency(costingData.total_cost || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 font-medium">
                      <dt className="text-gray-900">Profit</dt>
                      <dd className={costingData.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(costingData.profit || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-sm text-gray-600">Profit Margin</dt>
                      <dd className={`text-sm font-medium ${getMarginColor(costingData.profit_margin)}`}>
                        {costingData.profit_margin?.toFixed(2)}%
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Warnings */}
                {costingData.profit_margin < 15 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h5 className="text-sm font-medium text-yellow-800">Low Profit Margin</h5>
                        <p className="mt-1 text-sm text-yellow-700">
                          This job has a profit margin below 15%. Consider reviewing costs or adjusting the quote for future similar jobs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 " />
                <p className="mt-2 text-sm text-gray-500">
                  Select a job to view costing details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cost Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Benchmarks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Target Material Cost</p>
            <p className="text-2xl font-bold text-gray-900">30-40%</p>
            <p className="text-xs text-gray-500">of quoted amount</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Target Labor Cost</p>
            <p className="text-2xl font-bold text-gray-900">35-45%</p>
            <p className="text-xs text-gray-500">of quoted amount</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Target Profit Margin</p>
            <p className="text-2xl font-bold text-green-600">20-30%</p>
            <p className="text-xs text-gray-500">minimum recommended</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCosting;