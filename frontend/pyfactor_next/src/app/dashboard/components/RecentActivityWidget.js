'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSecureTenantId } from '@/utils/tenantUtils';

const RecentActivityWidget = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const tenantId = await getSecureTenantId();
      const response = await fetch(`/api/audit/logs?tenant_id=${tenantId}&limit=5`);
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      CREATE: '➕',
      UPDATE: '✏️',
      DELETE: '🗑️',
      LOGIN: '🔑',
      LOGOUT: '🚪',
      VIEW: '👁️',
      EXPORT: '📤',
      IMPORT: '📥',
    };
    return icons[action] || '📋';
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: 'text-green-600 bg-green-50',
      UPDATE: 'text-blue-600 bg-blue-50',
      DELETE: 'text-red-600 bg-red-50',
      LOGIN: 'text-purple-600 bg-purple-50',
      LOGOUT: 'text-gray-600 bg-gray-50',
    };
    return colors[action] || 'text-gray-600 bg-gray-50';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button
            onClick={() => router.push('/settings/security')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500 text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm ${getActionColor(activity.action)}`}>
                  {getActionIcon(activity.action)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user_display_name || 'System'}</span>
                    {' '}
                    <span className="text-gray-600">
                      {activity.action.toLowerCase()}d {activity.object_type.toLowerCase()}
                    </span>
                    {activity.object_repr && (
                      <span className="text-gray-900"> "{activity.object_repr}"</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(activity.timestamp)}
                    {activity.ip_address && (
                      <span className="ml-2">• {activity.ip_address}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => router.push('/settings/security')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View full audit trail</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivityWidget;