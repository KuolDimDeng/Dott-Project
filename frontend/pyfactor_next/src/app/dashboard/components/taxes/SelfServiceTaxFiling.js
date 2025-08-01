// components/taxes/SelfServiceTaxFiling.js
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { axiosInstance } from '@/lib/axiosConfig';

const SelfServiceTaxFiling = () => {
  const [taxFilings, setTaxFilings] = useState([]);
  const [instructions, setInstructions] = useState({});
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  useEffect(() => {
    fetchTaxFilings();
    fetchInstructions();
  }, []);
  
  const fetchTaxFilings = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/taxes/tax-filings/', {
        params: { submission_method: 'self_service' }
      });
      setTaxFilings(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tax filings:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching tax filings',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const fetchInstructions = async () => {
    try {
      const response = await axiosInstance.get('/api/taxes/filing-instructions/');
      const instructionsMap = {};
      response.data.forEach(instruction => {
        instructionsMap[instruction.state] = instruction;
      });
      setInstructions(instructionsMap);
    } catch (error) {
      console.error('Error fetching instructions:', error);
    }
  };
  
  const handleOpenDialog = (filing) => {
    setSelectedFiling(filing);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFiling(null);
  };
  
  const handleDownloadPdf = async (filingId) => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/api/taxes/tax-filings/${filingId}/pdf/`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tax_filing_${filingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      
      setSnackbar({
        open: true,
        message: 'Tax filing PDF downloaded successfully',
        severity: 'success'
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setSnackbar({
        open: true,
        message: 'Error downloading PDF',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const handleConfirmFiled = async (filingId) => {
    try {
      setIsLoading(true);
      await axiosInstance.patch(`/api/taxes/tax-filings/${filingId}/`, {
        filing_status: 'submitted',
        notes: 'Filed by user via self-service'
      });
      
      // Update local state
      setTaxFilings(prevFilings => 
        prevFilings.map(filing => 
          filing.id === filingId 
            ? {...filing, filing_status: 'submitted'} 
            : filing
        )
      );
      
      setSnackbar({
        open: true,
        message: 'Tax filing marked as submitted',
        severity: 'success'
      });
      setIsLoading(false);
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating filing status:', error);
      setSnackbar({
        open: true,
        message: 'Error updating filing status',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const getStatusChip = (status) => {
    const statusStyles = {
      'preparation': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      'pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      'submitted': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'accepted': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'amended': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    };
    
    return (
      <span 
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  const groupFilingsByState = () => {
    const grouped = {};
    taxFilings.forEach(filing => {
      if (!grouped[filing.state_code]) {
        grouped[filing.state_code] = [];
      }
      grouped[filing.state_code].push(filing);
    });
    return grouped;
  };
  
  const groupedFilings = groupFilingsByState();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Self-Service Tax Filings
      </h1>
      
      <div className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
        For states not covered by Dott's full service tax filing, you'll need to file taxes yourself. 
        We provide the necessary documents and instructions to help you complete the process.
      </div>
      
      {Object.keys(groupedFilings).length > 0 ? (
        Object.entries(groupedFilings).map(([stateCode, stateFilings]) => (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6" key={stateCode}>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {stateCode} Filings
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateFilings.map(filing => (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm" key={filing.id}>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Period: {new Date(filing.filing_period_start).toLocaleDateString()} - {new Date(filing.filing_period_end).toLocaleDateString()}
                      </p>
                      {getStatusChip(filing.filing_status)}
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total Wages: ${filing.total_wages.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Withholding: ${filing.total_withholding.toLocaleString()}
                    </p>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
                    <button 
                      onClick={() => handleDownloadPdf(filing.id)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-main border border-primary-main rounded hover:bg-primary-main/10 focus:outline-none focus:ring-2 focus:ring-primary-main"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Download Form
                    </button>
                    <button 
                      onClick={() => handleOpenDialog(filing)}
                      disabled={filing.filing_status === 'submitted' || filing.filing_status === 'accepted'}
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium border rounded focus:outline-none focus:ring-2 focus:ring-primary-main ${
                        filing.filing_status === 'submitted' || filing.filing_status === 'accepted'
                          ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'text-primary-main border-primary-main hover:bg-primary-main/10'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        <path fillRule="evenodd" d="M8 11a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      View Instructions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">No self-service tax filings found</p>
        </div>
      )}
      
      {/* Dialog for Filing Instructions */}
      <Transition appear show={openDialog} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseDialog}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="absolute inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  {selectedFiling && (
                    <>
                      <Dialog.Title 
                        as="h3" 
                        className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
                      >
                        Filing Instructions for {selectedFiling.state_code}
                      </Dialog.Title>
                      
                      <div className="mb-6">
                        <h4 className="text-base font-medium mb-2 text-gray-900 dark:text-white">Filing Details</h4>
                        <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Period:</span> {new Date(selectedFiling.filing_period_start).toLocaleDateString()} - {new Date(selectedFiling.filing_period_end).toLocaleDateString()}
                        </p>
                        <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Total Wages:</span> ${selectedFiling.total_wages.toLocaleString()}
                        </p>
                        <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Withholding Amount:</span> ${selectedFiling.total_withholding.toLocaleString()}
                        </p>
                        <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Status:</span> {selectedFiling.filing_status}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-base font-medium mb-2 text-gray-900 dark:text-white">How to File</h4>
                        {instructions[selectedFiling.state] ? (
                          <>
                            <p className="text-sm mb-4 text-gray-700 dark:text-gray-300">
                              {instructions[selectedFiling.state].instructions}
                            </p>
                            <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                              Filing Frequency: {instructions[selectedFiling.state].filing_frequency}
                            </p>
                            <p className="text-sm font-medium mb-4 text-gray-700 dark:text-gray-300">
                              Due within {instructions[selectedFiling.state].due_days} days after period end
                            </p>
                            <a 
                              href={instructions[selectedFiling.state].portal_url} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
                            >
                              Go to State Filing Portal
                            </a>
                          </>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Please download the tax form and submit it through your state's tax portal.
                          </p>
                        )}
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          onClick={handleCloseDialog}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-main"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(selectedFiling.id)}
                          className="px-4 py-2 border border-primary-main text-primary-main hover:bg-primary-main/10 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
                        >
                          Download Form
                        </button>
                        <button
                          onClick={() => handleConfirmFiled(selectedFiling.id)}
                          disabled={selectedFiling.filing_status === 'submitted' || selectedFiling.filing_status === 'accepted'}
                          className={`px-4 py-2 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 ${
                            selectedFiling.filing_status === 'submitted' || selectedFiling.filing_status === 'accepted'
                              ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-primary-main hover:bg-primary-dark text-white'
                          }`}
                        >
                          Mark as Filed
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Toast Notification */}
      {snackbar.open && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-md shadow-lg ${
          snackbar.severity === 'success' ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
          snackbar.severity === 'error' ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' :
          'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
        }`}>
          <div className="flex items-center">
            <span>{snackbar.message}</span>
            <button 
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfServiceTaxFiling;