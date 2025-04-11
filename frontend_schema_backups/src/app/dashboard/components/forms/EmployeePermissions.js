import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const EmployeePermissions = ({ employee, open, onClose }) => {
  // Guard clause for null employee
  if (!employee) {
    return null;
  }

  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    if (open && employee) {
      fetchAvailablePermissions();
      setSelectedPermissions(employee.site_access_privileges || []);
    }
  }, [open, employee]);

  const fetchAvailablePermissions = async () => {
    try {
      const response = await axiosInstance.get('/api/hr/permissions/available/');
      setAvailablePermissions(response.data);
    } catch (error) {
      console.error('Error fetching available permissions:', error);
    }
  };

  const handleTogglePermission = (permissionId) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSave = async () => {
    try {
      await axiosInstance.post(`/api/hr/employees/${employee.id}/permissions/`, {
        permissions: selectedPermissions,
      });
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Set Permissions for {employee.first_name} {employee.last_name}
            </h3>
          </div>
          
          {/* Content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-4">
                Select the menu options this employee can access:
              </p>
              <ul className="divide-y divide-gray-200">
                {availablePermissions.map((permission) => (
                  <li key={permission.id} className="py-2">
                    <button 
                      className="flex items-center w-full px-2 py-2 hover:bg-gray-50 rounded-md transition-colors group"
                      onClick={() => handleTogglePermission(permission.id)}
                    >
                      <div className="flex-shrink-0 mr-3">
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                          selectedPermissions.includes(permission.id) 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300 group-hover:border-blue-400'
                        }`}>
                          {selectedPermissions.includes(permission.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-700">{permission.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSave}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Save Permissions
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePermissions; 