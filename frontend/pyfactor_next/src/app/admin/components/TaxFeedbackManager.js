'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ChatBubbleLeftRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAdminAuth } from '../hooks/useAdminAuth';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

export default function TaxFeedbackManager({ adminUser }) {
  const [feedback, setFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    country: 'all',
    feedback_type: 'all',
    search: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    feedback_types: [],
    statuses: []
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    page_size: 20
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  

  useEffect(() => {
    loadFeedback();
  }, [filters, pagination.current_page]);

  const loadFeedback = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.current_page.toString(),
        page_size: pagination.page_size.toString(),
        ...filters
      });

      const response = await fetch(`/api/admin/proxy/admin/feedback?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback);
        setPagination(data.pagination);
        setFilterOptions(data.filter_options);
      } else {
        toast.error('Failed to load feedback');
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Error loading feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({
      ...prev,
      current_page: 1
    }));
  };

  const handleStatusUpdate = async (feedbackId, newStatus, resolutionNotes = '') => {
    try {
      setUpdateLoading(true);
      
      const response = await fetch(`/api/admin/proxy/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          resolution_notes: resolutionNotes
        }),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Feedback updated successfully');
        loadFeedback();
        setShowDetailModal(false);
      } else {
        toast.error('Failed to update feedback');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Error updating feedback');
    } finally {
      setUpdateLoading(false);
    }
  };

  const openDetailModal = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowDetailModal(true);
  };

  const getFeedbackTypeIcon = (type) => {
    switch (type) {
      case 'inaccurate':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'partially_accurate':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'missing_taxes':
        return <DocumentTextIcon className="h-5 w-5 text-blue-600" />;
      case 'outdated':
        return <ClockIcon className="h-5 w-5 text-orange-600" />;
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'reviewed':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'resolved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'invalid':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2 text-yellow-600" />
            Tax Feedback Management
          </h2>
          <p className="text-gray-600">Review and manage user reports about tax rate accuracy</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {pagination.total_count} feedback items
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search feedback..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {filterOptions.statuses.map(status => (
              <option key={status} value={status} className="capitalize">
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Country Filter */}
          <select
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Countries</option>
            {filterOptions.countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>

          {/* Feedback Type Filter */}
          <select
            value={filters.feedback_type}
            onChange={(e) => handleFilterChange('feedback_type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {filterOptions.feedback_types.map(type => (
              <option key={type} value={type} className="capitalize">
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <CenteredSpinner size="large" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No feedback found matching your filters</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feedback Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="mr-3 mt-1">
                          {getFeedbackTypeIcon(item.feedback_type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {item.feedback_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {item.feedback_details}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            AI Confidence: {item.ai_confidence_score || 'N/A'}%
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-900">{item.city}</p>
                          <p className="text-xs text-gray-500">
                            {item.state_province}, {item.country}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-900">{item.submitted_by}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(item.status)}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openDetailModal(item)}
                        className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </button>
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

      {/* Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setShowDetailModal(false)}
          onStatusUpdate={handleStatusUpdate}
          isLoading={updateLoading}
        />
      )}
    </div>
  );
}

function FeedbackDetailModal({ feedback, onClose, onStatusUpdate, isLoading }) {
  const [resolution, setResolution] = useState(feedback.resolution_notes || '');

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Feedback Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Feedback Type</h4>
              <p className="text-gray-600 capitalize">{feedback.feedback_type.replace('_', ' ')}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Location</h4>
              <p className="text-gray-600">
                {feedback.city}, {feedback.state_province}, {feedback.country}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Submitted By</h4>
              <p className="text-gray-600">{feedback.submitted_by}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Date</h4>
              <p className="text-gray-600">{new Date(feedback.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Feedback Details */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Feedback Details</h4>
            <p className="text-gray-600 p-3 bg-gray-50 rounded-lg">{feedback.feedback_details}</p>
          </div>

          {/* Inaccurate Fields */}
          {feedback.inaccurate_fields && feedback.inaccurate_fields.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Inaccurate Fields</h4>
              <div className="flex flex-wrap gap-2">
                {feedback.inaccurate_fields.map((field, index) => (
                  <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Sources */}
          {feedback.suggested_sources && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Suggested Sources</h4>
              <p className="text-gray-600 p-3 bg-gray-50 rounded-lg">{feedback.suggested_sources}</p>
            </div>
          )}

          {/* Displayed Rates */}
          {feedback.displayed_rates && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tax Rates Shown to User</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(feedback.displayed_rates, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Resolution */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Resolution Notes</h4>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add resolution notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => onStatusUpdate(feedback.id, 'reviewed', resolution)}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <StandardSpinner size="small" className="mr-2" /> : null}
              Mark as Reviewed
            </button>
            <button
              onClick={() => onStatusUpdate(feedback.id, 'resolved', resolution)}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? <StandardSpinner size="small" className="mr-2" /> : null}
              Mark as Resolved
            </button>
            <button
              onClick={() => onStatusUpdate(feedback.id, 'invalid', resolution)}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? <StandardSpinner size="small" className="mr-2" /> : null}
              Mark as Invalid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}