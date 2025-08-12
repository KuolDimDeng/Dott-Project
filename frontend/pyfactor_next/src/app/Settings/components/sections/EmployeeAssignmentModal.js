'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  UserGroupIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import StandardSpinner from '@/components/ui/StandardSpinner';

const EmployeeAssignmentModal = ({ isOpen, onClose, geofence, onAssignmentComplete }) => {
  const [employees, setEmployees] = useState([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && geofence) {
      fetchWageEmployees();
      fetchAssignedEmployees();
    }
  }, [isOpen, geofence]);

  const fetchWageEmployees = async () => {
    try {
      console.log('[EmployeeAssignment] Fetching wage employees...');
      // Filter for wage employees only
      const response = await api.get('/api/hr/v2/employees/?compensation_type=WAGE');
      setEmployees(response.data.results || response.data || []);
      console.log('[EmployeeAssignment] Wage employees loaded:', response.data);
    } catch (error) {
      console.error('[EmployeeAssignment] Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchAssignedEmployees = async () => {
    try {
      console.log('[EmployeeAssignment] Fetching assigned employees for geofence:', geofence.id);
      const response = await api.get(`/api/hr/employee-geofences/?geofence_id=${geofence.id}`);
      const assigned = (response.data.results || response.data || []).map(item => item.employee.id);
      setAssignedEmployeeIds(assigned);
      console.log('[EmployeeAssignment] Assigned employees:', assigned);
    } catch (error) {
      console.error('[EmployeeAssignment] Error fetching assignments:', error);
      // Don't show error toast for this - might be empty
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setAssignedEmployeeIds(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('[EmployeeAssignment] Saving assignments:', assignedEmployeeIds);
      await api.post(`/api/hr/geofences/${geofence.id}/assign_employees/`, {
        employee_ids: assignedEmployeeIds
      });
      
      toast.success(`Assigned ${assignedEmployeeIds.length} employees to geofence`);
      if (onAssignmentComplete) {
        onAssignmentComplete(assignedEmployeeIds);
      }
      onClose();
    } catch (error) {
      console.error('[EmployeeAssignment] Error saving assignments:', error);
      const errorMessage = error.response?.data?.error || 'Failed to assign employees';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Assign Employees</h3>
              <p className="text-sm text-gray-600">{geofence?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <StandardSpinner size="lg" />
              <span className="ml-2 text-gray-600">Loading wage employees...</span>
            </div>
          ) : (
            <>
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <ClockIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p><strong>Wage Employees Only:</strong> Only employees with hourly compensation are shown here, as they need to clock in/out at specific locations.</p>
                    <p className="mt-1">Select which employees can clock in at this geofence location.</p>
                  </div>
                </div>
              </div>

              {/* Employee List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No wage employees found.</p>
                    <p className="text-sm mt-1">Only employees with hourly compensation can be assigned to geofences.</p>
                  </div>
                ) : (
                  employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {employee.first_name?.[0]}{employee.last_name?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {employee.job_title || 'No title'} • ${employee.wage_per_hour || '0'}/hour
                          </p>
                        </div>
                      </div>
                      
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignedEmployeeIds.includes(employee.id)}
                          onChange={() => handleEmployeeToggle(employee.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        {assignedEmployeeIds.includes(employee.id) && (
                          <CheckIcon className="h-4 w-4 text-blue-600 ml-1" />
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>

              {employees.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  {assignedEmployeeIds.length} of {employees.length} employees selected
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <StandardSpinner size="small" color="white" className="mr-2" />
                Assigning...
              </>
            ) : (
              `Assign ${assignedEmployeeIds.length} Employees`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAssignmentModal;