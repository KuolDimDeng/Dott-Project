'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import StandardSpinner, { ButtonSpinner, CenteredSpinner } from '@/components/ui/StandardSpinner';
import { 
  DocumentTextIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  CheckBadgeIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const TaxFilingStatus = () => {
  // State management
  const [filingData, setFilingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [showDocumentChecklist, setShowDocumentChecklist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filing stages configuration
  const filingStages = [
    { id: 'documents', name: 'Document Collection', icon: DocumentArrowUpIcon },
    { id: 'review', name: 'Tax Review', icon: DocumentCheckIcon },
    { id: 'preparation', name: 'Return Preparation', icon: DocumentTextIcon },
    { id: 'filing', name: 'E-Filing', icon: ArrowPathIcon },
    { id: 'acceptance', name: 'IRS Acceptance', icon: CheckBadgeIcon },
    { id: 'payment', name: 'Payment Processing', icon: CurrencyDollarIcon },
    { id: 'complete', name: 'Filing Complete', icon: CheckCircleIcon }
  ];

  // Document checklist items
  const documentChecklist = [
    { id: 'w2', name: 'W-2 Forms', required: true, category: 'Income' },
    { id: '1099', name: '1099 Forms', required: false, category: 'Income' },
    { id: 'receipts', name: 'Business Receipts', required: true, category: 'Deductions' },
    { id: 'mileage', name: 'Mileage Log', required: false, category: 'Deductions' },
    { id: 'bank', name: 'Bank Statements', required: true, category: 'Financial' },
    { id: 'insurance', name: 'Insurance Documents', required: false, category: 'Deductions' },
    { id: 'property', name: 'Property Tax Statements', required: false, category: 'Deductions' },
    { id: 'retirement', name: 'Retirement Contributions', required: false, category: 'Deductions' }
  ];

  // Mock data for demonstration
  useEffect(() => {
    fetchFilingStatus();
  }, []);

  const fetchFilingStatus = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setFilingData({
          taxYear: 2024,
          filingDeadline: '2025-04-15',
          currentStage: 'preparation',
          status: 'in_progress',
          lastUpdated: new Date().toISOString(),
          preparer: {
            name: 'John Smith, CPA',
            email: 'john.smith@taxfirm.com',
            phone: '(555) 123-4567'
          },
          timeline: [
            { stage: 'documents', status: 'completed', completedAt: '2025-01-15T10:00:00Z' },
            { stage: 'review', status: 'completed', completedAt: '2025-01-20T14:30:00Z' },
            { stage: 'preparation', status: 'in_progress', startedAt: '2025-01-22T09:00:00Z' },
            { stage: 'filing', status: 'pending' },
            { stage: 'acceptance', status: 'pending' },
            { stage: 'payment', status: 'pending' },
            { stage: 'complete', status: 'pending' }
          ],
          documents: {
            uploaded: ['w2', 'receipts', 'bank', '1099'],
            pending: ['mileage', 'insurance', 'property', 'retirement']
          },
          estimatedRefund: 3500,
          paymentDue: 0,
          filingType: 'Federal and State',
          filingMethod: 'E-File'
        });
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error fetching filing status:', error);
      toast.error('Failed to load tax filing status');
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFilingStatus();
    setRefreshing(false);
    toast.success('Status refreshed successfully');
  };

  const getStageStatus = (stageId) => {
    if (!filingData) return 'pending';
    const stage = filingData.timeline.find(t => t.stage === stageId);
    return stage?.status || 'pending';
  };

  const getStageIcon = (stageId, status) => {
    const stage = filingStages.find(s => s.id === stageId);
    const IconComponent = stage?.icon || DocumentTextIcon;
    
    const iconClasses = {
      completed: 'text-green-600',
      in_progress: 'text-blue-600 animate-pulse',
      pending: 'text-gray-400',
      error: 'text-red-600'
    };

    return <IconComponent className={`h-6 w-6 ${iconClasses[status]}`} />;
  };

  const handleActionClick = (action) => {
    switch (action) {
      case 'upload_documents':
        setShowDocumentChecklist(true);
        break;
      case 'contact_preparer':
        window.location.href = `mailto:${filingData.preparer.email}`;
        break;
      case 'download_return':
        toast.success('Downloading tax return...');
        break;
      case 'make_payment':
        toast.info('Redirecting to payment portal...');
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilDeadline = () => {
    if (!filingData?.filingDeadline) return null;
    const deadline = new Date(filingData.filingDeadline);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return <CenteredSpinner text="Loading tax filing status..." showText />;
  }

  const daysUntilDeadline = getDaysUntilDeadline();
  const currentStageIndex = filingStages.findIndex(s => s.id === filingData?.currentStage);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          Tax Filing Status - {filingData?.taxYear}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Filing Deadline</p>
              <p className="text-lg font-semibold text-black">{formatDate(filingData?.filingDeadline).split(',')[0]}</p>
              {daysUntilDeadline !== null && (
                <p className={`text-sm ${daysUntilDeadline < 30 ? 'text-red-600' : 'text-gray-600'}`}>
                  {daysUntilDeadline > 0 ? `${daysUntilDeadline} days remaining` : 'Deadline passed'}
                </p>
              )}
            </div>
            <CalendarIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Status</p>
              <p className="text-lg font-semibold text-blue-600 capitalize">
                {filingData?.status?.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-600">
                {filingStages.find(s => s.id === filingData?.currentStage)?.name}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimated Refund</p>
              <p className="text-lg font-semibold text-green-600">
                ${filingData?.estimatedRefund?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-gray-600">{filingData?.filingType}</p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Documents</p>
              <p className="text-lg font-semibold text-purple-600">
                {filingData?.documents?.uploaded?.length || 0}/{documentChecklist.length}
              </p>
              <p className="text-sm text-gray-600">Uploaded</p>
            </div>
            <DocumentCheckIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Visual Progress Tracker */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-black mb-4">Filing Progress</h3>
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
            <div 
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${((currentStageIndex + 1) / filingStages.length) * 100}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {filingStages.map((stage, index) => {
              const status = getStageStatus(stage.id);
              const isActive = stage.id === filingData?.currentStage;
              
              return (
                <div key={stage.id} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${status === 'completed' ? 'bg-green-600' : 
                      status === 'in_progress' ? 'bg-blue-600 ring-4 ring-blue-200' : 
                      'bg-gray-300'}
                  `}>
                    {status === 'completed' ? (
                      <CheckCircleIcon className="h-6 w-6 text-white" />
                    ) : (
                      <span className="text-white font-semibold text-sm">{index + 1}</span>
                    )}
                  </div>
                  <p className={`mt-2 text-xs text-center max-w-[100px] ${isActive ? 'font-semibold' : ''}`}>
                    {stage.name}
                  </p>
                  {status === 'in_progress' && (
                    <p className="text-xs text-blue-600 mt-1">In Progress</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline Details */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-black mb-4">Filing Timeline</h3>
        <div className="space-y-3">
          {filingData?.timeline?.map((item, index) => {
            const stage = filingStages.find(s => s.id === item.stage);
            const isLast = index === filingData.timeline.length - 1;
            
            return (
              <div key={item.stage} className="flex items-start">
                <div className="flex-shrink-0 w-10">
                  {getStageIcon(item.stage, item.status)}
                </div>
                <div className={`flex-grow ml-4 ${!isLast ? 'pb-3 border-b border-gray-100' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{stage?.name}</h4>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      item.status === 'completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  {item.completedAt && (
                    <p className="text-sm text-gray-600 mt-1">
                      Completed: {formatDate(item.completedAt)}
                    </p>
                  )}
                  {item.startedAt && item.status === 'in_progress' && (
                    <p className="text-sm text-gray-600 mt-1">
                      Started: {formatDate(item.startedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-black mb-4">Available Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filingData?.currentStage === 'documents' && (
            <button
              onClick={() => handleActionClick('upload_documents')}
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              Upload Documents
            </button>
          )}
          
          {['preparation', 'review'].includes(filingData?.currentStage) && (
            <button
              onClick={() => handleActionClick('contact_preparer')}
              className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Contact Preparer
            </button>
          )}
          
          {['acceptance', 'payment', 'complete'].includes(filingData?.currentStage) && (
            <button
              onClick={() => handleActionClick('download_return')}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Download Return
            </button>
          )}
          
          {filingData?.paymentDue > 0 && filingData?.currentStage === 'payment' && (
            <button
              onClick={() => handleActionClick('make_payment')}
              className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              Make Payment
            </button>
          )}

          <button
            onClick={() => setShowDocumentChecklist(true)}
            className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <DocumentCheckIcon className="h-5 w-5 mr-2" />
            Document Checklist
          </button>
        </div>
      </div>

      {/* Preparer Information */}
      {filingData?.preparer && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-black mb-3">Tax Preparer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-900">{filingData.preparer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{filingData.preparer.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium text-gray-900">{filingData.preparer.phone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Document Checklist Modal */}
      <Transition appear show={showDocumentChecklist} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowDocumentChecklist(false)}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Document Checklist
                  </Dialog.Title>
                  
                  <div className="space-y-4">
                    {['Income', 'Deductions', 'Financial'].map(category => (
                      <div key={category}>
                        <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                        <div className="space-y-2">
                          {documentChecklist
                            .filter(doc => doc.category === category)
                            .map(doc => {
                              const isUploaded = filingData?.documents?.uploaded?.includes(doc.id);
                              
                              return (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center">
                                    {isUploaded ? (
                                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                                    ) : (
                                      <XCircleIcon className="h-5 w-5 text-gray-400 mr-3" />
                                    )}
                                    <span className={`${isUploaded ? 'text-gray-900' : 'text-gray-600'}`}>
                                      {doc.name}
                                    </span>
                                    {doc.required && (
                                      <span className="ml-2 text-xs text-red-600">*Required</span>
                                    )}
                                  </div>
                                  {!isUploaded && (
                                    <button className="text-sm text-blue-600 hover:text-blue-800">
                                      Upload
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      onClick={() => setShowDocumentChecklist(false)}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default TaxFilingStatus;