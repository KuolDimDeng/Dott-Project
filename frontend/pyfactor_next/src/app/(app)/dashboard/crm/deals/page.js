'use client';


import withPageAccess from '../../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import { fetchAuthSession } from '@/config/amplifyUnified';
import { appCache } from @/utils/appCache';

const DealsPage = () => {
  const router = useRouter();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDealDetails, setShowDealDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'closeDate', direction: 'asc' });

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true);
        
        // Get authenticated user session
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        
        // Check if deals are available in AppCache first
        const cachedDeals = await appCache.get('crm_deals');
        if (cachedDeals) {
          setDeals(JSON.parse(cachedDeals));
          setLoading(false);
          
          // Refresh cache in background
          fetchAndUpdateDeals(token);
          return;
        }
        
        await fetchAndUpdateDeals(token);
      } catch (err) {
        console.error("Error fetching deals:", err);
        setError("Failed to load deals. Please try again later.");
        setLoading(false);
      }
    };
    
    const fetchAndUpdateDeals = async (token) => {
      try {
        // In a real implementation, you would fetch actual data from your backend
        // For now, we'll use mock data
        const mockDeals = [
          {
            id: 1,
            name: 'Enterprise Software Package',
            customer: 'Tech Innovators',
            contactName: 'Robert Chambers',
            contactEmail: 'robert.chambers@techinnovators.com',
            status: 'won',
            value: 75000,
            closeDate: '2023-10-15',
            createdDate: '2023-08-01',
            owner: 'Jane Smith',
            type: 'New Business',
            tags: ['Enterprise', 'Software'],
            terms: 'Net 30',
            paymentSchedule: 'Monthly',
            description: 'Comprehensive enterprise software solution including inventory management, HR, and finance modules.',
            notes: 'Client has been very satisfied with the solution. Potential for upselling additional modules next quarter.'
          },
          {
            id: 2,
            name: 'POS System Upgrade',
            customer: 'Retail Masters',
            contactName: 'Alice Cooper',
            contactEmail: 'alice.cooper@retailmasters.com',
            status: 'pending',
            value: 35000,
            closeDate: '2023-11-30',
            createdDate: '2023-09-15',
            owner: 'Mike Johnson',
            type: 'Upgrade',
            tags: ['Retail', 'POS'],
            terms: 'Net 45',
            paymentSchedule: 'Quarterly',
            description: 'Upgrade of existing POS system to include inventory management and customer loyalty features.',
            notes: 'Customer is hesitant about the price. Consider offering a discount or extended payment terms.'
          },
          {
            id: 3,
            name: 'Healthcare Data Solution',
            customer: 'Healthcare Plus',
            contactName: 'James Wilson',
            contactEmail: 'james.wilson@healthcareplus.com',
            status: 'won',
            value: 120000,
            closeDate: '2023-10-05',
            createdDate: '2023-07-20',
            owner: 'Jane Smith',
            type: 'New Business',
            tags: ['Healthcare', 'Data'],
            terms: 'Net 60',
            paymentSchedule: 'Annual',
            description: 'Comprehensive HIPAA-compliant data management solution for healthcare providers.',
            notes: 'This is our largest healthcare client to date. Use as a reference for future healthcare deals.'
          },
          {
            id: 4,
            name: 'Startup Growth Package',
            customer: 'Startup Ventures',
            contactName: 'Thomas Baker',
            contactEmail: 'thomas.baker@startupventures.com',
            status: 'pending',
            value: 25000,
            closeDate: '2023-11-15',
            createdDate: '2023-09-01',
            owner: 'Mike Johnson',
            type: 'New Business',
            tags: ['Startup', 'Growth'],
            terms: 'Net 30',
            paymentSchedule: 'Monthly',
            description: 'Tailored software package for startups including CRM, inventory, and basic accounting.',
            notes: 'Startup has limited budget but high growth potential. Offering special startup pricing.'
          },
          {
            id: 5,
            name: 'Manufacturing Solution',
            customer: 'Industrial Systems Inc.',
            contactName: 'George Miller',
            contactEmail: 'george.miller@industrialsystems.com',
            status: 'lost',
            value: 85000,
            closeDate: '2023-09-30',
            createdDate: '2023-06-15',
            owner: 'Jane Smith',
            type: 'New Business',
            tags: ['Manufacturing', 'IoT'],
            terms: 'Net 45',
            paymentSchedule: 'Quarterly',
            description: 'IoT-based manufacturing monitoring and management system.',
            notes: 'Lost to competitor based on price. Need to review our pricing strategy for manufacturing sector.'
          },
          {
            id: 6,
            name: 'Consulting Services Package',
            customer: 'Global Consulting Group',
            contactName: 'Sarah Johnson',
            contactEmail: 'sarah.johnson@gcg.com',
            status: 'won',
            value: 45000,
            closeDate: '2023-10-20',
            createdDate: '2023-08-10',
            owner: 'David Smith',
            type: 'Services',
            tags: ['Consulting', 'Services'],
            terms: 'Net 15',
            paymentSchedule: 'Monthly',
            description: 'Comprehensive consulting services package including strategy, implementation, and support.',
            notes: 'Client very pleased with initial proposal. Has already referred us to two other potential clients.'
          }
        ];
        
        // Store in AppCache for future quick access
        await appCache.set('crm_deals', JSON.stringify(mockDeals), { expires: 60 * 10 }); // 10 minutes cache
        
        setDeals(mockDeals);
        setLoading(false);
      } catch (err) {
        console.error("Error updating deals:", err);
        setError("Failed to update deals. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchDeals();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Sort and filter deals
  const sortedDeals = React.useMemo(() => {
    let filteredDeals = [...deals];
    
    // Apply search filter
    if (searchTerm) {
      filteredDeals = filteredDeals.filter(deal => 
        deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.contactName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filteredDeals = filteredDeals.filter(deal => deal.status === activeFilter);
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filteredDeals.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredDeals;
  }, [deals, searchTerm, activeFilter, sortConfig]);

  const handleViewDeal = (deal) => {
    setSelectedDeal(deal);
    setShowDealDetails(true);
  };

  const handleAddDeal = () => {
    // In a real app, navigate to add deal form
    alert('Add deal functionality would go here');
  };

  const handleCloseDetails = () => {
    setShowDealDetails(false);
  };

  // Calculate metrics
  const totalDealsValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const wonDealsValue = deals.filter(deal => deal.status === 'won').reduce((sum, deal) => sum + deal.value, 0);
  const pendingDealsValue = deals.filter(deal => deal.status === 'pending').reduce((sum, deal) => sum + deal.value, 0);
  
  // Format currency
  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Deals</h1>
          <button 
            onClick={handleAddDeal} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Deal
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Deals overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Total Deals Value</h2>
            <p className="text-2xl font-bold text-blue-600">
              {loading ? (
                <div className="h-8 bg-blue-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(totalDealsValue)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Value of all deals in the system</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Won Deals Value</h2>
            <p className="text-2xl font-bold text-green-600">
              {loading ? (
                <div className="h-8 bg-green-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(wonDealsValue)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Value of all won deals</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Pending Deals Value</h2>
            <p className="text-2xl font-bold text-yellow-600">
              {loading ? (
                <div className="h-8 bg-yellow-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(pendingDealsValue)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Value of deals awaiting closure</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <div className="w-full md:w-1/2 mb-4 md:mb-0 md:mr-4">
              <input
                type="text"
                placeholder="Search deals..."
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
                onClick={() => handleFilterChange('won')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'won' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Won
              </button>
              <button 
                onClick={() => handleFilterChange('pending')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => handleFilterChange('lost')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'lost' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Lost
              </button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex py-4 border-b border-gray-200">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
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
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('name')}
                    >
                      Deal Name
                      {sortConfig.key === 'name' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('customer')}
                    >
                      Customer
                      {sortConfig.key === 'customer' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('status')}
                    >
                      Status
                      {sortConfig.key === 'status' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('value')}
                    >
                      Value
                      {sortConfig.key === 'value' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('closeDate')}
                    >
                      Close Date
                      {sortConfig.key === 'closeDate' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedDeals.length > 0 ? (
                    sortedDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">{deal.customer.substring(0, 2).toUpperCase()}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{deal.name}</div>
                              <div className="text-sm text-gray-500">{deal.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{deal.customer}</div>
                          <div className="text-sm text-gray-500">{deal.contactName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(deal.status)}`}>
                            {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(deal.value)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{deal.closeDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleViewDeal(deal)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No deals found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Deal Details Modal */}
      {showDealDetails && selectedDeal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-auto py-10">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">Deal Details</h2>
              <button 
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedDeal.name}</h3>
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDeal.status)}`}>
                  {selectedDeal.status.charAt(0).toUpperCase() + selectedDeal.status.slice(1)}
                </span>
                <span className="text-gray-600">{formatCurrency(selectedDeal.value)}</span>
                <span className="text-gray-600">Closed: {selectedDeal.closeDate}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Customer Information</h4>
                <p className="text-gray-800 font-medium">{selectedDeal.customer}</p>
                <p className="text-gray-700">{selectedDeal.contactName}</p>
                <p className="text-gray-600 text-sm">{selectedDeal.contactEmail}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Deal Information</h4>
                <p className="text-gray-700">Owner: <span className="font-medium">{selectedDeal.owner}</span></p>
                <p className="text-gray-700">Deal Type: <span className="font-medium">{selectedDeal.type}</span></p>
                <p className="text-gray-600 text-sm">Created: {selectedDeal.createdDate}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Payment Terms</h4>
                <p className="text-gray-700">Terms: <span className="font-medium">{selectedDeal.terms}</span></p>
                <p className="text-gray-700">Schedule: <span className="font-medium">{selectedDeal.paymentSchedule}</span></p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Tags</h4>
                <div className="flex flex-wrap">
                  {selectedDeal.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mr-2 mb-2">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Description</h4>
              <p className="text-gray-800 bg-gray-50 p-3 rounded">{selectedDeal.description}</p>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Notes</h4>
              <p className="text-gray-800 bg-gray-50 p-3 rounded">{selectedDeal.notes}</p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                Edit Deal
              </button>
              {selectedDeal.status === 'pending' && (
                <>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                    Mark as Won
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                    Mark as Lost
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
};

// Wrap the component with page access control
export default withPageAccess(DealsPage, PAGE_ACCESS.CRM);
