'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon, CheckIcon, FunnelIcon, MagnifyingGlassIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { formatDistanceToNow, isAfter, subDays } from 'date-fns';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'react-hot-toast';
import StandardSpinner from '@/components/ui/StandardSpinner';

const NotificationsPage = () => {
  const router = useRouter();
  const { 
    notifications: allNotifications, 
    loading: notificationsLoading, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  // Fetch all notifications (not just unread)
  useEffect(() => {
    const loadAllNotifications = async () => {
      setLoading(true);
      try {
        await fetchNotifications({ 
          unreadOnly: false, 
          limit: 100,
          force: true 
        });
      } finally {
        setLoading(false);
      }
    };
    loadAllNotifications();
  }, []);

  // Filter notifications based on 90-day retention and user filters
  useEffect(() => {
    let filtered = [...allNotifications];
    
    // Filter by 90-day retention
    const ninetyDaysAgo = subDays(new Date(), 90);
    filtered = filtered.filter(n => 
      isAfter(new Date(n.created_at), ninetyDaysAgo)
    );

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === selectedPriority);
    }

    // Filter by status
    if (selectedStatus === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (selectedStatus === 'read') {
      filtered = filtered.filter(n => n.is_read);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredNotifications(filtered);
    setNotifications(filtered.slice(0, page * pageSize));
    setHasMore(filtered.length > page * pageSize);
  }, [allNotifications, selectedCategory, selectedPriority, selectedStatus, searchQuery, page]);

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
    toast.success('Notification marked as read');
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <InformationCircleIcon className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'announcement': 'bg-blue-100 text-blue-800',
      'update': 'bg-green-100 text-green-800',
      'alert': 'bg-red-100 text-red-800',
      'promotion': 'bg-purple-100 text-purple-800',
      'system': 'bg-gray-100 text-gray-800',
      'tax': 'bg-yellow-100 text-yellow-800',
      'payment': 'bg-indigo-100 text-indigo-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.default;
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'announcement', label: 'Announcements' },
    { value: 'update', label: 'Updates' },
    { value: 'alert', label: 'Alerts' },
    { value: 'promotion', label: 'Promotions' },
    { value: 'system', label: 'System' },
    { value: 'tax', label: 'Tax Updates' },
    { value: 'payment', label: 'Payments' }
  ];

  const priorities = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' }
  ];

  const statuses = [
    { value: 'all', label: 'All Messages' },
    { value: 'unread', label: 'Unread Only' },
    { value: 'read', label: 'Read Only' }
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading || notificationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BellIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-600 mt-1">
                Stay updated with important messages and alerts (last 90 days)
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <CheckIcon className="mr-2 h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active filters summary */}
        {(selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all' || searchQuery) && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <FunnelIcon className="h-4 w-4 mr-2" />
            <span>
              Showing {notifications.length} of {filteredNotifications.length} notifications
            </span>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all'
                ? 'No notifications match your filters.'
                : 'You're all caught up!'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors duration-150 ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Priority Icon */}
                  <div className="flex-shrink-0">
                    {getPriorityIcon(notification.priority)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                        {notification.category && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getCategoryColor(notification.category)
                          }`}>
                            {notification.category}
                          </span>
                        )}
                        {!notification.is_read && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="mt-2 text-sm text-gray-600">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="mr-1 h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </div>

                      <div className="flex items-center space-x-2">
                        {notification.action_button_text && notification.action_button_url && (
                          <button
                            onClick={() => router.push(notification.action_button_url)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            {notification.action_button_text}
                          </button>
                        )}
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Load More */}
        {hasMore && notifications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleLoadMore}
              className="w-full text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Load more notifications
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Notification Retention</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Notifications are automatically removed after 90 days to keep your inbox clean and relevant.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;