'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon,
  CheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import StandardSpinner from '@/components/ui/StandardSpinner';

const InlineEmployeeAssignment = ({ geofence, onComplete, onSkip }) => {
  const [employees, setEmployees] = useState([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (geofence) {
      fetchWageEmployees();
      fetchAssignedEmployees();
    }
  }, [geofence]);

  const fetchWageEmployees = async () => {
    try {
      console.log('[InlineEmployeeAssignment] Fetching wage employees...');
      // Filter for wage employees only
      const response = await api.get('/api/hr/v2/employees/?compensation_type=WAGE');
      setEmployees(response.data.results || response.data || []);
      console.log('[InlineEmployeeAssignment] Wage employees loaded:', response.data);
    } catch (error) {
      console.error('[InlineEmployeeAssignment] Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchAssignedEmployees = async () => {
    try {
      console.log('[InlineEmployeeAssignment] Fetching assigned employees for geofence:', geofence.id);
      const response = await api.get(`/api/hr/employee-geofences/?geofence_id=${geofence.id}`);
      const assigned = (response.data.results || response.data || []).map(item => item.employee.id);
      setAssignedEmployeeIds(assigned);
      console.log('[InlineEmployeeAssignment] Assigned employees:', assigned);
    } catch (error) {
      console.error('[InlineEmployeeAssignment] Error fetching assignments:', error);
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
      console.log('[InlineEmployeeAssignment] Saving assignments:', assignedEmployeeIds);
      await api.post(`/api/hr/geofences/${geofence.id}/assign_employees/`, {
        employee_ids: assignedEmployeeIds
      });
      
      if (onComplete) {
        onComplete(assignedEmployeeIds);
      }
    } catch (error) {
      console.error('[InlineEmployeeAssignment] Error saving assignments:', error);
      const errorMessage = error.response?.data?.error || 'Failed to assign employees';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
      {/* Success Header */}
      <div className="flex items-center mb-6">
        <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mr-4">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Geofence Created
        </div>
        <ArrowRightIcon className="h-4 w-4 text-gray-400 mr-4" />
        <div className="flex items-center">
          <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Assign Employees</h3>
            <p className="text-sm text-gray-600">{geofence?.name}</p>
          </div>
        </div>
      </div>

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
          <div className="space-y-3 max-h-64 overflow-y-auto mb-6">
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
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEmployeeToggle(employee.id)}
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
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={assignedEmployeeIds.includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    {assignedEmployeeIds.includes(employee.id) && (
                      <CheckIcon className="h-4 w-4 text-blue-600 ml-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {employees.length > 0 && (
            <div className="mb-6 text-sm text-gray-600">
              {assignedEmployeeIds.length} of {employees.length} employees selected
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onSkip}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Skip for Now
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
        </>
      )}
    </div>
  );
};

export default InlineEmployeeAssignment;