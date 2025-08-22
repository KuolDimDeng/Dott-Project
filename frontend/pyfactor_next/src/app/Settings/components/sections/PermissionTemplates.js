'use client';

import React, { useState, useEffect } from 'react';
import {
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { FieldTooltip } from '@/components/ui/FieldTooltip';

const PermissionTemplates = ({ onTemplateSelect, embedded = false }) => {
  const [templates, setTemplates] = useState([]);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      // Fetch custom templates
      const response = await fetch('/api/auth/rbac/permission-templates', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.results || data);
      }
      
      // Fetch system templates
      const systemResponse = await fetch('/api/auth/rbac/permission-templates/system_templates', {
        credentials: 'include'
      });
      
      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        setSystemTemplates(systemData);
      }
    } catch (error) {
      logger.error('[PermissionTemplates] Error fetching templates:', error);
      setError('Failed to load permission templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Create template from system template
  const createFromSystemTemplate = async (systemTemplate) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/rbac/permission-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: systemTemplate.name,
          code: `custom_${systemTemplate.code}_${Date.now()}`,
          description: systemTemplate.description,
          permissions: systemTemplate.permissions,
          template_type: 'CUSTOM'
        })
      });

      if (response.ok) {
        setSuccess(`Template "${systemTemplate.name}" created successfully`);
        fetchTemplates();
        setShowCreateModal(false);
      } else {
        throw new Error('Failed to create template');
      }
    } catch (error) {
      logger.error('[PermissionTemplates] Error creating template:', error);
      setError('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  // Duplicate template
  const duplicateTemplate = async (template) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/permission-templates/${template.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          code: `${template.code}_copy_${Date.now()}`
        })
      });

      if (response.ok) {
        setSuccess(`Template duplicated successfully`);
        fetchTemplates();
      } else {
        throw new Error('Failed to duplicate template');
      }
    } catch (error) {
      logger.error('[PermissionTemplates] Error duplicating template:', error);
      setError('Failed to duplicate template');
    } finally {
      setLoading(false);
    }
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/permission-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess('Template deleted successfully');
        fetchTemplates();
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      logger.error('[PermissionTemplates] Error deleting template:', error);
      setError('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  // Apply template to users
  const applyTemplate = async (templateId, userIds) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/rbac/permission-templates/${templateId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_ids: userIds,
          merge_permissions: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Template applied to ${result.summary.successful} users`);
        if (result.errors.length > 0) {
          setError(`Failed for ${result.errors.length} users`);
        }
      } else {
        throw new Error('Failed to apply template');
      }
    } catch (error) {
      logger.error('[PermissionTemplates] Error applying template:', error);
      setError('Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  // Template icon based on code
  const getTemplateIcon = (code) => {
    const iconMap = {
      'sales_manager': ShoppingCartIcon,
      'hr_admin': UserGroupIcon,
      'accountant': DocumentTextIcon,
      'inventory_manager': CubeIcon,
      'marketing_manager': LightBulbIcon,
      'customer_service': HeadphonesIcon,
      'operations_manager': CogIcon,
      'it_admin': ComputerDesktopIcon
    };
    
    return iconMap[code] || ShieldCheckIcon;
  };

  if (embedded) {
    // Simplified view for embedding in other components
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Quick Templates</h4>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {systemTemplates.slice(0, 4).map((template) => (
            <button
              key={template.code}
              onClick={() => onTemplateSelect && onTemplateSelect(template)}
              className="p-2 border rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium">{template.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Permission Templates</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pre-configured permission sets for common roles
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Template
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

      {/* System Templates */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">System Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemTemplates.map((template) => (
            <div
              key={template.code}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                </div>
                <button
                  onClick={() => createFromSystemTemplate(template)}
                  className="text-blue-600 hover:text-blue-700"
                  title="Create custom template from this"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">{template.description}</p>
              <div className="mt-3 flex items-center text-xs text-gray-500">
                <ShieldCheckIcon className="h-3 w-3 mr-1" />
                {Object.keys(template.permissions).length} permissions
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Custom Templates</h3>
        {templates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No custom templates yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Create custom templates from system templates or build your own
            </p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {template.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.code}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        template.template_type === 'SYSTEM' 
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.template_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Object.keys(template.permissions || {}).length} permissions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.usage_count || 0} users
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => duplicateTemplate(template)}
                          className="text-gray-400 hover:text-gray-500"
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingTemplate(template)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Import additional icons that might be missing
import {
  ShoppingCartIcon,
  DocumentTextIcon,
  CubeIcon,
  LightBulbIcon,
  CogIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { HeadphonesIcon } from '@heroicons/react/24/solid';

export default PermissionTemplates;