'use client';

import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const AuditTrailManagement = () => {
  const [auditTrails, setAuditTrails] = useState([]);
  const [filteredAuditTrails, setFilteredAuditTrails] = useState([]);
  const [selectedAuditTrail, setSelectedAuditTrail] = useState(null);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    user: '',
    actionType: '',
    transactionType: '',
  });

  useEffect(() => {
    fetchAuditTrails();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditTrails, filters]);

  const fetchAuditTrails = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/audit-trail/');
      setAuditTrails(response.data);
    } catch (error) {
      console.error('Error fetching audit trails:', error);
    }
  };

  const applyFilters = () => {
    let filtered = auditTrails;
    if (filters.startDate) {
      filtered = filtered.filter((trail) => new Date(trail.date_time) >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter((trail) => new Date(trail.date_time) <= filters.endDate);
    }
    if (filters.user) {
      filtered = filtered.filter((trail) =>
        trail.user_name.toLowerCase().includes(filters.user.toLowerCase())
      );
    }
    if (filters.actionType) {
      filtered = filtered.filter((trail) => trail.action_type === filters.actionType);
    }
    if (filters.transactionType) {
      filtered = filtered.filter((trail) =>
        trail.transaction_type.toLowerCase().includes(filters.transactionType.toLowerCase())
      );
    }
    setFilteredAuditTrails(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleRowClick = (trail) => {
    setSelectedAuditTrail(trail);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const renderActivityChart = () => {
    const data = {
      labels: ['Create', 'Modify', 'Delete', 'Approve'],
      datasets: [
        {
          label: 'Action Types',
          data: [
            filteredAuditTrails.filter((trail) => trail.action_type === 'create').length,
            filteredAuditTrails.filter((trail) => trail.action_type === 'modify').length,
            filteredAuditTrails.filter((trail) => trail.action_type === 'delete').length,
            filteredAuditTrails.filter((trail) => trail.action_type === 'approve').length,
          ],
          backgroundColor: 'rgba(75,192,192,0.6)',
        },
      ],
    };

    const options = {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Actions',
          },
        },
      },
    };

    return <Bar data={data} options={options} />;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2 flex items-center">
            <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Audit Trail Management
          </h2>
          <p className="text-gray-600 text-sm">Track and review all system activities, changes, and transactions for compliance and security purposes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formatDate(filters.startDate)}
              onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formatDate(filters.endDate)}
              onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              placeholder="Filter by user"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
              value={filters.actionType}
              onChange={(e) => handleFilterChange('actionType', e.target.value)}
            >
              <option value="">All</option>
              <option value="create">Create</option>
              <option value="modify">Modify</option>
              <option value="delete">Delete</option>
              <option value="approve">Approve</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.transactionType}
              onChange={(e) => handleFilterChange('transactionType', e.target.value)}
              placeholder="Filter by transaction type"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAuditTrails.length > 0 ? (
                    filteredAuditTrails.map((trail) => (
                      <tr
                        key={trail.id}
                        onClick={() => handleRowClick(trail)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(trail.date_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trail.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trail.action_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trail.transaction_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trail.transaction_type}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No audit trail records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:col-span-1">
            {selectedAuditTrail ? (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-3">Audit Trail Details</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Date & Time:</span>{' '}
                    {new Date(selectedAuditTrail.date_time).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">User:</span> {selectedAuditTrail.user_name}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Action:</span> {selectedAuditTrail.action_type}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Transaction ID:</span>{' '}
                    {selectedAuditTrail.transaction_id}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Transaction Type:</span>{' '}
                    {selectedAuditTrail.transaction_type}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Affected Accounts:</span>{' '}
                    {selectedAuditTrail.affected_accounts}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Old Value:</span> {selectedAuditTrail.old_value}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">New Value:</span> {selectedAuditTrail.new_value}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Approval Status:</span>{' '}
                    {selectedAuditTrail.approval_status}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Notes:</span> {selectedAuditTrail.notes}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">IP Address:</span>{' '}
                    {selectedAuditTrail.ip_address}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Module:</span> {selectedAuditTrail.module}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">Select an audit trail entry to view details</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-medium mb-4">Activity Summary</h3>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            {renderActivityChart()}
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => console.log('Export functionality to be implemented')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Export Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailManagement;