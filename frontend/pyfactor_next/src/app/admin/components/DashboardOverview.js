'use client';

import React from 'react';
import { 
  BellIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';

export default function DashboardOverview({ data, onRefresh }) {
  if (!data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <StandardSpinner size="large" />
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Notifications',
      value: data.stats.notifications.total,
      change: data.stats.notifications.sent_today,
      changeLabel: 'sent today',
      icon: BellIcon,
      color: 'blue',
    },
    {
      name: 'Active Users',
      value: data.stats.users.total,
      change: data.stats.users.active_today,
      changeLabel: 'active today',
      icon: UserGroupIcon,
      color: 'green',
    },
    {
      name: 'Tax Feedback',
      value: data.stats.feedback.total,
      change: data.stats.feedback.pending,
      changeLabel: 'pending review',
      icon: ChatBubbleLeftRightIcon,
      color: 'yellow',
    },
    {
      name: 'Avg Read Rate',
      value: `${data.stats.engagement.avg_read_rate}%`,
      change: data.stats.engagement.notifications_this_month,
      changeLabel: 'notifications this month',
      icon: ChartBarIcon,
      color: 'purple',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600">Monitor system activity and user engagement</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshIcon className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium text-${stat.color}-600`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">{stat.changeLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BellIcon className="h-5 w-5 mr-2 text-blue-600" />
              Recent Notifications
            </h3>
          </div>
          <div className="p-6">
            {data.recent_notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No notifications yet</p>
            ) : (
              <div className="space-y-4">
                {data.recent_notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className={`p-2 rounded-lg ${getStatusColor(notification.status)}`}>
                      {notification.status === 'sent' ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {notification.total_recipients} recipients • {notification.read_count} read
                      </p>
                      <p className="text-xs text-gray-400">
                        by {notification.created_by} • {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      notification.status === 'sent' 
                        ? 'bg-green-100 text-green-800'
                        : notification.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {notification.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Recent Tax Feedback
            </h3>
          </div>
          <div className="p-6">
            {data.recent_feedback.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No feedback yet</p>
            ) : (
              <div className="space-y-4">
                {data.recent_feedback.map((feedback) => (
                  <div key={feedback.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className={`p-2 rounded-lg ${getFeedbackTypeColor(feedback.feedback_type)}`}>
                      <ExclamationTriangleIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {feedback.feedback_type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {feedback.city}, {feedback.state_province}, {feedback.country}
                      </p>
                      <p className="text-xs text-gray-400">
                        by {feedback.submitted_by} • {new Date(feedback.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      feedback.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : feedback.status === 'reviewed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {feedback.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <BellIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-blue-900">Send Notification</p>
              <p className="text-sm text-blue-700">Create and send messages to users</p>
            </div>
          </button>
          
          <button className="flex items-center p-4 text-left bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-yellow-900">Review Feedback</p>
              <p className="text-sm text-yellow-700">Check pending tax feedback</p>
            </div>
          </button>
          
          <button className="flex items-center p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <UserGroupIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-900">Manage Users</p>
              <p className="text-sm text-green-700">View and manage user accounts</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'sent':
      return 'bg-green-100 text-green-600';
    case 'draft':
      return 'bg-gray-100 text-gray-600';
    case 'scheduled':
      return 'bg-blue-100 text-blue-600';
    case 'failed':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getFeedbackTypeColor(type) {
  switch (type) {
    case 'inaccurate':
      return 'bg-red-100 text-red-600';
    case 'partially_accurate':
      return 'bg-yellow-100 text-yellow-600';
    case 'missing_taxes':
      return 'bg-blue-100 text-blue-600';
    case 'outdated':
      return 'bg-orange-100 text-orange-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}