'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import api from '@/utils/api';
import StandardSpinner from '@/components/ui/StandardSpinner';

const ViewGeofenceModal = ({ isOpen, onClose, geofence, onEdit }) => {
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && geofence) {
      fetchAssignedEmployees();
    }
  }, [isOpen, geofence]);

  const fetchAssignedEmployees = async () => {
    try {
      console.log('[ViewGeofence] Fetching assigned employees for geofence:', geofence.id);
      const response = await api.get(`/api/hr/employee-geofences/?geofence_id=${geofence.id}`);
      const employees = (response.data.results || response.data || []).map(item => item.employee);
      setAssignedEmployees(employees);
      console.log('[ViewGeofence] Assigned employees loaded:', employees);
    } catch (error) {
      console.error('[ViewGeofence] Error fetching assigned employees:', error);
      setAssignedEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const formatGeofenceType = (type) => {
    return type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  if (!isOpen || !geofence) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <MapPinIcon className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{geofence.name}</h3>
              <p className="text-sm text-gray-600">{formatGeofenceType(geofence.geofence_type)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(geofence);
                  onClose();
                }}
                className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Geofence Details */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Location Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Center:</span>
                    <p className="text-sm font-mono text-gray-900">
                      {geofence.center_latitude?.toFixed(6)}, {geofence.center_longitude?.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Radius:</span>
                    <p className="text-sm text-gray-900">{geofence.radius} meters</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Type:</span>
                    <p className="text-sm text-gray-900">{formatGeofenceType(geofence.geofence_type)}</p>
                  </div>
                </div>
              </div>

              {/* Enforcement Rules */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Enforcement Rules</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    {geofence.enforce_clock_in ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <span className="text-sm text-gray-700">Require location for clock in</span>
                  </div>
                  <div className="flex items-center">
                    {geofence.enforce_clock_out ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <span className="text-sm text-gray-700">Require location for clock out</span>
                  </div>
                  <div className="flex items-center">
                    {geofence.auto_clock_out ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <span className="text-sm text-gray-700">Auto clock-out when leaving</span>
                  </div>
                  <div className="flex items-center">
                    {geofence.alert_on_unexpected_exit ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <span className="text-sm text-gray-700">Alert on unexpected exit</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Employees */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Assigned Employees</h4>
                <span className="text-sm text-gray-500">
                  {loading ? 'Loading...' : `${assignedEmployees.length} assigned`}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <StandardSpinner size="default" />
                  <span className="ml-2 text-sm text-gray-600">Loading employees...</span>
                </div>
              ) : assignedEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No employees assigned</p>
                  <p className="text-xs mt-1">Only wage employees can be assigned to geofences</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {assignedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-700">
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {employee.job_title || 'No title'} • ${employee.wage_per_hour || '0'}/hour
                        </p>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <p className="text-gray-900">
                  {geofence.created_at ? new Date(geofence.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <p className="text-gray-900">
                  {geofence.is_active ? (
                    <span className="inline-flex items-center text-green-700">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-gray-700">
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Inactive
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Created by:</span>
                <p className="text-gray-900">
                  {geofence.created_by?.email || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onEdit(geofence);
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Edit Geofence
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewGeofenceModal;