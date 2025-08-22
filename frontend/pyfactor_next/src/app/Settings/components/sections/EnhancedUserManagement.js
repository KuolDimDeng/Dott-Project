'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import PermissionTemplates from './PermissionTemplates';

const EnhancedUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [temporaryPermissions, setTemporaryPermissions] = useState({});
  const [delegations, setDelegations] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch users with enhanced permissions
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/rbac/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.results || data);
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch permission templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/auth/rbac/permission-templates', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.results || data);
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error fetching templates:', error);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/auth/rbac/departments', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.results || data);
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error fetching departments:', error);
    }
  };

  // Fetch temporary permissions for a user
  const fetchTemporaryPermissions = async (userId) => {
    try {
      const response = await fetch(`/api/auth/rbac/temporary-permissions?user_id=${userId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemporaryPermissions(prev => ({
          ...prev,
          [userId]: data.results || data
        }));
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error fetching temporary permissions:', error);
    }
  };

  // Fetch delegations for a user
  const fetchDelegations = async (userId) => {
    try {
      const response = await fetch(`/api/auth/rbac/delegations?user_id=${userId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDelegations(prev => ({
          ...prev,
          [userId]: data.results || data
        }));
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error fetching delegations:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTemplates();
    fetchDepartments();
  }, []);

  // Apply template to selected users
  const applyTemplateToUsers = async (templateId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/permission-templates/${templateId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_ids: selectedUsers,
          merge_permissions: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Template applied to ${result.summary.successful} users`);
        setSelectedUsers([]);
        setShowTemplateModal(false);
        fetchUsers();
      } else {
        throw new Error('Failed to apply template');
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error applying template:', error);
      setError('Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  // Bulk update permissions
  const bulkUpdatePermissions = async (action, permissions) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/rbac/permission-validation/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_ids: selectedUsers,
          permissions: permissions,
          action: action, // 'add', 'remove', 'replace'
          reason: 'Bulk update from admin panel'
        })
      });

      if (response.ok) {
        setSuccess(`Permissions updated for ${selectedUsers.length} users`);
        setSelectedUsers([]);
        fetchUsers();
      } else {
        throw new Error('Failed to update permissions');
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error updating permissions:', error);
      setError('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  // Grant temporary permission
  const grantTemporaryPermission = async (userId, permissions, validUntil, reason) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/rbac/temporary-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user: userId,
          permissions: permissions,
          valid_until: validUntil,
          reason: reason
        })
      });

      if (response.ok) {
        setSuccess('Temporary permission granted');
        fetchTemporaryPermissions(userId);
      } else {
        throw new Error('Failed to grant temporary permission');
      }
    } catch (error) {
      logger.error('[EnhancedUserManagement] Error granting temporary permission:', error);
      setError('Failed to grant temporary permission');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  // Select all users
  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage user permissions with templates and advanced controls
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowTemplateModal(true)}
              disabled={selectedUsers.length === 0}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              Apply Template
            </button>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              disabled={selectedUsers.length === 0}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
              Bulk Actions
            </button>
            <button
              onClick={fetchUsers}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && selectedUsers.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {/* Open department assignment modal */}}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Assign to Department
                </button>
                <button
                  onClick={() => {/* Open temporary permission modal */}}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Grant Temporary Access
                </button>
                <button
                  onClick={() => bulkUpdatePermissions('remove', {})}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Revoke All Permissions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={selectAllUsers}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Special Access
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={selectedUsers.includes(user.id)}
                onToggleSelect={() => toggleUserSelection(user.id)}
                onFetchTemporary={() => fetchTemporaryPermissions(user.id)}
                onFetchDelegations={() => fetchDelegations(user.id)}
                temporaryPermissions={temporaryPermissions[user.id]}
                delegations={delegations[user.id]}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Apply Permission Template
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Select a template to apply to {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}
            </p>
            
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => applyTemplateToUsers(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {Object.keys(template.permissions || {}).length} permissions
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// User Row Component
const UserRow = ({ 
  user, 
  selected, 
  onToggleSelect, 
  onFetchTemporary, 
  onFetchDelegations,
  temporaryPermissions,
  delegations 
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    setExpanded(!expanded);
    if (!expanded) {
      onFetchTemporary();
      onFetchDelegations();
    }
  };

  return (
    <>
      <tr>
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <button
              onClick={handleExpand}
              className="mr-2 text-gray-400 hover:text-gray-600"
            >
              {expanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {user.name || user.email}
              </div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
            user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {user.role}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {user.department || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {user.permission_count || 0} active
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex space-x-2">
            {temporaryPermissions?.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                <ClockIcon className="h-3 w-3 mr-1" />
                Temporary
              </span>
            )}
            {delegations?.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                <ArrowsRightLeftIcon className="h-3 w-3 mr-1" />
                Delegated
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button className="text-blue-600 hover:text-blue-900">
            Edit
          </button>
        </td>
      </tr>
      
      {/* Expanded Details */}
      {expanded && (
        <tr>
          <td colSpan="7" className="px-6 py-4 bg-gray-50">
            <div className="space-y-4">
              {/* Temporary Permissions */}
              {temporaryPermissions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Temporary Permissions</h4>
                  <div className="space-y-1">
                    {temporaryPermissions.map((temp) => (
                      <div key={temp.id} className="text-xs text-gray-600">
                        • {temp.reason} (until {new Date(temp.valid_until).toLocaleDateString()})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Delegations */}
              {delegations?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Permission Delegations</h4>
                  <div className="space-y-1">
                    {delegations.map((del) => (
                      <div key={del.id} className="text-xs text-gray-600">
                        • From {del.delegator_name} ({new Date(del.start_date).toLocaleDateString()} - {new Date(del.end_date).toLocaleDateString()})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default EnhancedUserManagement;