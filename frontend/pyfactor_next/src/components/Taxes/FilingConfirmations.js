import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClockIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '../ui/StandardSpinner';

const FilingConfirmations = () => {
  const [confirmations, setConfirmations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedConfirmation, setSelectedConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('confirmations');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    fetchConfirmations();
    fetchNotifications();
  }, []);

  const fetchConfirmations = async () => {
    try {
      const response = await fetch('/api/taxes/confirmations/', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch confirmations');

      const data = await response.json();
      setConfirmations(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/taxes/notifications/', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.results || data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const downloadReceipt = async (confirmationId, confirmationNumber) => {
    try {
      const response = await fetch(`/api/taxes/confirmations/${confirmationId}/download_receipt/`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to download receipt');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax_filing_receipt_${confirmationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download receipt: ' + err.message);
    }
  };

  const resendNotification = async (confirmationId, notificationType) => {
    setResending(true);
    try {
      const response = await fetch(`/api/taxes/confirmations/${confirmationId}/resend_notification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_type: notificationType }),
      });

      if (!response.ok) throw new Error('Failed to resend notification');

      alert(`${notificationType === 'email' ? 'Email' : 'SMS'} notification sent successfully!`);
      fetchNotifications(); // Refresh notifications
    } catch (err) {
      alert('Failed to resend notification: ' + err.message);
    } finally {
      setResending(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p className="font-semibold">Error loading confirmations</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          Tax Filing Confirmations
        </h1>
        <p className="mt-2 text-gray-600">
          View and manage your tax filing confirmations and receipts
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('confirmations')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'confirmations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Confirmations ({confirmations.length})
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Notifications ({notifications.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'confirmations' && (
            <div className="space-y-4">
              {confirmations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No filing confirmations found
                </p>
              ) : (
                confirmations.map((confirmation) => (
                  <div
                    key={confirmation.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {confirmation.confirmation_number}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Confirmed
                          </span>
                        </div>
                        
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Filing Type:</span>{' '}
                            {confirmation.filing?.tax_type_display || 'N/A'}
                          </p>
                          <p>
                            <span className="font-medium">Tax Year:</span>{' '}
                            {confirmation.filing?.tax_year || confirmation.filing?.filing_year}
                          </p>
                          <p>
                            <span className="font-medium">State:</span>{' '}
                            {confirmation.filing?.state || 'Federal'}
                          </p>
                          <p>
                            <span className="font-medium">Generated:</span>{' '}
                            {new Date(confirmation.generated_at).toLocaleString()}
                          </p>
                          {confirmation.state_confirmation_number && (
                            <p>
                              <span className="font-medium">State Confirmation:</span>{' '}
                              {confirmation.state_confirmation_number}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <BellIcon className="h-4 w-4 mr-1" />
                            {confirmation.notification_count} notification{confirmation.notification_count !== 1 ? 's' : ''} sent
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {confirmation.pdf_receipt_available && (
                          <button
                            onClick={() => downloadReceipt(confirmation.id, confirmation.confirmation_number)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            Download Receipt
                          </button>
                        )}
                        
                        <button
                          onClick={() => setSelectedConfirmation(confirmation)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No notifications found
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {notification.notification_type === 'email' ? (
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <PhoneIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.recipient}
                          </p>
                          {getStatusIcon(notification.status)}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(notification.status)}`}>
                            {notification.status_display}
                          </span>
                        </div>
                        
                        {notification.subject && (
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.subject}
                          </p>
                        )}
                        
                        <div className="mt-1 text-xs text-gray-500 space-x-3">
                          <span>
                            Confirmation: {notification.confirmation_number}
                          </span>
                          {notification.sent_at && (
                            <span>
                              Sent: {new Date(notification.sent_at).toLocaleString()}
                            </span>
                          )}
                          {notification.delivered_at && (
                            <span>
                              Delivered: {new Date(notification.delivered_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        {notification.error_message && (
                          <p className="mt-2 text-sm text-red-600">
                            Error: {notification.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Confirmation Modal */}
      {selectedConfirmation && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirmation Details
                </h2>
                <button
                  onClick={() => setSelectedConfirmation(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Confirmation Number</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {selectedConfirmation.confirmation_number}
                  </p>
                </div>

                {selectedConfirmation.metadata && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Filing Information</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {Object.entries(selectedConfirmation.metadata).map(([key, value]) => (
                        <div key={key}>
                          <dt className="font-medium text-gray-500">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}:
                          </dt>
                          <dd className="text-gray-900">{value || 'N/A'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-medium text-gray-900 mb-2">Actions</h3>
                  
                  {selectedConfirmation.pdf_receipt_available && (
                    <button
                      onClick={() => {
                        downloadReceipt(selectedConfirmation.id, selectedConfirmation.confirmation_number);
                      }}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Download PDF Receipt
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      resendNotification(selectedConfirmation.id, 'email');
                    }}
                    disabled={resending}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {resending ? (
                      <StandardSpinner size="small" />
                    ) : (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Resend Email Confirmation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilingConfirmations;