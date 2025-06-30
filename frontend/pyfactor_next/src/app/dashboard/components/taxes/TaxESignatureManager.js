'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon,
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { taxesApi } from '@/services/api/taxes';
import StandardSpinner from '@/components/ui/StandardSpinner';

const TaxESignatureManager = () => {
  const { isAuthenticated } = useAuth();
  const [signatureRequests, setSignatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statistics, setStatistics] = useState({});
  const [availableProviders, setAvailableProviders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    tax_form_type: '',
    tax_year: new Date().getFullYear()
  });

  // Fetch signature requests
  const fetchSignatureRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        page_size: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      });

      const response = await taxesApi.esignature.getRequests(Object.fromEntries(params));
      setSignatureRequests(response.data.results);
      setTotalPages(response.data.total_pages);
    } catch (err) {
      setError('Failed to load signature requests');
      console.error('Error fetching signature requests:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await taxesApi.esignature.getStatistics();
      setStatistics(response.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }, []);

  // Fetch available providers
  const fetchProviders = useCallback(async () => {
    try {
      const response = await taxesApi.esignature.getProviders();
      setAvailableProviders(response.data.providers);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSignatureRequests();
      fetchStatistics();
      fetchProviders();
    }
  }, [isAuthenticated, fetchSignatureRequests, fetchStatistics, fetchProviders]);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
      sent: { color: 'bg-blue-100 text-blue-800', icon: PaperAirplaneIcon },
      signed: { color: 'bg-yellow-100 text-yellow-800', icon: UserGroupIcon },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      expired: { color: 'bg-orange-100 text-orange-800', icon: ExclamationTriangleIcon },
      declined: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      error: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Statistics cards
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Requests
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {statistics.total_requests || 0}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Completed
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {statistics.completed || 0}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Pending
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {statistics.pending || 0}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Cancelled
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {statistics.cancelled || 0}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  // Create signature request modal
  const CreateSignatureRequestModal = () => {
    const [formData, setFormData] = useState({
      document_name: '',
      tax_form_type: '',
      tax_year: new Date().getFullYear(),
      provider_name: 'internal',
      signers: [{ email: '', name: '', role: 'signer' }],
      document_file: null
    });
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setUploading(true);

      try {
        const formDataToSend = new FormData();
        Object.keys(formData).forEach(key => {
          if (key === 'signers') {
            formDataToSend.append(key, JSON.stringify(formData[key]));
          } else if (key === 'document_file') {
            if (formData[key]) {
              formDataToSend.append(key, formData[key]);
            }
          } else {
            formDataToSend.append(key, formData[key]);
          }
        });

        await taxesApi.esignature.createRequest(formDataToSend);

        setShowCreateModal(false);
        fetchSignatureRequests();
        fetchStatistics();
      } catch (err) {
        setError('Failed to create signature request');
        console.error('Error creating signature request:', err);
      } finally {
        setUploading(false);
      }
    };

    const addSigner = () => {
      setFormData(prev => ({
        ...prev,
        signers: [...prev.signers, { email: '', name: '', role: 'signer' }]
      }));
    };

    const updateSigner = (index, field, value) => {
      setFormData(prev => ({
        ...prev,
        signers: prev.signers.map((signer, i) => 
          i === index ? { ...signer, [field]: value } : signer
        )
      }));
    };

    const removeSigner = (index) => {
      setFormData(prev => ({
        ...prev,
        signers: prev.signers.filter((_, i) => i !== index)
      }));
    };

    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Create Signature Request
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Document Name
                </label>
                <input
                  type="text"
                  value={formData.document_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tax Form Type
                  </label>
                  <input
                    type="text"
                    value={formData.tax_form_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_form_type: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1040, W-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tax Year
                  </label>
                  <input
                    type="number"
                    value={formData.tax_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_year: parseInt(e.target.value) }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Provider
                  </label>
                  <select
                    value={formData.provider_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider_name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableProviders.map(provider => (
                      <option key={provider.name} value={provider.name}>
                        {provider.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Document File (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFormData(prev => ({ ...prev, document_file: e.target.files[0] }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Signers
                  </label>
                  <button
                    type="button"
                    onClick={addSigner}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add Signer
                  </button>
                </div>

                {formData.signers.map((signer, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-4">
                      <input
                        type="email"
                        placeholder="Email"
                        value={signer.email}
                        onChange={(e) => updateSigner(index, 'email', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={signer.name}
                        onChange={(e) => updateSigner(index, 'name', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={signer.role}
                        onChange={(e) => updateSigner(index, 'role', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="signer">Signer</option>
                        <option value="approver">Approver</option>
                        <option value="witness">Witness</option>
                        <option value="notary">Notary</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      {formData.signers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSigner(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {uploading ? <StandardSpinner size="small" className="mr-2" /> : null}
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Action handlers
  const handleSendRequest = async (requestId) => {
    try {
      await taxesApi.esignature.sendRequest(requestId);
      fetchSignatureRequests();
      fetchStatistics();
    } catch (err) {
      setError('Failed to send signature request');
      console.error('Error sending signature request:', err);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Are you sure you want to cancel this signature request?')) {
      return;
    }

    try {
      await taxesApi.esignature.cancelRequest(requestId);
      fetchSignatureRequests();
      fetchStatistics();
    } catch (err) {
      setError('Failed to cancel signature request');
      console.error('Error cancelling signature request:', err);
    }
  };

  const handleDownloadSigned = async (requestId, documentName) => {
    try {
      const response = await taxesApi.esignature.downloadSigned(requestId);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed_${documentName}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to download signed document');
      console.error('Error downloading signed document:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access e-signature management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          Tax E-Signature Management
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Request
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <StatisticsCards />

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="signed">Partially Signed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tax Form Type</label>
            <input
              type="text"
              value={filters.tax_form_type}
              onChange={(e) => setFilters(prev => ({ ...prev, tax_form_type: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1040, W-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tax Year</label>
            <input
              type="number"
              value={filters.tax_year}
              onChange={(e) => setFilters(prev => ({ ...prev, tax_year: parseInt(e.target.value) || '' }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchSignatureRequests();
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Signature Requests Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Signature Requests
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage your tax document signature requests
          </p>
        </div>

        {signatureRequests.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No signature requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new signature request.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Request
              </button>
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {signatureRequests.map((request) => (
                <li key={request.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {request.document_name}
                          </p>
                          <StatusBadge status={request.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          {request.tax_form_type && `${request.tax_form_type} - `}
                          {request.tax_year && `${request.tax_year} - `}
                          {request.signers_count} signer(s) • 
                          {request.signed_count} signed • 
                          Created {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.sent_at && (
                          <p className="text-xs text-gray-400">
                            Sent {new Date(request.sent_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {request.status === 'draft' && (
                        <button
                          onClick={() => handleSendRequest(request.id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Send for signature"
                        >
                          <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                      )}

                      {request.status === 'completed' && (
                        <button
                          onClick={() => handleDownloadSigned(request.id, request.document_name)}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Download signed document"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-gray-600 hover:text-gray-800 p-1"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>

                      {['draft', 'sent'].includes(request.status) && (
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Cancel request"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      <CreateSignatureRequestModal />

      {/* Request Details Modal */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdate={() => {
            fetchSignatureRequests();
            fetchStatistics();
          }}
        />
      )}
    </div>
  );
};

// Request Details Modal Component
const RequestDetailsModal = ({ request, onClose, onStatusUpdate }) => {
  const [requestDetails, setRequestDetails] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        setLoading(true);
        const [detailsResponse, auditResponse] = await Promise.all([
          taxesApi.esignature.getRequest(request.id),
          taxesApi.esignature.getAuditTrail(request.id)
        ]);
        
        setRequestDetails(detailsResponse.data);
        setAuditTrail(auditResponse.data.audit_logs);
      } catch (err) {
        console.error('Error fetching request details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [request.id]);

  const handleCheckStatus = async () => {
    try {
      await taxesApi.esignature.checkStatus(request.id);
      onStatusUpdate();
      // Refresh the details
      const detailsResponse = await taxesApi.esignature.getRequest(request.id);
      setRequestDetails(detailsResponse.data);
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-64">
            <StandardSpinner size="large" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Signature Request Details
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCheckStatus}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Check Status
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            {['details', 'signers', 'audit'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && requestDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Document Name</label>
                <p className="text-sm text-gray-900">{requestDetails.document_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  requestDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                  requestDetails.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  requestDetails.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {requestDetails.status_display}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Form Type</label>
                <p className="text-sm text-gray-900">{requestDetails.tax_form_type || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Year</label>
                <p className="text-sm text-gray-900">{requestDetails.tax_year || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <p className="text-sm text-gray-900">{requestDetails.provider_display}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-sm text-gray-900">
                  {new Date(requestDetails.created_at).toLocaleString()}
                </p>
              </div>
              {requestDetails.sent_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sent</label>
                  <p className="text-sm text-gray-900">
                    {new Date(requestDetails.sent_at).toLocaleString()}
                  </p>
                </div>
              )}
              {requestDetails.completed_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed</label>
                  <p className="text-sm text-gray-900">
                    {new Date(requestDetails.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Documents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
              <div className="space-y-2">
                {requestDetails.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    <div>
                      <p className="text-sm font-medium">{doc.document_type_display}</p>
                      <p className="text-xs text-gray-500">{doc.file_name}</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'signers' && requestDetails && (
          <div className="space-y-3">
            {requestDetails.signers.map((signer) => (
              <div key={signer.id} className="border border-gray-200 rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{signer.name}</p>
                    <p className="text-sm text-gray-600">{signer.email}</p>
                    <p className="text-xs text-gray-500">{signer.role}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      signer.status === 'signed' ? 'bg-green-100 text-green-800' :
                      signer.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      signer.status === 'declined' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {signer.status_display}
                    </span>
                    {signer.signed_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Signed {new Date(signer.signed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-3">
            {auditTrail.map((log) => (
              <div key={log.id} className="border-l-4 border-blue-200 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{log.event_type_display}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-gray-600">{log.description}</p>
                {log.user && (
                  <p className="text-xs text-gray-500">by {log.user}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxESignatureManager;