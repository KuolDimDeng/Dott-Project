'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useSession } from '@/hooks/useSession-v2';
import { djangoApiClient } from '@/utils/djangoApiClient';

export default function UserManagementPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  
  // State
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  
  // New user form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'USER',
    selectedPages: {}
  });

  // Check permissions
  useEffect(() => {
    if (!sessionLoading && session) {
      // Only OWNER and ADMIN can access this page
      if (session.user?.role !== 'OWNER' && session.user?.role !== 'ADMIN') {
        toast.error('You do not have permission to access this page');
        router.push('/dashboard');
      }
    }
  }, [session, sessionLoading, router]);

  // Fetch data
  useEffect(() => {
    if (session?.user?.tenantId) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users, pages, and invitations in parallel
      const [usersRes, pagesRes, invitationsRes] = await Promise.all([
        djangoApiClient.get('/auth/rbac/users/'),
        djangoApiClient.get('/auth/rbac/pages/'),
        djangoApiClient.get('/auth/rbac/invitations/')
      ]);

      setUsers(usersRes.data);
      setPages(pagesRes.data);
      setInvitations(invitationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async () => {
    try {
      // Validate email
      if (!inviteForm.email) {
        toast.error('Please enter an email address');
        return;
      }

      // Prepare page permissions
      const pagePermissions = {};
      Object.entries(inviteForm.selectedPages).forEach(([pageId, permissions]) => {
        if (permissions.enabled) {
          pagePermissions[pageId] = {
            can_read: permissions.read || false,
            can_write: permissions.write || false,
            can_edit: permissions.edit || false,
            can_delete: permissions.delete || false
          };
        }
      });

      const response = await djangoApiClient.post('/auth/rbac/invitations/', {
        email: inviteForm.email,
        role: inviteForm.role,
        page_permissions: pagePermissions
      });

      toast.success('Invitation sent successfully');
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'USER', selectedPages: {} });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(error.response?.data?.email?.[0] || 'Failed to send invitation');
    }
  };

  const handleUpdatePermissions = async () => {
    try {
      const pagePermissions = [];
      
      Object.entries(selectedUser.pagePermissions || {}).forEach(([pageId, permissions]) => {
        if (permissions.enabled) {
          pagePermissions.push({
            page_id: pageId,
            can_read: permissions.read || false,
            can_write: permissions.write || false,
            can_edit: permissions.edit || false,
            can_delete: permissions.delete || false
          });
        }
      });

      await djangoApiClient.post(`/auth/rbac/users/${selectedUser.id}/update_permissions/`, {
        role: selectedUser.role,
        page_permissions: pagePermissions
      });

      toast.success('Permissions updated successfully');
      setShowPermissionsModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      try {
        await djangoApiClient.post(`/auth/rbac/users/${userId}/deactivate/`);
        toast.success('User deactivated');
        fetchData();
      } catch (error) {
        console.error('Error deactivating user:', error);
        toast.error('Failed to deactivate user');
      }
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      await djangoApiClient.post(`/auth/rbac/users/${userId}/activate/`);
      toast.success('User activated');
      fetchData();
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      await djangoApiClient.post(`/auth/rbac/invitations/${invitationId}/resend/`);
      toast.success('Invitation resent');
      fetchData();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      try {
        await djangoApiClient.post(`/auth/rbac/invitations/${invitationId}/cancel/`);
        toast.success('Invitation cancelled');
        fetchData();
      } catch (error) {
        console.error('Error cancelling invitation:', error);
        toast.error('Failed to cancel invitation');
      }
    }
  };

  const openPermissionsModal = (user) => {
    // Initialize page permissions for the user
    const userPermissions = {};
    
    // First, set all pages to disabled
    pages.forEach(page => {
      userPermissions[page.id] = {
        enabled: false,
        read: false,
        write: false,
        edit: false,
        delete: false
      };
    });

    // Then, enable pages the user has access to
    user.page_access?.forEach(access => {
      userPermissions[access.page.id] = {
        enabled: true,
        read: access.can_read,
        write: access.can_write,
        edit: access.can_edit,
        delete: access.can_delete
      };
    });

    setSelectedUser({ ...user, pagePermissions: userPermissions });
    setShowPermissionsModal(true);
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">Manage users and their permissions</p>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Invite User
        </button>
      </div>

      {/* Active Users */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Active Users</h2>
        </div>
        <div className="overflow-x-auto">
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
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name || user.email}
                      </div>
                      {user.full_name && (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.role !== 'OWNER' && user.email !== session?.user?.email && (
                      <>
                        <button
                          onClick={() => openPermissionsModal(user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Permissions
                        </button>
                        {user.is_active ? (
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateUser(user.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Activate
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium">Pending Invitations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.filter(inv => inv.status !== 'accepted').map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {invitation.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invitation.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                        invitation.status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invitation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invitation.invited_by_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invitation.sent_at ? new Date(invitation.sent_at).toLocaleDateString() : 'Not sent'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invitation.status !== 'cancelled' && (
                        <>
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Invite New User</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="user@example.com"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="USER">User</option>
                  {session?.user?.role === 'OWNER' && (
                    <option value="ADMIN">Admin</option>
                  )}
                </select>
              </div>

              {inviteForm.role === 'USER' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Page Permissions</h4>
                  <div className="space-y-4">
                    {Object.entries(
                      pages.reduce((acc, page) => {
                        if (!acc[page.category]) acc[page.category] = [];
                        acc[page.category].push(page);
                        return acc;
                      }, {})
                    ).map(([category, categoryPages]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">{category}</h5>
                        <div className="space-y-3">
                          {categoryPages.map((page) => (
                            <div key={page.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={inviteForm.selectedPages[page.id]?.enabled || false}
                                  onChange={(e) => {
                                    setInviteForm({
                                      ...inviteForm,
                                      selectedPages: {
                                        ...inviteForm.selectedPages,
                                        [page.id]: {
                                          ...inviteForm.selectedPages[page.id],
                                          enabled: e.target.checked,
                                          read: e.target.checked
                                        }
                                      }
                                    });
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">
                                  {page.name}
                                </label>
                              </div>
                              {inviteForm.selectedPages[page.id]?.enabled && (
                                <div className="flex space-x-4 text-sm">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={inviteForm.selectedPages[page.id]?.read || false}
                                      onChange={(e) => {
                                        setInviteForm({
                                          ...inviteForm,
                                          selectedPages: {
                                            ...inviteForm.selectedPages,
                                            [page.id]: {
                                              ...inviteForm.selectedPages[page.id],
                                              read: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Read
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={inviteForm.selectedPages[page.id]?.write || false}
                                      onChange={(e) => {
                                        setInviteForm({
                                          ...inviteForm,
                                          selectedPages: {
                                            ...inviteForm.selectedPages,
                                            [page.id]: {
                                              ...inviteForm.selectedPages[page.id],
                                              write: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Write
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={inviteForm.selectedPages[page.id]?.edit || false}
                                      onChange={(e) => {
                                        setInviteForm({
                                          ...inviteForm,
                                          selectedPages: {
                                            ...inviteForm.selectedPages,
                                            [page.id]: {
                                              ...inviteForm.selectedPages[page.id],
                                              edit: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Edit
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={inviteForm.selectedPages[page.id]?.delete || false}
                                      onChange={(e) => {
                                        setInviteForm({
                                          ...inviteForm,
                                          selectedPages: {
                                            ...inviteForm.selectedPages,
                                            [page.id]: {
                                              ...inviteForm.selectedPages[page.id],
                                              delete: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Delete
                                  </label>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ email: '', role: 'USER', selectedPages: {} });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">
                Edit Permissions for {selectedUser.full_name || selectedUser.email}
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={selectedUser.role === 'OWNER'}
                >
                  <option value="USER">User</option>
                  {session?.user?.role === 'OWNER' && (
                    <option value="ADMIN">Admin</option>
                  )}
                </select>
              </div>

              {selectedUser.role === 'USER' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Page Permissions</h4>
                  <div className="space-y-4">
                    {Object.entries(
                      pages.reduce((acc, page) => {
                        if (!acc[page.category]) acc[page.category] = [];
                        acc[page.category].push(page);
                        return acc;
                      }, {})
                    ).map(([category, categoryPages]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">{category}</h5>
                        <div className="space-y-3">
                          {categoryPages.map((page) => (
                            <div key={page.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedUser.pagePermissions?.[page.id]?.enabled || false}
                                  onChange={(e) => {
                                    setSelectedUser({
                                      ...selectedUser,
                                      pagePermissions: {
                                        ...selectedUser.pagePermissions,
                                        [page.id]: {
                                          ...selectedUser.pagePermissions[page.id],
                                          enabled: e.target.checked,
                                          read: e.target.checked
                                        }
                                      }
                                    });
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">
                                  {page.name}
                                </label>
                              </div>
                              {selectedUser.pagePermissions?.[page.id]?.enabled && (
                                <div className="flex space-x-4 text-sm">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedUser.pagePermissions[page.id]?.read || false}
                                      onChange={(e) => {
                                        setSelectedUser({
                                          ...selectedUser,
                                          pagePermissions: {
                                            ...selectedUser.pagePermissions,
                                            [page.id]: {
                                              ...selectedUser.pagePermissions[page.id],
                                              read: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Read
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedUser.pagePermissions[page.id]?.write || false}
                                      onChange={(e) => {
                                        setSelectedUser({
                                          ...selectedUser,
                                          pagePermissions: {
                                            ...selectedUser.pagePermissions,
                                            [page.id]: {
                                              ...selectedUser.pagePermissions[page.id],
                                              write: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Write
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedUser.pagePermissions[page.id]?.edit || false}
                                      onChange={(e) => {
                                        setSelectedUser({
                                          ...selectedUser,
                                          pagePermissions: {
                                            ...selectedUser.pagePermissions,
                                            [page.id]: {
                                              ...selectedUser.pagePermissions[page.id],
                                              edit: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Edit
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedUser.pagePermissions[page.id]?.delete || false}
                                      onChange={(e) => {
                                        setSelectedUser({
                                          ...selectedUser,
                                          pagePermissions: {
                                            ...selectedUser.pagePermissions,
                                            [page.id]: {
                                              ...selectedUser.pagePermissions[page.id],
                                              delete: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                      className="h-3 w-3 text-blue-600 rounded mr-1"
                                    />
                                    Delete
                                  </label>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePermissions}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}