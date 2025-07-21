'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-800' },
  { value: 'unqualified', label: 'Unqualified', color: 'bg-gray-100 text-gray-800' },
  { value: 'closed', label: 'Closed', color: 'bg-red-100 text-red-800' },
];

const SOURCE_OPTIONS = [
  { value: 'contact_form', label: 'Contact Form', icon: EnvelopeIcon },
  { value: 'invite_business_owner', label: 'Invite a Business Owner', icon: UserPlusIcon },
  { value: 'crisp_chat', label: 'Crisp Chat', icon: ChatBubbleLeftRightIcon },
  { value: 'referral', label: 'Referral', icon: UserGroupIcon },
  { value: 'social_media', label: 'Social Media', icon: BuildingOfficeIcon },
  { value: 'other', label: 'Other', icon: MagnifyingGlassIcon },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export default function LeadManager({ adminUser }) {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedLead, setExpandedLead] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    loadLeads();
    loadStats();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter, sourceFilter, priorityFilter, dateFilter]);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/proxy/leads/', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(data.results || data);
      } else {
        const error = await response.text();
        console.error('Failed to load leads:', error);
        toast.error('Failed to load leads');
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Error loading leads');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/proxy/leads/stats/', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to load lead stats');
      }
    } catch (error) {
      console.error('Error loading lead stats:', error);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.company_name && lead.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.message && lead.message.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(lead => lead.priority === priorityFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(lead => new Date(lead.created_at) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(lead => new Date(lead.created_at) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(lead => new Date(lead.created_at) >= filterDate);
          break;
        default:
          break;
      }
    }

    setFilteredLeads(filtered);
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/proxy/leads/${leadId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Lead status updated successfully');
        loadLeads();
        loadStats();
      } else {
        toast.error('Failed to update lead status');
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Error updating lead status');
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeClass = (priority) => {
    const priorityOption = PRIORITY_OPTIONS.find(option => option.value === priority);
    return priorityOption ? priorityOption.color : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSourceIcon = (source) => {
    const sourceOption = SOURCE_OPTIONS.find(option => option.value === source);
    return sourceOption ? sourceOption.icon : MagnifyingGlassIcon;
  };

  const getSourceLabel = (source) => {
    const sourceOption = SOURCE_OPTIONS.find(option => option.value === source);
    return sourceOption ? sourceOption.label : source;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <CenteredSpinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lead Management</h1>
        <p className="text-gray-600">Manage and track potential customers from all sources</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_leads || leads.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <EnvelopeIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">New Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.new_today || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Contacted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.contacted || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <UserPlusIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Converted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.converted || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            {SOURCE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            {PRIORITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No leads found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const SourceIcon = getSourceIcon(lead.source);
                  const isExpanded = expandedLead === lead.id;
                  
                  return (
                    <React.Fragment key={lead.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-800">
                                  {lead.first_name ? lead.first_name.charAt(0).toUpperCase() : lead.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : 'Anonymous'}
                              </div>
                              <div className="text-sm text-gray-500">{lead.email}</div>
                              {lead.company_name && (
                                <div className="text-xs text-gray-400">{lead.company_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <SourceIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{getSourceLabel(lead.source)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusBadgeClass(lead.status)}`}
                          >
                            {STATUS_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(lead.priority)}`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(lead.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="space-y-3">
                              {lead.message && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">Message:</h4>
                                  <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                                    {lead.message}
                                  </p>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4">
                                {lead.phone_number && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900">Phone:</h4>
                                    <p className="text-sm text-gray-700">{lead.phone_number}</p>
                                  </div>
                                )}
                                
                                {lead.ip_address && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900">IP Address:</h4>
                                    <p className="text-sm text-gray-700">{lead.ip_address}</p>
                                  </div>
                                )}
                                
                                {lead.utm_source && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900">UTM Source:</h4>
                                    <p className="text-sm text-gray-700">{lead.utm_source}</p>
                                  </div>
                                )}
                                
                                {lead.utm_campaign && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900">UTM Campaign:</h4>
                                    <p className="text-sm text-gray-700">{lead.utm_campaign}</p>
                                  </div>
                                )}
                              </div>
                              
                              {lead.notes && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">Internal Notes:</h4>
                                  <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border border-yellow-200">
                                    {lead.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredLeads.length} of {leads.length} leads
      </div>
    </div>
  );
}