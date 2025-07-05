'use client';


import withPageAccess from '../../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import { fetchAuthSession } from '@/config/amplifyUnified';
import { appCache } from @/utils/appCache';

const LeadsPage = () => {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        
        // Get authenticated user session
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        
        // Check if leads are available in AppCache first
        const cachedLeads = await appCache.get('crm_leads');
        if (cachedLeads) {
          setLeads(JSON.parse(cachedLeads));
          setLoading(false);
          
          // Refresh cache in background
          fetchAndUpdateLeads(token);
          return;
        }
        
        await fetchAndUpdateLeads(token);
      } catch (err) {
        console.error("Error fetching leads:", err);
        setError("Failed to load leads. Please try again later.");
        setLoading(false);
      }
    };
    
    const fetchAndUpdateLeads = async (token) => {
      try {
        // In a real implementation, you would fetch actual data from your backend
        // For now, we'll use mock data
        const mockLeads = [
          {
            id: 1,
            name: 'Robert Chambers',
            email: 'robert.chambers@example.com',
            phone: '(555) 123-4567',
            company: 'Tech Innovators',
            position: 'CTO',
            status: 'new',
            source: 'Website Form',
            dateCreated: '2023-10-15',
            estimatedValue: 15000,
            assignedTo: 'Jane Smith',
            tags: ['Tech', 'Enterprise'],
            notes: 'Interested in our enterprise software solutions. Requested a demo.',
            stage: 'Qualification'
          },
          {
            id: 2,
            name: 'Alice Cooper',
            email: 'alice.cooper@example.com',
            phone: '(555) 987-6543',
            company: 'Retail Masters',
            position: 'Purchasing Manager',
            status: 'in-progress',
            source: 'Trade Show',
            dateCreated: '2023-10-10',
            estimatedValue: 8500,
            assignedTo: 'Mike Johnson',
            tags: ['Retail', 'Mid-market'],
            notes: 'Met at the Chicago trade show. Looking for inventory management system.',
            stage: 'Needs Analysis'
          },
          {
            id: 3,
            name: 'James Wilson',
            email: 'james.wilson@example.com',
            phone: '(555) 456-7890',
            company: 'Healthcare Plus',
            position: 'Director of IT',
            status: 'qualified',
            source: 'Referral',
            dateCreated: '2023-09-28',
            estimatedValue: 25000,
            assignedTo: 'Jane Smith',
            tags: ['Healthcare', 'Enterprise'],
            notes: 'Referred by existing customer. Looking for HIPAA compliant solutions.',
            stage: 'Proposal'
          },
          {
            id: 4,
            name: 'Maria Rodriguez',
            email: 'maria.rodriguez@example.com',
            phone: '(555) 234-5678',
            company: 'Global Logistics',
            position: 'Operations Manager',
            status: 'unqualified',
            source: 'LinkedIn',
            dateCreated: '2023-10-05',
            estimatedValue: 0,
            assignedTo: 'David Smith',
            tags: ['Logistics', 'International'],
            notes: 'Budget constraints, not ready to purchase in the next 12 months.',
            stage: 'Closed Lost'
          },
          {
            id: 5,
            name: 'Thomas Baker',
            email: 'thomas.baker@example.com',
            phone: '(555) 876-5432',
            company: 'Startup Ventures',
            position: 'Founder',
            status: 'in-progress',
            source: 'Content Download',
            dateCreated: '2023-10-12',
            estimatedValue: 5000,
            assignedTo: 'Mike Johnson',
            tags: ['Startup', 'Small Business'],
            notes: 'Downloaded our startup guide. Interested in affordable solutions to scale business.',
            stage: 'Demo'
          }
        ];
        
        // Store in AppCache for future quick access
        await appCache.set('crm_leads', JSON.stringify(mockLeads), { expires: 60 * 10 }); // 10 minutes cache
        
        setLeads(mockLeads);
        setLoading(false);
      } catch (err) {
        console.error("Error updating leads:", err);
        setError("Failed to update leads. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchLeads();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const filteredLeads = leads.filter(lead => {
    // First apply search term filter
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then apply status filter
    if (activeFilter === 'all') {
      return matchesSearch;
    } else {
      return matchesSearch && lead.status === activeFilter;
    }
  });

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  const handleAddLead = () => {
    // In a real app, navigate to add lead form
    alert('Add lead functionality would go here');
  };

  const handleConvertToOpportunity = (leadId) => {
    // In a real app, this would call an API to convert the lead
    alert(`Converting lead ${leadId} to opportunity`);
  };

  const handleCloseDetails = () => {
    setShowLeadDetails(false);
  };

  // RLS policy for leads data - In a real implementation, this would be enforced by the backend
  const applyRowLevelSecurity = () => {
    // This is just to demonstrate the concept
    const userRole = 'manager'; // In reality, this would come from Cognito attributes
    const userName = 'Jane Smith'; // Would come from Cognito
    
    if (userRole === 'admin') {
      return leads; // Admins see all leads
    } else if (userRole === 'manager') {
      // Managers see their team's leads
      return leads; // In mock data, we're showing all
    } else {
      // Regular users see only their assigned leads
      return leads.filter(lead => lead.assignedTo === userName);
    }
  };

  // Get the status colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'unqualified':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get the lead stage colors
  const getStageColor = (stage) => {
    switch(stage) {
      case 'Qualification':
        return 'bg-purple-100 text-purple-800';
      case 'Needs Analysis':
        return 'bg-blue-100 text-blue-800';
      case 'Demo':
        return 'bg-indigo-100 text-indigo-800';
      case 'Proposal':
        return 'bg-green-100 text-green-800';
      case 'Negotiation':
        return 'bg-yellow-100 text-yellow-800';
      case 'Closed Won':
        return 'bg-emerald-100 text-emerald-800';
      case 'Closed Lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Leads</h1>
          <button 
            onClick={handleAddLead} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Lead
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <div className="w-full md:w-1/2 mb-4 md:mb-0 md:mr-4">
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                All
              </button>
              <button 
                onClick={() => handleFilterChange('new')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                New
              </button>
              <button 
                onClick={() => handleFilterChange('in-progress')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'in-progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                In Progress
              </button>
              <button 
                onClick={() => handleFilterChange('qualified')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'qualified' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Qualified
              </button>
              <button 
                onClick={() => handleFilterChange('unqualified')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'unqualified' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Unqualified
              </button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex py-4 border-b border-gray-200">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-24 h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">{lead.name.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                              <div className="text-sm text-gray-500">{lead.company}</div>
                              <div className="text-xs text-gray-500">{lead.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStageColor(lead.stage)}`}>
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {lead.estimatedValue > 0 ? `$${lead.estimatedValue.toLocaleString()}` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{lead.source}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleViewLead(lead)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          {lead.status === 'qualified' && (
                            <button 
                              onClick={() => handleConvertToOpportunity(lead.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Convert
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No leads found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lead Acquisition Funnel Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Lead Funnel</h2>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="w-full md:w-1/4 p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-700">
                {loading ? (
                  <div className="h-8 bg-blue-200 rounded animate-pulse w-1/2 mx-auto"></div>
                ) : (
                  leads.filter(lead => lead.status === 'new').length
                )}
              </div>
              <div className="text-sm text-blue-600 mt-1">New Leads</div>
            </div>
            
            <div className="w-full md:w-1/4 p-4 bg-yellow-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-700">
                {loading ? (
                  <div className="h-8 bg-yellow-200 rounded animate-pulse w-1/2 mx-auto"></div>
                ) : (
                  leads.filter(lead => lead.status === 'in-progress').length
                )}
              </div>
              <div className="text-sm text-yellow-600 mt-1">In Progress</div>
            </div>
            
            <div className="w-full md:w-1/4 p-4 bg-green-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-700">
                {loading ? (
                  <div className="h-8 bg-green-200 rounded animate-pulse w-1/2 mx-auto"></div>
                ) : (
                  leads.filter(lead => lead.status === 'qualified').length
                )}
              </div>
              <div className="text-sm text-green-600 mt-1">Qualified</div>
            </div>
            
            <div className="w-full md:w-1/4 p-4 bg-red-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-700">
                {loading ? (
                  <div className="h-8 bg-red-200 rounded animate-pulse w-1/2 mx-auto"></div>
                ) : (
                  leads.filter(lead => lead.status === 'unqualified').length
                )}
              </div>
              <div className="text-sm text-red-600 mt-1">Unqualified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Details Modal */}
      {showLeadDetails && selectedLead && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">Lead Details</h2>
              <button 
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 mb-4 md:mb-0 md:mr-4">
                <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl text-blue-600 font-medium">
                    {selectedLead.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
                  <p className="text-gray-600">{selectedLead.position}</p>
                  <p className="text-gray-600">{selectedLead.company}</p>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Tags</h4>
                  <div className="flex flex-wrap justify-center">
                    {selectedLead.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full m-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="md:w-2/3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Email</h4>
                    <p className="text-gray-800">{selectedLead.email}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Phone</h4>
                    <p className="text-gray-800">{selectedLead.phone}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Status</h4>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${getStatusColor(selectedLead.status)}`}>
                      {selectedLead.status.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Stage</h4>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${getStageColor(selectedLead.stage)}`}>
                      {selectedLead.stage}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Source</h4>
                    <p className="text-gray-800">{selectedLead.source}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Date Created</h4>
                    <p className="text-gray-800">{selectedLead.dateCreated}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Estimated Value</h4>
                    <p className="text-gray-800">
                      {selectedLead.estimatedValue > 0 ? `$${selectedLead.estimatedValue.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Assigned To</h4>
                    <p className="text-gray-800">{selectedLead.assignedTo}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Notes</h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">
                    {selectedLead.notes}
                  </p>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors mr-2">
                    Edit Lead
                  </button>
                  {selectedLead.status === 'qualified' && (
                    <button 
                      onClick={() => {
                        handleConvertToOpportunity(selectedLead.id);
                        handleCloseDetails();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Convert to Opportunity
                    </button>
                  )}
                  {selectedLead.status !== 'qualified' && (
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      Schedule Follow-up
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
};

// Wrap the component with page access control
export default withPageAccess(LeadsPage, PAGE_ACCESS.CRM);
