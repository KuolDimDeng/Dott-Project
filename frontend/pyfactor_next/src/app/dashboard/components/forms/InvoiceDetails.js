import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useUserProfile } from '@/contexts/UserProfileContext';

const InvoiceDetails = ({ invoiceId, onBackToCustomerDetails }) => {
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use the UserProfileContext instead of direct API calls
  const { profileData, loading: profileLoading, error: profileError } = useUserProfile();
  
  // Get user database from profile data
  const userDatabase = profileData?.schema_name;

  // Use this effect to fetch invoice details once we have userDatabase (from profile)
  useEffect(() => {
    if (!invoiceId) {
      setError('Invoice ID is required');
      setIsLoading(false);
      return;
    }
    
    // If profile is still loading, wait for it
    if (profileLoading) {
      return;
    }
    
    // If we have a profile error, report it
    if (profileError) {
      setError('Error loading user profile: ' + profileError);
      setIsLoading(false);
      return;
    }
    
    // Only attempt to fetch invoice if we have the database
    if (!userDatabase) {
      logger.warn('No user database available from profile, cannot fetch invoice details');
      setError('User database information not available');
      setIsLoading(false);
      return;
    }
    
    const fetchInvoiceDetails = async () => {
      try {
        setIsLoading(true);
        
        // Include database name in the request
        const response = await axiosInstance.get(`/api/invoices/${invoiceId}`, {
          params: { schema_name: userDatabase }
        });
        
        setInvoice(response.data);
        setIsLoading(false);
      } catch (err) {
        logger.error('Error fetching invoice details:', err);
        setError('Failed to load invoice details');
        setIsLoading(false);
      }
    };
    
    fetchInvoiceDetails();
  }, [invoiceId, userDatabase, profileLoading, profileError]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={onBackToCustomerDetails}
          className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Customer Details
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4">
        <p className="text-gray-600 mb-4">No invoice data available.</p>
        <button 
          onClick={onBackToCustomerDetails}
          className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Customer Details
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">Invoice Details</h1>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Invoice Number</p>
              <p className="font-medium">{invoice.invoice_num}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium">${invoice.amount}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">
                {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-medium">
                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{invoice.status}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Is Paid</p>
              <p className="font-medium">
                {invoice.is_paid ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    No
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button 
            onClick={onBackToCustomerDetails}
            className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Customer Details
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

InvoiceDetails.propTypes = {
  invoiceId: PropTypes.string.isRequired,
  onBackToCustomerDetails: PropTypes.func.isRequired,
};

export default InvoiceDetails;
