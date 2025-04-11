import React, { useState } from 'react';
import { TrashIcon, TagIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Product Bulk Actions Component
 * Provides UI for performing actions on multiple selected products
 */
const ProductBulkActions = ({ 
  selectedItems = [], 
  onBulkDelete, 
  onBulkUpdateStatus,
  onBulkUpdate,
  onClose 
}) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    field: '',
    value: ''
  });

  // Count of selected items
  const selectedCount = selectedItems.length;

  const handleBulkDelete = async () => {
    try {
      await onBulkDelete(selectedItems);
      setIsDeleteConfirmOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Error during bulk delete:', error);
    }
  };

  const handleBulkUpdate = async () => {
    try {
      await onBulkUpdate(selectedItems, bulkUpdateData);
      setIsUpdateModalOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Error during bulk update:', error);
    }
  };

  return (
    <div className="relative z-10">
      <div className="bg-white shadow-lg rounded-md p-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Bulk Actions</h3>
          <span className="text-sm text-gray-500">{selectedCount} items selected</span>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete Selected Items
          </button>
          
          <button
            onClick={() => onBulkUpdateStatus(selectedItems, true)}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md"
          >
            <TagIcon className="h-5 w-5 mr-2" />
            Mark as Active
          </button>
          
          <button
            onClick={() => onBulkUpdateStatus(selectedItems, false)}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md"
          >
            <TagIcon className="h-5 w-5 mr-2" />
            Mark as Inactive
          </button>
          
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Update Properties
          </button>
        </div>
      </div>

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete {selectedCount} items? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Bulk Update</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Field to Update</label>
              <select
                value={bulkUpdateData.field}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, field: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="">Select field...</option>
                <option value="category_id">Category</option>
                <option value="supplier_id">Supplier</option>
                <option value="location_id">Location</option>
                <option value="tax_rate">Tax Rate</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Value</label>
              <input
                type="text"
                value={bulkUpdateData.value}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, value: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm"
                placeholder="Enter new value"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!bulkUpdateData.field || !bulkUpdateData.value}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductBulkActions; 