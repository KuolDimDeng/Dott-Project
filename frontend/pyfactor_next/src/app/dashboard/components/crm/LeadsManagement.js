'use client';


import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { Dialog } from '@headlessui/react';
import { 
  AddIcon, 
  EditIcon, 
  DeleteIcon,
  SearchIcon,
  FilterListIcon,
  VisibilityIcon,
  DownloadIcon,
  ConvertIcon
} from '@/app/components/icons';

const LeadsManagement = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLeads, setTotalLeads] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openConvertDialog, setOpenConvertDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const token = useStore((state) => state.token);

  const statuses = [
    { value: 'new', label: 'New', color: 'blue' },
    { value: 'contacted', label: 'Contacted', color: 'indigo' },
    { value: 'qualified', label: 'Qualified', color: 'green' },
    { value: 'unqualified', label: 'Unqualified', color: 'yellow' },
    { value: 'converted', label: 'Converted', color: 'purple' }
  ];

  const sources = [
    'Website',
    'Referral',
    'Social Media',
    'Event',
    'Phone Inquiry',
    'Email Campaign',
    'Partner',
    'Other'
  ];

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        let url = `/api/crm/leads/?page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}`;
        if (statusFilter) {
          url += `&status=${statusFilter}`;
        }
        
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setLeads(data.results || []);
          setTotalLeads(data.count || 0);
        } else {
          logger.error('Failed to fetch leads');
          // Show mock data for demonstration
          const mockLeads = [
            { id: '1', first_name: 'Thomas', last_name: 'Anderson', company_name: 'Future Tech', email: 'thomas@futuretech.com', phone: '555-1111', source: 'Website', status: 'new', assigned_to_name: 'Alex Johnson' },
            { id: '2', first_name: 'Lisa', last_name: 'Chen', company_name: 'Innovative Solutions', email: 'lisa@innosol.com', phone: '555-2222', source: 'Referral', status: 'contacted', assigned_to_name: 'Maria Garcia' },
            { id: '3', first_name: 'David', last_name: 'Williams', company_name: 'Peak Performance', email: 'david@peakperf.com', phone: '555-3333', source: 'Event', status: 'qualified', assigned_to_name: 'Alex Johnson' },
            { id: '4', first_name: 'Emily', last_name: 'Taylor', company_name: 'Global Retail', email: 'emily@globalretail.com', phone: '555-4444', source: 'Social Media', status: 'unqualified', assigned_to_name: 'James Wilson' },
            { id: '5', first_name: 'Mohammed', last_name: 'Ali', company_name: 'Fast Logistics', email: 'mohammed@fastlog.com', phone: '555-5555', source: 'Email Campaign', status: 'converted', assigned_to_name: 'Maria Garcia' },
          ];
          setLeads(mockLeads);
          setTotalLeads(mockLeads.length);
        }
      } catch (error) {
        logger.error('Error fetching leads:', error);
        // Show mock data for demonstration
        const mockLeads = [
          { id: '1', first_name: 'Thomas', last_name: 'Anderson', company_name: 'Future Tech', email: 'thomas@futuretech.com', phone: '555-1111', source: 'Website', status: 'new', assigned_to_name: 'Alex Johnson' },
          { id: '2', first_name: 'Lisa', last_name: 'Chen', company_name: 'Innovative Solutions', email: 'lisa@innosol.com', phone: '555-2222', source: 'Referral', status: 'contacted', assigned_to_name: 'Maria Garcia' },
          { id: '3', first_name: 'David', last_name: 'Williams', company_name: 'Peak Performance', email: 'david@peakperf.com', phone: '555-3333', source: 'Event', status: 'qualified', assigned_to_name: 'Alex Johnson' },
          { id: '4', first_name: 'Emily', last_name: 'Taylor', company_name: 'Global Retail', email: 'emily@globalretail.com', phone: '555-4444', source: 'Social Media', status: 'unqualified', assigned_to_name: 'James Wilson' },
          { id: '5', first_name: 'Mohammed', last_name: 'Ali', company_name: 'Fast Logistics', email: 'mohammed@fastlog.com', phone: '555-5555', source: 'Email Campaign', status: 'converted', assigned_to_name: 'Maria Garcia' },
        ];
        setLeads(mockLeads);
        setTotalLeads(mockLeads.length);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeads();
  }, [page, rowsPerPage, searchTerm, statusFilter, token]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleDeleteClick = (lead) => {
    setSelectedLead(lead);
    setOpenDeleteDialog(true);
  };

  const handleConvertClick = (lead) => {
    setSelectedLead(lead);
    setOpenConvertDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLead) return;
    
    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Remove deleted lead from the list
        setLeads(leads.filter(l => l.id !== selectedLead.id));
        setTotalLeads(totalLeads - 1);
      } else {
        logger.error('Failed to delete lead');
      }
    } catch (error) {
      logger.error('Error deleting lead:', error);
    } finally {
      setOpenDeleteDialog(false);
      setSelectedLead(null);
    }
  };

  const handleConvertConfirm = async () => {
    if (!selectedLead) return;
    
    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}/convert/`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Update the lead status in the list
        setLeads(leads.map(l => 
          l.id === selectedLead.id ? { ...l, status: 'converted' } : l
        ));
      } else {
        logger.error('Failed to convert lead');
      }
    } catch (error) {
      logger.error('Error converting lead:', error);
    } finally {
      setOpenConvertDialog(false);
      setSelectedLead(null);
    }
  };

  const handleDialogCancel = () => {
    setOpenDeleteDialog(false);
    setOpenConvertDialog(false);
    setSelectedLead(null);
  };

  const getStatusChip = (status) => {
    const statusObj = statuses.find(s => s.value === status) || { label: status, color: 'gray' };
    
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[statusObj.color]}`}>
        {statusObj.label}
      </span>
    );
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-4">
        Lead Management
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Total Leads
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {totalLeads}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            New Leads (30d)
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {leads.filter(l => l.status === 'new').length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Qualified
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {leads.filter(l => l.status === 'qualified').length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Conversion Rate
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {leads.length > 0 
              ? `${Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)}%` 
              : '0%'}
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search Leads"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="flex space-x-2">
          <div className="relative">
            <button 
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
              onClick={() => setStatusFilter('')}
            >
              <FilterListIcon className="h-5 w-5 mr-2" />
              Filter
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {statusFilter && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="p-2">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-black mb-1">Status</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded text-black"
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                    >
                      <option value="">All Statuses</option>
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Source</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded text-black"
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                    >
                      <option value="">All Sources</option>
                      {sources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button 
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={() => setStatusFilter('')}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <AddIcon className="h-5 w-5 mr-2" />
            Add Lead
          </button>
        </div>
      </div>
      
      {/* Leads Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Source</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-black">{`${lead.first_name} ${lead.last_name}`}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{lead.company_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{lead.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' : 
                        lead.status === 'qualified' ? 'bg-green-100 text-green-800' : 
                        lead.status === 'unqualified' ? 'bg-red-100 text-red-800' : 
                        lead.status === 'converted' ? 'bg-purple-100 text-purple-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{lead.source || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => handleConvertClick(lead)}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteClick(lead)}
                    >
                      <DeleteIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-black">
                Showing <span className="font-medium">{leads.length > 0 ? ((page - 1) * rowsPerPage) + 1 : 0}</span> to <span className="font-medium">{Math.min(page * rowsPerPage, totalLeads)}</span> of{' '}
                <span className="font-medium">{totalLeads}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handleChangePage(page - 1)}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {[...Array(Math.ceil(totalLeads / rowsPerPage)).keys()].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleChangePage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                      page === i + 1 
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                        : 'bg-white text-black hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => handleChangePage(page + 1)}
                  disabled={page === Math.ceil(totalLeads / rowsPerPage)}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 ${page === Math.ceil(totalLeads / rowsPerPage) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      {/* Convert Lead Dialog */}
      <Dialog
        open={openConvertDialog}
        onClose={handleDialogCancel}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-black mb-4">
              Convert Lead to Customer
            </Dialog.Title>
            <div className="mt-2">
              <p className="text-sm text-black">
                Are you sure you want to convert 
                {selectedLead && ` "${selectedLead.first_name} ${selectedLead.last_name}"`} 
                from {selectedLead?.company_name} to a customer? 
                This will create a new customer record in the system.
              </p>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleDialogCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Convert
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default LeadsManagement;