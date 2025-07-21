'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  MapPinIcon,
  UserGroupIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import StandardSpinner from '@/components/ui/StandardSpinner';
import FieldTooltip from '@/components/ui/FieldTooltip';

const EditGeofenceModal = ({ isOpen, onClose, geofence, onGeofenceUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Geofence form data
  const [geofenceData, setGeofenceData] = useState({
    name: '',
    geofence_type: 'office',
    radius: 100,
    enforce_clock_in: true,
    enforce_clock_out: true,
    auto_clock_out: false,
    alert_on_unexpected_exit: true
  });

  // Employee assignment data
  const [employees, setEmployees] = useState([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState([]);

  useEffect(() => {
    if (isOpen && geofence) {
      initializeData();
    }
  }, [isOpen, geofence]);

  const initializeData = async () => {
    setLoading(true);
    try {
      // Initialize geofence data
      setGeofenceData({
        name: geofence.name || '',
        geofence_type: geofence.geofence_type || 'office',
        radius: geofence.radius || 100,
        enforce_clock_in: geofence.enforce_clock_in ?? true,
        enforce_clock_out: geofence.enforce_clock_out ?? true,
        auto_clock_out: geofence.auto_clock_out ?? false,
        alert_on_unexpected_exit: geofence.alert_on_unexpected_exit ?? true
      });

      // Fetch employees and assignments
      await Promise.all([
        fetchWageEmployees(),
        fetchAssignedEmployees()
      ]);
    } catch (error) {
      console.error('[EditGeofence] Error initializing data:', error);
      toast.error('Failed to load geofence data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWageEmployees = async () => {
    try {
      const response = await api.get('/api/hr/v2/employees/?compensation_type=WAGE');
      setEmployees(response.data.results || response.data || []);
    } catch (error) {
      console.error('[EditGeofence] Error fetching employees:', error);
      throw error;
    }
  };

  const fetchAssignedEmployees = async () => {
    try {
      const response = await api.get(`/api/hr/employee-geofences/?geofence_id=${geofence.id}`);
      const assigned = (response.data.results || response.data || []).map(item => item.employee.id);
      setAssignedEmployeeIds(assigned);
    } catch (error) {
      console.error('[EditGeofence] Error fetching assignments:', error);
      // Don't throw - assignments might be empty
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setAssignedEmployeeIds(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSaveDetails = async () => {
    if (!geofenceData.name.trim()) {
      toast.error('Please enter a geofence name');
      return;
    }

    setSaving(true);
    try {
      console.log('[EditGeofence] Updating geofence details:', geofenceData);
      const response = await api.patch(`/api/hr/geofences/${geofence.id}/`, geofenceData);
      
      toast.success('Geofence details updated successfully');
      if (onGeofenceUpdated) {
        onGeofenceUpdated(response.data);
      }
    } catch (error) {
      console.error('[EditGeofence] Error updating geofence:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || 'Failed to update geofence';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmployees = async () => {
    setSaving(true);
    try {
      console.log('[EditGeofence] Updating employee assignments:', assignedEmployeeIds);
      await api.post(`/api/hr/geofences/${geofence.id}/assign_employees/`, {
        employee_ids: assignedEmployeeIds
      });
      
      toast.success(`Updated employee assignments`);
      if (onGeofenceUpdated) {
        onGeofenceUpdated({ ...geofence, assigned_employees_count: assignedEmployeeIds.length });
      }
    } catch (error) {
      console.error('[EditGeofence] Error updating assignments:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update employee assignments';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    await handleSaveDetails();
    await handleSaveEmployees();
    onClose();
  };

  if (!isOpen || !geofence) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <MapPinIcon className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Edit Geofence</h3>
              <p className="text-sm text-gray-600">{geofence.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Geofence Details
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Employee Assignment
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <StandardSpinner size="lg" />
              <span className="ml-2 text-gray-600">Loading geofence data...</span>
            </div>
          ) : (
            <>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Geofence Name *
                    </label>
                    <input
                      type="text"
                      value={geofenceData.name}
                      onChange={(e) => setGeofenceData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., Main Office, Construction Site A"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location Type
                    </label>
                    <select
                      value={geofenceData.geofence_type}
                      onChange={(e) => setGeofenceData(prev => ({ ...prev, geofence_type: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="office">Office</option>
                      <option value="construction_site">Construction Site</option>
                      <option value="client_location">Client Location</option>
                      <option value="delivery_zone">Delivery Zone</option>
                      <option value="field_location">Field Location</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Radius (meters)
                    </label>
                    <div className="mt-1 flex items-center space-x-2">
                      <input
                        type="number"
                        value={geofenceData.radius}
                        onChange={(e) => setGeofenceData(prev => ({ ...prev, radius: parseInt(e.target.value) || 100 }))}
                        min="10"
                        max="1000"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <FieldTooltip content="The radius of the geofenced area in meters. Employees must be within this distance to clock in/out." />
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Enforcement Rules</label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={geofenceData.enforce_clock_in}
                        onChange={(e) => setGeofenceData(prev => ({ ...prev, enforce_clock_in: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require location for clock in</span>
                      <FieldTooltip content="Employees must be within the geofence to clock in" />
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={geofenceData.enforce_clock_out}
                        onChange={(e) => setGeofenceData(prev => ({ ...prev, enforce_clock_out: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require location for clock out</span>
                      <FieldTooltip content="Employees must be within the geofence to clock out" />
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={geofenceData.auto_clock_out}
                        onChange={(e) => setGeofenceData(prev => ({ ...prev, auto_clock_out: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Auto clock-out when leaving</span>
                      <FieldTooltip content="Automatically clock out employees when they leave the geofence" />
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={geofenceData.alert_on_unexpected_exit}
                        onChange={(e) => setGeofenceData(prev => ({ ...prev, alert_on_unexpected_exit: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Alert on unexpected exit</span>
                      <FieldTooltip content="Send alerts when employees leave the geofence during work hours" />
                    </label>
                  </div>
                </div>
              )}

              {/* Employees Tab */}
              {activeTab === 'employees' && (
                <div className="space-y-6">
                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                    <div className="text-sm text-gray-600">
                      {assignedEmployeeIds.length} of {employees.length} employees selected
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {activeTab === 'details' && 'Note: Location and center point cannot be changed after creation'}
            {activeTab === 'employees' && `${assignedEmployeeIds.length} employees will have access to this geofence`}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {activeTab === 'details' && (
              <button
                onClick={handleSaveDetails}
                disabled={saving || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <StandardSpinner size="small" color="white" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Details'
                )}
              </button>
            )}
            {activeTab === 'employees' && (
              <button
                onClick={handleSaveEmployees}
                disabled={saving || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <StandardSpinner size="small" color="white" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Assignments'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGeofenceModal;