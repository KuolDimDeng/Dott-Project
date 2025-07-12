'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  UserGroupIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronUpDownIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckBadgeIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

export default function UserManager({ adminUser }) {
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    plan: 'all',
    onboarding: 'all',
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    page_size: 25,
    total_count: 0,
    total_pages: 0,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'USER',
    send_invitation: true
  });

  if (!adminUser.can_view_all_users) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to view user management</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
    loadUserStats();
  }, [filters, pagination.current_page, searchQuery]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.current_page.toString(),
        page_size: pagination.page_size.toString(),
        search: searchQuery,
        ...filters
      });

      const response = await fetch(`/api/admin/proxy/admin/users?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(data.pagination || pagination);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/admin/proxy/admin/users/stats', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadUserDetails = async (userId) => {
    try {
      const response = await fetch(`/api/admin/proxy/admin/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data);
        setShowUserModal(true);
      } else {
        toast.error('Failed to load user details');
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCreateUser = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/admin/proxy/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'User created successfully');
        setShowCreateModal(false);
        setNewUser({
          email: '',
          first_name: '',
          last_name: '',
          role: 'USER',
          send_invitation: true
        });
        loadUsers();
        loadUserStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (hardDelete = false) => {
    if (!userToDelete) return;
    
    try {
      setIsProcessing(true);
      
      const params = hardDelete ? '' : '?soft_delete=true';
      const response = await fetch(`/api/admin/proxy/admin/users/${userToDelete.id}${params}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'User deleted successfully');
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        loadUsers();
        loadUserStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockUnblock = async (userId, action) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/admin/proxy/admin/users/${userId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/admin/proxy/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'User updated successfully');
        loadUsers();
        if (selectedUser && selectedUser.id === userId) {
          loadUserDetails(userId);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'Enterprise':
        return 'bg-indigo-100 text-indigo-800';
      case 'Professional':
        return 'bg-green-100 text-green-800';
      case 'Basic':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          {adminUser.admin_role === 'super_admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create User
            </button>
          )}
        </div>
        
        {/* Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">{userStats.total_users?.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">
                +{userStats.new_users_today} today
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Active Users</div>
              <div className="text-2xl font-bold text-green-600">{userStats.active_users?.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">
                {userStats.active_percentage}% of total
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Subscription Plans</div>
              <div className="text-sm mt-1">
                <div>Enterprise: {userStats.plan_distribution?.Enterprise || 0}</div>
                <div>Professional: {userStats.plan_distribution?.Professional || 0}</div>
                <div>Basic: {userStats.plan_distribution?.Basic || 0}</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Countries</div>
              <div className="text-2xl font-bold text-gray-900">{userStats.countries_count || 0}</div>
              <div className="text-xs text-gray-500 mt-1">
                Top: {userStats.top_countries?.slice(0, 3).join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="USER">User</option>
              </select>

              <select
                value={filters.plan}
                onChange={(e) => handleFilterChange('plan', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Plans</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Professional">Professional</option>
                <option value="Basic">Basic</option>
              </select>

              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <CenteredSpinner size="large" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users found matching your criteria
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
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
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.picture ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={user.picture}
                                alt=""
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.company_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{user.country}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(user.plan_name)}`}>
                          {user.plan_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.is_active ? (
                            <>
                              <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm text-green-600">Active</span>
                            </>
                          ) : user.subscription_status === 'suspended' ? (
                            <>
                              <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-sm text-red-600">Suspended</span>
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="text-sm text-gray-600">Inactive</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => loadUserDetails(user.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {adminUser.admin_role === 'super_admin' && user.role !== 'OWNER' && (
                            <>
                              <button
                                onClick={() => handleBlockUnblock(user.id, user.is_active ? 'block' : 'unblock')}
                                className={user.is_active ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                                title={user.is_active ? "Block User" : "Unblock User"}
                                disabled={isProcessing}
                              >
                                {user.is_active ? <LockClosedIcon className="h-5 w-5" /> : <LockOpenIcon className="h-5 w-5" />}
                              </button>
                              <button
                                onClick={() => {
                                  setUserToDelete(user);
                                  setShowDeleteConfirm(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Delete User"
                                disabled={isProcessing}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to {Math.min(pagination.current_page * pagination.page_size, pagination.total_count)} of {pagination.total_count} users
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setPagination(prev => ({ ...prev, current_page: page }))}
                        className={`px-3 py-1 border rounded text-sm ${
                          pagination.current_page === page ? 'bg-blue-600 text-white' : ''
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                    disabled={pagination.current_page === pagination.total_pages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">User Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Name</label>
                    <p className="font-medium">{selectedUser.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Company</label>
                    <p className="font-medium">{selectedUser.company_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Country</label>
                    <p className="font-medium">{selectedUser.country}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Role</label>
                    <p className="font-medium">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Plan</label>
                    <p className="font-medium">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(selectedUser.plan_name)}`}>
                        {selectedUser.plan_name}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedUser.subscription_details && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Subscription Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-gray-600">Status</label>
                        <p>{selectedUser.subscription_details.status}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Started</label>
                        <p>{formatDate(selectedUser.subscription_details.start_date)}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Billing Cycle</label>
                        <p>{selectedUser.subscription_details.billing_cycle}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Next Billing</label>
                        <p>{formatDate(selectedUser.subscription_details.next_billing_date)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser.activity_summary && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Activity Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-gray-600">Last Login</label>
                        <p>{formatDate(selectedUser.activity_summary.last_login)}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Total Logins</label>
                        <p>{selectedUser.activity_summary.total_logins}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Documents Created</label>
                        <p>{selectedUser.activity_summary.documents_created}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Notifications Received</label>
                        <p>{selectedUser.activity_summary.notifications_received}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="send_invitation"
                  checked={newUser.send_invitation}
                  onChange={(e) => setNewUser(prev => ({ ...prev, send_invitation: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="send_invitation" className="ml-2 text-sm text-gray-700">
                  Send invitation email
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.email || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <StandardSpinner size="small" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create User</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Delete User</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete {userToDelete.email}?
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. Choose an option:
              </p>
              <ul className="list-disc ml-5 mt-2 text-sm text-red-700">
                <li><strong>Soft Delete:</strong> Deactivates the user account (can be reactivated)</li>
                <li><strong>Hard Delete:</strong> Permanently removes the user and ALL their data</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(false)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <StandardSpinner size="small" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Soft Delete</span>
                )}
              </button>
              <button
                onClick={() => handleDeleteUser(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <StandardSpinner size="small" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Hard Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}