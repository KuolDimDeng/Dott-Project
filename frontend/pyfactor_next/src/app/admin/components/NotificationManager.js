'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  BellIcon,
  PlusIcon,
  PaperAirplaneIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAdminAuth } from '../hooks/useAdminAuth';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

export default function NotificationManager({ adminUser }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    page_size: 20
  });
  

  useEffect(() => {
    loadNotifications();
    loadTemplates();
  }, [pagination.current_page]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/proxy/admin/notifications?page=${pagination.current_page}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Error loading notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/proxy/admin/templates', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'scheduled':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'sending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'sent':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!adminUser.can_send_notifications) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to manage notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BellIcon className="h-6 w-6 mr-2 text-blue-600" />
            Notification Management
          </h2>
          <p className="text-gray-600">Create and send notifications to users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Notification
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <CenteredSpinner size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No notifications created yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Create your first notification
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getPriorityColor(notification.priority)}`}></span>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {notification.title}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Created by {notification.created_by} • {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-900 capitalize">
                            {notification.target_type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {notification.total_recipients} recipients
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(notification.status)}>
                        {notification.status}
                      </span>
                      {notification.scheduled_for && (
                        <p className="text-xs text-gray-500 mt-1">
                          <ClockIcon className="h-3 w-3 inline mr-1" />
                          {new Date(notification.scheduled_for).toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {notification.status === 'sent' && (
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="w-16">Delivered:</span>
                            <span>{notification.delivered_count}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="w-16">Read:</span>
                            <span>{notification.read_count}</span>
                            <span className="ml-1 text-gray-400">
                              ({Math.round((notification.read_count / notification.total_recipients) * 100)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors">
                          <EyeIcon className="h-3 w-3 mr-1" />
                          View
                        </button>
                        {notification.status === 'draft' && (
                          <SendNotificationButton 
                            notificationId={notification.id}
                            onSent={loadNotifications}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to{' '}
                  {Math.min(pagination.current_page * pagination.page_size, pagination.total_count)} of{' '}
                  {pagination.total_count} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {pagination.current_page} of {pagination.total_pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                    disabled={pagination.current_page === pagination.total_pages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <CreateNotificationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={loadNotifications}
          templates={templates}
        />
      )}
    </div>
  );
}

function SendNotificationButton({ notificationId, onSent }) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this notification? This action cannot be undone.')) {
      return;
    }

    try {
      setIsSending(true);
      
      const response = await fetch(`/api/admin/proxy/admin/notifications/${notificationId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        onSent();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Error sending notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={isSending}
      className="flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
    >
      {isSending ? (
        <StandardSpinner size="small" className="mr-1" />
      ) : (
        <PaperAirplaneIcon className="h-3 w-3 mr-1" />
      )}
      {isSending ? 'Sending...' : 'Send'}
    </button>
  );
}

function CreateNotificationModal({ onClose, onCreate, templates }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    icon_type: 'info',
    target_type: 'all_users',
    target_criteria: {},
    priority: 'medium',
    send_email: false,
    send_push: false,
    auto_dismiss_after: '',
    scheduled_for: '',
    expires_at: '',
    action_button_text: '',
    action_button_url: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.title_template,
        message: template.message_template,
        icon_type: template.icon_type,
        priority: template.priority,
      }));
      setSelectedTemplate(templateId);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    if (formData.target_type === 'specific_users' && !formData.target_criteria.emails) {
      newErrors.target_criteria = 'Email addresses are required for specific users';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/admin/proxy/admin/notifications/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          auto_dismiss_after: formData.auto_dismiss_after ? parseInt(formData.auto_dismiss_after) : null,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Notification created successfully');
        onCreate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Error creating notification');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Create New Notification
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <ExclamationCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Use Template (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Notification title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.message ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Notification message"
            />
            {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Icon Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon Type
              </label>
              <select
                name="icon_type"
                value={formData.icon_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Audience
            </label>
            <select
              name="target_type"
              value={formData.target_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all_users">All Users</option>
              <option value="specific_users">Specific Users</option>
              <option value="by_plan">By Subscription Plan</option>
              <option value="by_role">By User Role</option>
              <option value="active_users">Active Users Only</option>
            </select>
          </div>

          {/* Specific Users Email Input */}
          {formData.target_type === 'specific_users' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Addresses *
              </label>
              <textarea
                value={formData.target_criteria.emails?.join('\n') || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  target_criteria: {
                    ...prev.target_criteria,
                    emails: e.target.value.split('\n').filter(email => email.trim())
                  }
                }))}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.target_criteria ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email addresses, one per line"
              />
              {errors.target_criteria && <p className="mt-1 text-sm text-red-600">{errors.target_criteria}</p>}
            </div>
          )}

          {/* Delivery Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Delivery Options
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="send_email"
                  checked={formData.send_email}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Send Email</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="send_push"
                  checked={formData.send_push}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Push Notification</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <>
                    <StandardSpinner size="small" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Create Notification
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}