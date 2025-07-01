'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import usersApi from '@/utils/api/usersApi';
import { FieldTooltip } from '@/components/ui/FieldTooltip';

const UserManagement = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER'
  });

  // Role options
  const roleOptions = [
    { value: 'OWNER', label: 'Owner', description: 'Full access to all features and settings' },
    { value: 'ADMIN', label: 'Admin', description: 'Can manage users and most settings' },
    { value: 'USER', label: 'User', description: 'Standard access to business features' }
  ];

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const tenantId = profileData?.tenantId || user?.attributes?.tenant_id;
      
      if (!tenantId) {
        notifyError('Unable to fetch users: Tenant ID not found');
        return;
      }

      const response = await usersApi.getUsersByTenantId(tenantId);
      setUsers(response);
    } catch (error) {
      logger.error('[UserManagement] Error fetching users:', error);
      notifyError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user, profileData, notifyError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Send invitation
  const handleInviteUser = async () => {
    try {
      setSubmitting(true);
      
      // Validate form
      if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
        notifyError('Please fill in all required fields');
        return;
      }

      // Call Auth0 Management API through backend
      const response = await fetch('/api/auth/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteForm.email,
          firstName: inviteForm.firstName,
          lastName: inviteForm.lastName,
          role: inviteForm.role,
          tenantId: profileData?.tenantId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      notifySuccess(`Invitation sent to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'USER' });
      fetchUsers(); // Refresh user list
    } catch (error) {
      logger.error('[UserManagement] Error inviting user:', error);
      notifyError('Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  // Update user role
  const handleUpdateRole = async (userId, newRole) => {
    try {
      setSubmitting(true);
      
      const response = await fetch('/api/auth/update-user-role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          role: newRole
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      notifySuccess('User role updated successfully');
      fetchUsers();
    } catch (error) {
      logger.error('[UserManagement] Error updating user role:', error);
      notifyError('Failed to update user role');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove user
  const handleRemoveUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from your organization?`)) {
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch('/api/auth/remove-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      notifySuccess('User removed successfully');
      fetchUsers();
    } catch (error) {
      logger.error('[UserManagement] Error removing user:', error);
      notifyError('Failed to remove user');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(u => {
    const searchLower = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">User Management</h2>
        <p className="text-sm text-gray-600">
          Manage user access and permissions for your organization
        </p>
      </div>

      {/* Auth0 Integration Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Auth0 Integration</p>
            <p>Users will receive an email invitation to set up their account. They'll create their own password and enable two-factor authentication if required.</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Invite User
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id && isAdmin ? (
                      <select
                        value={user.role}
                        onChange={(e) => {
                          handleUpdateRole(user.id, e.target.value);
                          setEditingUser(null);
                        }}
                        onBlur={() => setEditingUser(null)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        {roleOptions.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {roleOptions.find(r => r.value === user.role)?.label || user.role}
                        </span>
                        {isAdmin && user.role !== 'OWNER' && (
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.status === 'active' ? (
                        <>
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm text-green-700">Active</span>
                        </>
                      ) : user.status === 'pending' ? (
                        <>
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                          <span className="text-sm text-yellow-700">Pending Invitation</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.role !== 'OWNER' && (
                        <div className="flex items-center justify-end space-x-2">
                          {user.status === 'pending' && (
                            <button
                              onClick={() => handleResendInvitation(user.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Resend invitation"
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveUser(user.id, user.email)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove user"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                  <FieldTooltip content="User will receive an invitation at this email address" />
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                    <FieldTooltip content="User's first name" />
                  </label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                    <FieldTooltip content="User's last name" />
                  </label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                  <FieldTooltip content="Determines user's access level and permissions" />
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {roleOptions.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;