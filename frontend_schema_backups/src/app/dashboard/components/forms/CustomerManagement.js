// Import customerApi instead of axiosInstance
import { customerApi } from '@/utils/apiClient';

// Update the fetchCustomers function to handle schema creation
const fetchCustomers = async () => {
  try {
    setIsLoading(true);
    console.log('[CustomerManagement] Fetching customers...');
    
    // Get tenant ID
    const tenantId = localStorage.getItem('tenantId') || 'default';
    
    try {
      const data = await customerApi.getAll();
      console.log('[CustomerManagement] Customers data:', data);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (apiError) {
      // Handle errors in API client
      console.error('[CustomerManagement] Error in API call:', apiError);
      setCustomers([]);
      
      if (apiError.message?.includes('relation') && 
          apiError.message?.includes('does not exist')) {
        toast.info('Your customer database is being set up. This should only happen once.');
      } else {
        toast.error('Failed to load customers. Please try again.');
      }
    }
  } catch (error) {
    console.error('[CustomerManagement] Error fetching customers:', error);
    setCustomers([]);
    toast.error('Failed to load customers. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

// Update the customers list rendering to show a friendly message when no customers
const renderCustomersList = () => {
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }
  
  // Show empty state with helpful message
  if (!customers || customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 text-gray-300 mx-auto mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
            />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No Customers Yet</h3>
          <p className="text-gray-500 max-w-md">
            You haven't added any customers to your database yet. Get started by clicking the "Add Customer" button above.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add Your First Customer
        </button>
      </div>
    );
  }
  
  // Existing table rendering code
  // ... existing code ...
}; 