'use client';

import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

const PermissionAuditLog = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    start_date: '',
    end_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await fetch(`/api/auth/rbac/audit-logs?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.results || data);
      }
    } catch (error) {
      logger.error('[PermissionAuditLog] Error fetching audit logs:', error);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary statistics
  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/auth/rbac/audit-logs/summary', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      logger.error('[PermissionAuditLog] Error fetching summary:', error);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchSummary();
  }, []);

  // Apply filters
  const applyFilters = () => {
    fetchAuditLogs();
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      start_date: '',
      end_date: ''
    });
    fetchAuditLogs();
  };

  // Export audit logs
  const exportAuditLogs = () => {
    const csv = [
      ['Date', 'User', 'Action', 'Changed By', 'Reason', 'IP Address'],
      ...auditLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user_email,
        log.action,
        log.changed_by_name || 'System',
        log.change_reason || '-',
        log.ip_address || '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Get action badge color
  const getActionBadgeColor = (action) => {
    const colors = {
      'GRANT': 'bg-green-100 text-green-800',
      'REVOKE': 'bg-red-100 text-red-800',
      'MODIFY': 'bg-yellow-100 text-yellow-800',
      'TEMPLATE_APPLY': 'bg-blue-100 text-blue-800',
      'BULK_UPDATE': 'bg-purple-100 text-purple-800',
      'DELEGATION': 'bg-indigo-100 text-indigo-800',
      'TEMP_GRANT': 'bg-orange-100 text-orange-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  // Format changes summary
  const formatChangesSummary = (log) => {
    if (log.changes_summary) {
      return log.changes_summary;
    }
    
    const oldPerms = Object.keys(log.old_permissions || {}).length;
    const newPerms = Object.keys(log.new_permissions || {}).length;
    
    if (log.action === 'GRANT') {
      return `Added ${newPerms} permissions`;
    } else if (log.action === 'REVOKE') {
      return `Removed ${oldPerms} permissions`;
    } else if (log.action === 'MODIFY') {
      return `Modified permissions (${oldPerms} → ${newPerms})`;
    }
    
    return 'Permission change';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Permission Audit Log</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track all permission changes and administrative actions
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={exportAuditLogs}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={fetchAuditLogs}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Changes</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.total_changes}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Last 7 Days</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.recent_activity}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Grants</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.action_counts?.GRANT || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Revokes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.action_counts?.REVOKE || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Action Type</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Actions</option>
                <option value="GRANT">Permission Granted</option>
                <option value="REVOKE">Permission Revoked</option>
                <option value="MODIFY">Permission Modified</option>
                <option value="TEMPLATE_APPLY">Template Applied</option>
                <option value="BULK_UPDATE">Bulk Update</option>
                <option value="DELEGATION">Permission Delegated</option>
                <option value="TEMP_GRANT">Temporary Grant</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={applyFilters}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Changes
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Changed By
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                  <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No audit logs found</p>
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div>{new Date(log.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.user_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">{log.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>
                      <div>{formatChangesSummary(log)}</div>
                      {log.change_reason && (
                        <div className="text-xs text-gray-400 mt-1">
                          Reason: {log.change_reason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.changed_by_name || 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ip_address || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionAuditLog;