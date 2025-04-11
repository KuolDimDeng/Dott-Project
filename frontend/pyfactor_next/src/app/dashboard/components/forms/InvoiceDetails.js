import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const InvoiceDetails = ({ invoiceId, onBackToCustomerDetails }) => {
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDatabase, setUserDatabase] = useState(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.schema_name);
      logger.debug('User profile:', response.data);
      logger.debug('User database:', response.data.schema_name);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      setError('Failed to load user profile');
    }
  }, []);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId || !userDatabase) {
      logger.error('Invoice ID or User Database is not provided', { invoiceId, userDatabase });
      setError('Invoice ID or User Database is not provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    logger.info(`Fetching invoice with ID: ${invoiceId} from database: ${userDatabase}`);
    try {
      const response = await axiosInstance.get(`/api/invoices/${invoiceId}/`, {
        params: { database: userDatabase },
      });
      setInvoice(response.data);
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      if (error.response && error.response.status === 404) {
        setError(
          'Invoice not found. It may have been deleted or you may not have permission to view it.'
        );
      } else {
        setError('Failed to fetch invoice. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, userDatabase]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (invoiceId && userDatabase) {
      fetchInvoice();
    }
  }, [invoiceId, userDatabase, fetchInvoice]);

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
              <p className="font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
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
