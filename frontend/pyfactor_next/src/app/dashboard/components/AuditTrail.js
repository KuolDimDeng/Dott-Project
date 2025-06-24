'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { getSecureTenantId } from '@/utils/tenantUtils';

const AuditTrail = ({ modelName = null, objectId = null, showAll = false }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    action: '',
    user: '',
    startDate: '',
    endDate: ''
  });

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const tenantId = await getSecureTenantId();
      
      let url = '/api/audit/logs?';
      const params = new URLSearchParams();
      
      if (modelName) params.append('model_name', modelName);
      if (objectId) params.append('object_id', objectId);
      if (filter.action) params.append('action', filter.action);
      if (filter.user) params.append('user', filter.user);
      if (filter.startDate) params.append('start_date', filter.startDate);
      if (filter.endDate) params.append('end_date', filter.endDate);
      
      const response = await fetch(url + params.toString(), {
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setAuditLogs(data.results || data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit history');
    } finally {
      setLoading(false);
    }
  }, [modelName, objectId, filter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const getActionColor = (action) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'viewed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'created':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'updated':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case 'deleted':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
    }
  };

  const renderChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0) return null;
    
    return (
      <div className="mt-2 text-sm">
        <div className="font-medium text-gray-700">Changes:</div>
        <div className="mt-1 space-y-1">
          {Object.entries(changes).map(([field, values]) => (
            <div key={field} className="flex">
              <span className="font-medium text-gray-600">{field}:</span>
              <span className="ml-2 text-gray-500">
                {values.old} → {values.new}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showAll && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filter.action}
                onChange={(e) => setFilter({...filter, action: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="viewed">Viewed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <input
                type="text"
                value={filter.user}
                onChange={(e) => setFilter({...filter, user: e.target.value})}
                placeholder="Search by user..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({...filter, startDate: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter({...filter, endDate: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit history found
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8 p-4">
              {auditLogs.map((log, idx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {idx !== auditLogs.length - 1 && (
                      <span
                        className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className={`relative px-1.5 py-1.5 rounded-full ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {log.user_email || 'System'}
                          </span>{' '}
                          <span className="text-gray-500">
                            {log.action} {log.model_name}
                          </span>
                          {log.object_repr && (
                            <span className="font-medium text-gray-900">
                              {' '}&quot;{log.object_repr}&quot;
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 space-x-4">
                          <span>
                            {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                          </span>
                          {log.ip_address && (
                            <span>IP: {log.ip_address}</span>
                          )}
                        </div>
                        {log.changes && renderChanges(log.changes)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;