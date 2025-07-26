'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon,
  CheckIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import StandardSpinner from '@/components/ui/StandardSpinner';

const InlineEmployeeAssignment = ({ geofence, onAssignmentComplete, isExpanded, onToggleExpand }) => {
  const [employees, setEmployees] = useState([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState([]);
  const [originalAssignedIds, setOriginalAssignedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isExpanded && geofence) {
      console.log('🎯 [InlineEmployeeAssignment] === COMPONENT LOAD START ===');
      console.log('🎯 [InlineEmployeeAssignment] Geofence:', geofence);
      fetchWageEmployees();
      fetchAssignedEmployees();
    }
  }, [isExpanded, geofence]);

  useEffect(() => {
    // Check if there are unsaved changes
    const changed = JSON.stringify(assignedEmployeeIds.sort()) !== JSON.stringify(originalAssignedIds.sort());
    setHasChanges(changed);
    console.log('🎯 [InlineEmployeeAssignment] Changes detected:', changed);
  }, [assignedEmployeeIds, originalAssignedIds]);

  const fetchWageEmployees = async () => {
    try {
      console.log('🎯 [InlineEmployeeAssignment] Fetching wage employees...');
      const response = await api.get('/api/hr/v2/employees/?compensation_type=WAGE');
      const employeeData = response.data.results || response.data || [];
      setEmployees(employeeData);
      console.log('🎯 [InlineEmployeeAssignment] Wage employees loaded:', employeeData.length);
    } catch (error) {
      console.error('🎯 [InlineEmployeeAssignment] Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchAssignedEmployees = async () => {
    try {
      console.log('🎯 [InlineEmployeeAssignment] Fetching assigned employees for geofence:', geofence.id);
      const response = await api.get(`/api/hr/employee-geofences/?geofence_id=${geofence.id}`);
      console.log('🎯 [InlineEmployeeAssignment] Raw response:', response);
      
      const assignments = response.data.results || response.data || [];
      console.log('🎯 [InlineEmployeeAssignment] Assignments found:', assignments);
      
      const assignedIds = assignments.map(item => {
        console.log('🎯 [InlineEmployeeAssignment] Assignment item:', item);
        return item.employee?.id || item.employee_id || item.employee;
      }).filter(id => id);
      
      console.log('🎯 [InlineEmployeeAssignment] Assigned employee IDs:', assignedIds);
      setAssignedEmployeeIds(assignedIds);
      setOriginalAssignedIds(assignedIds);
    } catch (error) {
      console.error('🎯 [InlineEmployeeAssignment] Error fetching assignments:', error);
      console.error('🎯 [InlineEmployeeAssignment] Error response:', error.response);
      // Don't show error toast - might be empty which is fine
      setAssignedEmployeeIds([]);
      setOriginalAssignedIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    console.log('🎯 [InlineEmployeeAssignment] Toggling employee:', employeeId);
    setAssignedEmployeeIds(prev => {
      const newIds = prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId];
      console.log('🎯 [InlineEmployeeAssignment] New assigned IDs:', newIds);
      return newIds;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('🎯 [InlineEmployeeAssignment] === SAVE START ===');
      console.log('🎯 [InlineEmployeeAssignment] Geofence ID:', geofence.id);
      console.log('🎯 [InlineEmployeeAssignment] Employee IDs to assign:', assignedEmployeeIds);
      
      const response = await api.post(`/api/hr/geofences/${geofence.id}/assign_employees/`, {
        employee_ids: assignedEmployeeIds
      });
      
      console.log('🎯 [InlineEmployeeAssignment] Save response:', response);
      
      // Update original IDs to match saved state
      setOriginalAssignedIds(assignedEmployeeIds);
      setHasChanges(false);
      
      toast.success(`Successfully assigned ${assignedEmployeeIds.length} employees to ${geofence.name}`);
      
      if (onAssignmentComplete) {
        onAssignmentComplete(assignedEmployeeIds);
      }
      
      // Refresh assignments to verify persistence
      setTimeout(() => {
        console.log('🎯 [InlineEmployeeAssignment] Refreshing assignments after save...');
        fetchAssignedEmployees();
      }, 1000);
      
    } catch (error) {
      console.error('🎯 [InlineEmployeeAssignment] === SAVE ERROR ===');
      console.error('🎯 [InlineEmployeeAssignment] Error:', error);
      console.error('🎯 [InlineEmployeeAssignment] Error response:', error.response);
      const errorMessage = error.response?.data?.error || 'Failed to assign employees';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      console.log('🎯 [InlineEmployeeAssignment] === SAVE END ===');
    }
  };

  if (!geofence) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <div 
        onClick={onToggleExpand}
        className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center">
          <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-gray-900">
            Employee Assignments
          </span>
          {!isExpanded && assignedEmployeeIds.length > 0 && (
            <span className="ml-2 text-sm text-gray-600">
              ({assignedEmployeeIds.length} assigned)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && !isExpanded && (
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" title="Unsaved changes" />
          )}
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <StandardSpinner size="medium" />
              <span className="ml-2 text-gray-600">Loading employees...</span>
            </div>
          ) : (
            <>
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <ClockIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-semibold">Wage Employees Only</p>
                    <p className="mt-1">Only hourly employees are shown. They must be within this geofence to clock in/out.</p>
                  </div>
                </div>
              </div>

              {/* Employee List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <UserGroupIcon className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No wage employees found.</p>
                    <p className="text-xs mt-1">Add hourly employees to assign them to geofences.</p>
                  </div>
                ) : (
                  employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {employee.first_name?.[0]}{employee.last_name?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
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
                    </label>
                  ))
                )}
              </div>

              {/* Summary and Actions */}
              {employees.length > 0 && (
                <>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {assignedEmployeeIds.length} of {employees.length} employees selected
                    </span>
                    {hasChanges && (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {saving ? (
                          <>
                            <StandardSpinner size="small" color="white" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineEmployeeAssignment;