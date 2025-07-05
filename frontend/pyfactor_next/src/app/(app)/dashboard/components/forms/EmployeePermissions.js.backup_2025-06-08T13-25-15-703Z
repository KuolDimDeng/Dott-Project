'use client';

import React, { useState } from 'react';

/**
 * Employee Permissions Component
 * Allows setting permissions for employee access to system modules
 */
const EmployeePermissions = ({ employee, onClose, onSave }) => {
  const [permissions, setPermissions] = useState(
    employee?.site_access_privileges || {
      dashboard: { view: true, edit: false },
      sales: { view: false, edit: false },
      purchases: { view: false, edit: false },
      inventory: { view: false, edit: false },
      accounting: { view: false, edit: false },
      reports: { view: false, edit: false },
      hr: { view: false, edit: false },
      settings: { view: false, edit: false }
    }
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Toggle permission for specific module and permission type
  const togglePermission = (module, type) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [type]: !prev[module][type]
      }
    }));
  };

  // Handle saving permissions
  const handleSave = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call an API
      // const response = await fetch(`/api/hr/employees/${employee.id}/permissions`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ permissions })
      // });
      // if (!response.ok) throw new Error('Failed to update permissions');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSuccess(true);
      setTimeout(() => {
        if (onSave) onSave(permissions);
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Define all modules with their display names
  const modules = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'sales', name: 'Sales' },
    { id: 'purchases', name: 'Purchases' },
    { id: 'inventory', name: 'Inventory' },
    { id: 'accounting', name: 'Accounting' },
    { id: 'reports', name: 'Reports' },
    { id: 'hr', name: 'Human Resources' },
    { id: 'settings', name: 'Settings' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {employee ? `Permissions for ${employee.first_name} ${employee.last_name}` : 'Employee Permissions'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {success && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">
          Permissions updated successfully!
        </div>
      )}

      <p className="text-gray-600 mb-4">
        Set which sections of the system this employee can access and edit.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {modules.map((module) => (
              <tr key={module.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{module.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions[module.id]?.view || false}
                      onChange={() => togglePermission(module.id, 'view')}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </label>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions[module.id]?.edit || false}
                      onChange={() => togglePermission(module.id, 'edit')}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
};

export default EmployeePermissions; 