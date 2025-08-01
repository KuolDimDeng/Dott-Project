'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import timesheetApi from '@/utils/api/timesheetApi';
import StandardSpinner from '@/components/StandardSpinner';
import { toast } from '@/hooks/useToast';

export default function TimeOffRequest({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    request_type: 'vacation',
    start_date: '',
    end_date: '',
    is_full_day: true,
    start_time: '',
    end_time: '',
    reason: ''
  });

  useEffect(() => {
    fetchTimeOffRequests();
  }, []);

  const fetchTimeOffRequests = async () => {
    try {
      setLoading(true);
      const response = await timesheetApi.getTimeOffRequests();
      setRequests(response.results || []);
    } catch (error) {
      console.error('Error fetching time off requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate dates
    if (!formData.start_date || !formData.end_date) {
      toast({
        title: 'Error',
        description: 'Please select start and end dates',
        variant: 'destructive'
      });
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);
      await timesheetApi.createTimeOffRequest(formData);
      toast({
        title: 'Success',
        description: 'Time off request submitted successfully'
      });
      setShowForm(false);
      setFormData({
        request_type: 'vacation',
        start_date: '',
        end_date: '',
        is_full_day: true,
        start_time: '',
        end_time: '',
        reason: ''
      });
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error submitting time off request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit time off request',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || statusClasses.pending}`}>
        {status}
      </span>
    );
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      vacation: 'Vacation',
      sick: 'Sick Leave',
      personal: 'Personal Leave',
      bereavement: 'Bereavement',
      jury_duty: 'Jury Duty',
      unpaid: 'Unpaid Leave',
      other: 'Other'
    };
    return labels[type] || type;
  };

  return (
    <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Time Off Requests</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Time Off Request</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Request Type</label>
                <select
                  name="request_type"
                  value={formData.request_type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="bereavement">Bereavement</option>
                  <option value="jury_duty">Jury Duty</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_full_day"
                  id="is_full_day"
                  checked={formData.is_full_day}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_full_day" className="ml-2 block text-sm text-gray-900">
                  Full day(s) off
                </label>
              </div>

              {!formData.is_full_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleChange}
                      required={!formData.is_full_day}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleChange}
                      required={!formData.is_full_day}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Please provide a reason for your time off request..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submitting ? <StandardSpinner size="sm" className="text-white" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Your Time Off Requests</h3>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  New Request
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <StandardSpinner size="lg" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No time off requests</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new request.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              {getRequestTypeLabel(request.request_type)}
                            </h4>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            <p>
                              {format(new Date(request.start_date), 'MMM d, yyyy')} - 
                              {format(new Date(request.end_date), 'MMM d, yyyy')}
                              {request.is_full_day ? ' (Full day)' : ` (${request.start_time} - ${request.end_time})`}
                            </p>
                            <p className="mt-1">
                              Duration: {request.total_days} day(s) / {request.total_hours} hours
                            </p>
                            {request.reason && (
                              <p className="mt-2 text-gray-700">{request.reason}</p>
                            )}
                            {request.review_notes && (
                              <p className="mt-2 text-sm italic">
                                Review notes: {request.review_notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 text-sm text-gray-500">
                          <p>{format(new Date(request.created_at), 'MMM d, yyyy')}</p>
                          {request.reviewed_at && (
                            <p className="text-xs">
                              Reviewed: {format(new Date(request.reviewed_at), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}