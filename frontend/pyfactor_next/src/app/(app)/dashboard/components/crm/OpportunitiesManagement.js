'use client';


import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';

/**
 * Opportunities Management placeholder component
 * Will be implemented in future
 */
export default function OpportunitiesManagement() {
  // State management
  const [opportunities, setOpportunities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  
  // Dashboard summary stats
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [avgDealSize, setAvgDealSize] = useState(0);
  const [winRate, setWinRate] = useState(0);

  // Load opportunities data
  useEffect(() => {
    // This would be an API call in a real application
    const fetchOpportunities = () => {
      // Simulated data
      const mockOpportunities = [
        {
          id: 1,
          name: "Enterprise SaaS Solution",
          customer_name: "Acme Corp",
          value: 75000,
          stage: "proposal",
          expected_close_date: "2023-08-15",
          owner_name: "Jane Smith"
        },
        {
          id: 2,
          name: "Cloud Migration Project",
          customer_name: "TechGiant Inc",
          value: 120000,
          stage: "negotiation",
          expected_close_date: "2023-07-30",
          owner_name: "John Doe"
        },
        {
          id: 3,
          name: "Security Software Package",
          customer_name: "SecureBank Ltd",
          value: 95000,
          stage: "discovery",
          expected_close_date: "2023-09-10",
          owner_name: "Alice Johnson"
        },
        {
          id: 4,
          name: "AI Solution Implementation",
          customer_name: "FutureTech",
          value: 200000,
          stage: "qualification",
          expected_close_date: "2023-10-05",
          owner_name: "Bob Wilson"
        },
        {
          id: 5,
          name: "Data Analytics Platform",
          customer_name: "DataDriven Co",
          value: 85000,
          stage: "closed_won",
          expected_close_date: "2023-06-20",
          owner_name: "Sarah Parker"
        }
      ];
      
      setOpportunities(mockOpportunities);
      setTotal(mockOpportunities.length);
      setTotalPages(Math.ceil(mockOpportunities.length / limit));
      
      // Calculate summary stats
      setTotalOpportunities(mockOpportunities.length);
      const totalVal = mockOpportunities.reduce((sum, opp) => sum + opp.value, 0);
      setTotalValue(totalVal);
      setAvgDealSize(Math.round(totalVal / mockOpportunities.length));
      setWinRate(20); // In a real app, this would be calculated from actual closed opportunities
    };
    
    fetchOpportunities();
  }, [limit]);

  // Handlers
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // In a real app, this would trigger an API call with the search term
  };
  
  const applyFilters = () => {
    setShowFilterMenu(false);
    // In a real app, this would trigger an API call with the filters
  };
  
  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    // In a real app, this would trigger an API call with the new page
  };
  
  const handleCreateOpportunity = () => {
    // In a real app, this would open a form or navigate to a create page
    alert("Create opportunity form would open here");
  };
  
  const handleViewOpportunity = (opportunity) => {
    // In a real app, this would navigate to a detail view
    alert(`View details for ${opportunity.name}`);
  };
  
  const handleEditOpportunity = (opportunity) => {
    // In a real app, this would open an edit form
    alert(`Edit form for ${opportunity.name} would open here`);
  };
  
  const handleDeleteClick = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setOpenDeleteDialog(true);
  };
  
  const handleDeleteConfirm = () => {
    // In a real app, this would call an API to delete the opportunity
    setOpportunities(opportunities.filter(o => o.id !== selectedOpportunity.id));
    setTotal(total - 1);
    setTotalPages(Math.ceil((total - 1) / limit));
    setOpenDeleteDialog(false);
    setSelectedOpportunity(null);
  };
  
  const handleDialogCancel = () => {
    setOpenDeleteDialog(false);
    setSelectedOpportunity(null);
  };
  
  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-4">
        Opportunity Management
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Total Opportunities
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {totalOpportunities}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Open Value
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {formatCurrency(totalValue)}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Avg. Deal Size
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {formatCurrency(avgDealSize)}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Win Rate
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {winRate}%
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search Opportunities"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="flex space-x-2">
          <div className="relative">
            <button 
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filter
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="p-2">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-black mb-1">Stage</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded text-black"
                      value={filterStage}
                      onChange={(e) => setFilterStage(e.target.value)}
                    >
                      <option value="">All Stages</option>
                      <option value="discovery">Discovery</option>
                      <option value="qualification">Qualification</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed_won">Closed Won</option>
                      <option value="closed_lost">Closed Lost</option>
                    </select>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button 
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={applyFilters}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={handleCreateOpportunity}
          >
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Opportunity
          </button>
        </div>
      </div>
      
      {/* Opportunities Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Value</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Stage</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Close Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Owner</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-black">{opportunity.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{opportunity.customer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{formatCurrency(opportunity.value)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${opportunity.stage === 'discovery' ? 'bg-purple-100 text-purple-800' : 
                        opportunity.stage === 'qualification' ? 'bg-blue-100 text-blue-800' : 
                        opportunity.stage === 'proposal' ? 'bg-indigo-100 text-indigo-800' : 
                        opportunity.stage === 'negotiation' ? 'bg-yellow-100 text-yellow-800' : 
                        opportunity.stage === 'closed_won' ? 'bg-green-100 text-green-800' : 
                        opportunity.stage === 'closed_lost' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {opportunity.stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{formatDate(opportunity.expected_close_date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{opportunity.owner_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => handleViewOpportunity(opportunity)}
                    >
                      <svg className="h-5 w-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button 
                      className="text-green-600 hover:text-green-900 mr-3"
                      onClick={() => handleEditOpportunity(opportunity)}
                    >
                      <svg className="h-5 w-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteClick(opportunity)}
                    >
                      <svg className="h-5 w-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
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
                Showing <span className="font-medium">{opportunities.length > 0 ? ((page - 1) * limit) + 1 : 0}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
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
                
                {[...Array(totalPages)].map((_, i) => (
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
                  disabled={page === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDialogCancel}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-black mb-4">
              Delete Opportunity
            </Dialog.Title>
            <div className="mt-2">
              <p className="text-sm text-black">
                Are you sure you want to delete the opportunity 
                {selectedOpportunity && ` "${selectedOpportunity.name}"`}? 
                This action cannot be undone.
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
                onClick={handleDeleteConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
} 