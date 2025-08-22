'use client';

import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentMembers, setDepartmentMembers] = useState({});
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // New department form
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    code: '',
    description: '',
    manager: null,
    default_template: null
  });

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/rbac/departments', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.results || data);
      }
    } catch (error) {
      logger.error('[DepartmentManagement] Error fetching departments:', error);
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch department members
  const fetchDepartmentMembers = async (departmentId) => {
    try {
      const response = await fetch(`/api/auth/rbac/departments/${departmentId}/members`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartmentMembers(prev => ({
          ...prev,
          [departmentId]: data
        }));
      }
    } catch (error) {
      logger.error('[DepartmentManagement] Error fetching members:', error);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Toggle department expansion
  const toggleDepartment = (departmentId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [departmentId]: !prev[departmentId]
    }));
    
    // Fetch members if expanding and not already fetched
    if (!expandedDepartments[departmentId] && !departmentMembers[departmentId]) {
      fetchDepartmentMembers(departmentId);
    }
  };

  // Create department
  const createDepartment = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/rbac/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newDepartment)
      });

      if (response.ok) {
        setSuccess('Department created successfully');
        fetchDepartments();
        setShowCreateForm(false);
        setNewDepartment({
          name: '',
          code: '',
          description: '',
          manager: null,
          default_template: null
        });
      } else {
        throw new Error('Failed to create department');
      }
    } catch (error) {
      logger.error('[DepartmentManagement] Error creating department:', error);
      setError('Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  // Update department
  const updateDepartment = async (departmentId, updates) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/departments/${departmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setSuccess('Department updated successfully');
        fetchDepartments();
        setEditingDepartment(null);
      } else {
        throw new Error('Failed to update department');
      }
    } catch (error) {
      logger.error('[DepartmentManagement] Error updating department:', error);
      setError('Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  // Delete department
  const deleteDepartment = async (departmentId) => {
    if (!confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/departments/${departmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess('Department deleted successfully');
        fetchDepartments();
      } else {
        throw new Error('Failed to delete department');
      }
    } catch (error) {
      logger.error('[DepartmentManagement] Error deleting department:', error);
      setError('Failed to delete department');
    } finally {
      setLoading(false);
    }
  };

  // Add member to department
  const addMemberToDepartment = async (departmentId, userId, role = 'MEMBER') => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/departments/${departmentId}/add_member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          role: role
        })
      });

      if (response.ok) {
        setSuccess('Member added successfully');
        fetchDepartmentMembers(departmentId);
      } else {
        throw new Error('Failed to add member');
      }
    } catch (error) {
      logger.error('[DepartmentManagement] Error adding member:', error);
      setError('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  // Remove member from department
  const removeMemberFromDepartment = async (departmentId, userId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/departments/${departmentId}/remove_member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId
        })
      });

      if (response.ok) {
        setSuccess('Member removed successfully');
        fetchDepartmentMembers(departmentId);
      } else {
        throw new Error('Failed to remove member');
      }
    } catch (error) {
      logger.error('[DepartmentManagement] Error removing member:', error);
      setError('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    const colors = {
      'HEAD': 'bg-purple-100 text-purple-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'LEAD': 'bg-green-100 text-green-800',
      'MEMBER': 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Department Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Organize users into departments with default permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {showCreateForm ? 'Cancel' : 'New Department'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-500"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
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
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-500"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inline Create Department Form */}
      {showCreateForm && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Department</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Sales Team"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDepartment.code}
                onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value.toUpperCase() })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., SALES"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={newDepartment.description}
                onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Brief description of the department"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewDepartment({
                  name: '',
                  code: '',
                  description: '',
                  manager: null,
                  default_template: null
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={createDepartment}
              disabled={!newDepartment.name || !newDepartment.code || loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </div>
      )}

      {/* Departments List */}
      {departments.length === 0 && !showCreateForm ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No departments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new department.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Department
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {departments.map((department) => (
              <li key={department.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleDepartment(department.id)}
                        className="mr-3 text-gray-400 hover:text-gray-600"
                      >
                        {expandedDepartments[department.id] ? (
                          <ChevronDownIcon className="h-5 w-5" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5" />
                        )}
                      </button>
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {department.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {department.code} • {department.member_count || 0} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {department.default_template_name && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <ClipboardDocumentListIcon className="h-3 w-3 mr-1" />
                          {department.default_template_name}
                        </span>
                      )}
                      <button
                        onClick={() => setEditingDepartment(department)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteDepartment(department.id)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Department Members */}
                  {expandedDepartments[department.id] && (
                    <div className="mt-4 border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Department Members</h4>
                        <button
                          onClick={() => {/* Open add member modal */}}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          <UserPlusIcon className="h-4 w-4 inline mr-1" />
                          Add Member
                        </button>
                      </div>
                      
                      {departmentMembers[department.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {departmentMembers[department.id].map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                            >
                              <div className="flex items-center">
                                <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                                <div>
                                  <p className="text-sm text-gray-900">{member.user_name}</p>
                                  <p className="text-xs text-gray-500">{member.user_email}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                                  {member.role}
                                </span>
                                <button
                                  onClick={() => removeMemberFromDepartment(department.id, member.user)}
                                  className="text-red-400 hover:text-red-500"
                                >
                                  <UserMinusIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-3">
                          No members in this department
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;