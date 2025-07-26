'use client';

import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { 
  ChartBarIcon,
  BriefcaseIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const JobProfitability = ({ jobs = [] }) => {
  // Ensure jobs is always an array
  const jobsList = Array.isArray(jobs) ? jobs : [];
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchProfitabilityData();
  }, [dateRange, filterStatus]);

  const fetchProfitabilityData = async () => {
    setLoading(true);
    try {
      const data = await jobService.getJobProfitability({
        start_date: dateRange.start,
        end_date: dateRange.end,
        status: filterStatus === 'all' ? undefined : filterStatus
      });
      setProfitabilityData(data);
    } catch (err) {
      logger.error('Error fetching profitability data:', err);
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

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarginBgColor = (margin) => {
    if (margin >= 30) return 'bg-green-50 border-green-200';
    if (margin >= 15) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // Calculate aggregate data from jobs
  const calculateAggregateData = () => {
    let totalRevenue = 0;
    let totalCost = 0;
    let completedJobs = 0;
    let profitableJobs = 0;
    let unprofitableJobs = 0;

    const filteredJobs = jobsList.filter(job => {
      const jobDate = new Date(job.created_at);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      if (jobDate < startDate || jobDate > endDate) return false;
      if (filterStatus !== 'all' && job.status !== filterStatus) return false;
      
      return true;
    });

    filteredJobs.forEach(job => {
      if (job.status === 'completed' || job.status === 'paid') {
        completedJobs++;
        totalRevenue += job.quoted_amount || 0;
        totalCost += job.total_cost || 0;
        
        const profit = (job.quoted_amount || 0) - (job.total_cost || 0);
        if (profit > 0) {
          profitableJobs++;
        } else if (profit < 0) {
          unprofitableJobs++;
        }
      }
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      completedJobs,
      profitableJobs,
      unprofitableJobs,
      averageJobValue: completedJobs > 0 ? totalRevenue / completedJobs : 0,
      averageProfit: completedJobs > 0 ? totalProfit / completedJobs : 0
    };
  };

  const aggregateData = calculateAggregateData();

  // Get top performing jobs
  const getTopJobs = () => {
    return jobs
      .filter(job => job.status === 'completed' || job.status === 'paid')
      .map(job => ({
        ...job,
        profit: (job.quoted_amount || 0) - (job.total_cost || 0),
        margin: job.quoted_amount > 0 
          ? (((job.quoted_amount - (job.total_cost || 0)) / job.quoted_amount) * 100)
          : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  };

  // Get bottom performing jobs
  const getBottomJobs = () => {
    return jobs
      .filter(job => job.status === 'completed' || job.status === 'paid')
      .map(job => ({
        ...job,
        profit: (job.quoted_amount || 0) - (job.total_cost || 0),
        margin: job.quoted_amount > 0 
          ? (((job.quoted_amount - (job.total_cost || 0)) / job.quoted_amount) * 100)
          : 0
      }))
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 5);
  };

  const topJobs = getTopJobs();
  const bottomJobs = getBottomJobs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 text-white flex items-center mb-4">
          <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
          Profitability Analysis
        </h2>
        <p className="text-gray-600 text-gray-400">
          Analyze job profitability trends and identify opportunities for improvement
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="paid">Paid</option>
              <option value="invoiced">Invoiced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(aggregateData.totalRevenue)}</p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className={`text-2xl font-bold ${aggregateData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(aggregateData.totalProfit)}
              </p>
            </div>
            {aggregateData.totalProfit >= 0 ? (
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
              <p className={`text-2xl font-bold ${getMarginColor(aggregateData.profitMargin)}`}>
                {formatPercent(aggregateData.profitMargin)}
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Job Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(aggregateData.averageJobValue)}
              </p>
            </div>
            <BriefcaseIcon className="h-12 w-12 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Job Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-10 w-10 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{aggregateData.profitableJobs}</p>
              <p className="text-sm text-gray-600">Profitable Jobs</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-10 w-10 text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{aggregateData.unprofitableJobs}</p>
              <p className="text-sm text-gray-600">Unprofitable Jobs</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-10 w-10 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(aggregateData.averageProfit)}</p>
              <p className="text-sm text-gray-600">Average Profit per Job</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-500 mr-2" />
              Top Performing Jobs
            </h3>
          </div>
          <div className="p-6">
            {topJobs.length === 0 ? (
              <p className="text-gray-500 text-center">No completed jobs in this period</p>
            ) : (
              <div className="space-y-4">
                {topJobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{job.job_number}</p>
                        <p className="text-sm text-gray-600">{job.name}</p>
                        <p className="text-xs text-gray-500">{job.customer?.name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMarginBgColor(job.margin)}`}>
                        {formatPercent(job.margin)} margin
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue: {formatCurrency(job.quoted_amount)}</span>
                      <span className="font-medium text-green-600">Profit: {formatCurrency(job.profit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              Jobs Needing Attention
            </h3>
          </div>
          <div className="p-6">
            {bottomJobs.length === 0 ? (
              <p className="text-gray-500 text-center">No completed jobs in this period</p>
            ) : (
              <div className="space-y-4">
                {bottomJobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{job.job_number}</p>
                        <p className="text-sm text-gray-600">{job.name}</p>
                        <p className="text-xs text-gray-500">{job.customer?.name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMarginBgColor(job.margin)}`}>
                        {formatPercent(job.margin)} margin
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue: {formatCurrency(job.quoted_amount)}</span>
                      <span className={`font-medium ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {job.profit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(job.profit))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profitability Insights</h3>
        <div className="space-y-4">
          {aggregateData.profitMargin < 20 && (
            <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Low Overall Profit Margin</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your average profit margin of {formatPercent(aggregateData.profitMargin)} is below the recommended 20-30%. 
                  Consider reviewing your pricing strategy or finding ways to reduce costs.
                </p>
              </div>
            </div>
          )}
          
          {aggregateData.unprofitableJobs > aggregateData.profitableJobs * 0.2 && (
            <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">High Rate of Unprofitable Jobs</p>
                <p className="text-sm text-red-700 mt-1">
                  {aggregateData.unprofitableJobs} out of {aggregateData.completedJobs} completed jobs were unprofitable. 
                  Review your quoting process and cost estimation accuracy.
                </p>
              </div>
            </div>
          )}
          
          {aggregateData.profitMargin >= 20 && aggregateData.unprofitableJobs <= aggregateData.profitableJobs * 0.1 && (
            <div className="flex items-start p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Strong Profitability Performance</p>
                <p className="text-sm text-green-700 mt-1">
                  Your business is maintaining healthy profit margins. Keep up the good work and consider 
                  documenting your successful practices for consistency.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobProfitability;