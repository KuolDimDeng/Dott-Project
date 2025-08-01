import React, { useState, useEffect } from 'react';
import {
  saveEstimate,
  printEstimate,
  emailEstimate,
  getEstimatePdf,
} from '../actions/estimateActions';
import EstimatePdfViewer from '../components/EstimatePdfViewer';

const EstimatePreviewModal = ({ isOpen, onClose, estimateId }) => {
  const [pdfBlob, setPdfBlob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (estimateId) {
      setLoading(true);
      getEstimatePdf(estimateId)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfBlob(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching PDF:', err);
          setError('Failed to load PDF: ' + err.message);
          setLoading(false);
        });
    }
  }, [estimateId]);

  const handleSave = () => {
    saveEstimate(estimateId);
  };

  const handlePrint = () => {
    printEstimate(estimateId);
  };

  const handleEmail = () => {
    emailEstimate(estimateId);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        {/* Modal panel */}
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-4/5 h-4/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col p-6">
          {loading ? (
            <div className="flex items-center justify-center flex-grow">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 flex-grow flex items-center justify-center">{error}</div>
          ) : (
            <div className="flex-grow">
              <EstimatePdfViewer pdfBlob={pdfBlob} />
            </div>
          )}
          
          <div className="mt-4 flex justify-between">
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save
            </button>
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Print
            </button>
            <button 
              onClick={handleEmail}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Email
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePreviewModal;
