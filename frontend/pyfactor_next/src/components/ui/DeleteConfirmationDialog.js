'use client';

import React, { useState, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const DeleteConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType = 'item',
  hasRelatedRecords = false,
  relatedRecordsMessage = '',
  requireTypeConfirmation = true,
  isDeleting = false,
  customWarning = null,
  accountingRestriction = null
}) => {
  const [confirmText, setConfirmText] = useState('');
  
  const handleConfirm = () => {
    if (requireTypeConfirmation && confirmText.toLowerCase() !== 'delete') {
      return;
    }
    onConfirm();
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Delete {itemType}
                    </h3>
                    <div className="mt-2 space-y-3">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete <span className="font-semibold text-gray-700">{itemName}</span>?
                      </p>
                      
                      {accountingRestriction && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">
                                Accounting Restriction
                              </h3>
                              <div className="mt-1 text-sm text-yellow-700">
                                <p>{accountingRestriction}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {customWarning && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                          <p className="text-sm text-orange-800">{customWarning}</p>
                        </div>
                      )}
                      
                      {hasRelatedRecords && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm text-red-800 font-medium">
                            ⚠️ Warning: This will also delete related records
                          </p>
                          {relatedRecordsMessage && (
                            <p className="text-sm text-red-700 mt-1">{relatedRecordsMessage}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                        <p className="text-xs text-gray-600">
                          <strong>Note:</strong> Deleted records will be archived in the audit trail for compliance purposes. 
                          This action cannot be undone.
                        </p>
                      </div>
                      
                      {requireTypeConfirmation && !accountingRestriction && (
                        <div className="mt-4">
                          <label htmlFor="confirm-delete" className="block text-sm font-medium text-gray-700">
                            Type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">delete</span> to confirm
                          </label>
                          <input
                            type="text"
                            id="confirm-delete"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            placeholder="Type 'delete' to confirm"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            disabled={isDeleting}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                {!accountingRestriction && (
                  <button
                    type="button"
                    className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${
                      isDeleting || (requireTypeConfirmation && confirmText.toLowerCase() !== 'delete')
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-500'
                    }`}
                    onClick={handleConfirm}
                    disabled={isDeleting || (requireTypeConfirmation && confirmText.toLowerCase() !== 'delete')}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={handleClose}
                  disabled={isDeleting}
                >
                  {accountingRestriction ? 'Close' : 'Cancel'}
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </div>
    </Transition.Root>
  );
};

export default DeleteConfirmationDialog;