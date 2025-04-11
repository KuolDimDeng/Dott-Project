import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const FixedAssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [open, setOpen] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    asset_type: '',
    acquisition_date: '',
    acquisition_cost: '',
    depreciation_method: '',
    useful_life: '',
    salvage_value: '',
    location: '',
    asset_tag: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/fixed-assets/');
      console.log('Accounts API Respond:', response.data);
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching fixed assets:', error);
    }
  };

  const handleOpen = (asset = null) => {
    if (asset) {
      setSelectedAsset(asset);
      setFormData(asset);
    } else {
      setSelectedAsset(null);
      setFormData({
        name: '',
        asset_type: '',
        acquisition_date: '',
        acquisition_cost: '',
        depreciation_method: '',
        useful_life: '',
        salvage_value: '',
        location: '',
        asset_tag: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedAsset) {
        await axiosInstance.put(`/api/finance/fixed-assets/${selectedAsset.id}/`, formData);
      } else {
        await axiosInstance.post('/api/finance/fixed-assets/', formData);
      }
      fetchAssets();
      handleClose();
    } catch (error) {
      console.error('Error saving fixed asset:', error);
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Fixed Asset Management</h1>
      
      <button
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 mb-4"
        onClick={() => handleOpen()}
      >
        Add New Asset
      </button>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition Cost</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Value</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.asset_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.acquisition_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${asset.acquisition_cost}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${asset.book_value}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                      className="text-indigo-600 hover:text-indigo-900 border border-indigo-600 px-3 py-1 rounded-md"
                      onClick={() => handleOpen(asset)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Dialog for adding/editing assets */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">{selectedAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="asset_type" className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                <input
                  id="asset_type"
                  name="asset_type"
                  type="text"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.asset_type}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="acquisition_date" className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
                <input
                  id="acquisition_date"
                  name="acquisition_date"
                  type="date"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.acquisition_date}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="acquisition_cost" className="block text-sm font-medium text-gray-700 mb-1">Acquisition Cost</label>
                <input
                  id="acquisition_cost"
                  name="acquisition_cost"
                  type="number"
                  step="0.01"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.acquisition_cost}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="depreciation_method" className="block text-sm font-medium text-gray-700 mb-1">Depreciation Method</label>
                <select
                  id="depreciation_method"
                  name="depreciation_method"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.depreciation_method}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Method</option>
                  <option value="SL">Straight Line</option>
                  <option value="DB">Declining Balance</option>
                  <option value="SYD">Sum of Years Digits</option>
                  <option value="UOP">Units of Production</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="useful_life" className="block text-sm font-medium text-gray-700 mb-1">Useful Life (years)</label>
                <input
                  id="useful_life"
                  name="useful_life"
                  type="number"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.useful_life}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="salvage_value" className="block text-sm font-medium text-gray-700 mb-1">Salvage Value</label>
                <input
                  id="salvage_value"
                  name="salvage_value"
                  type="number"
                  step="0.01"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.salvage_value}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="asset_tag" className="block text-sm font-medium text-gray-700 mb-1">Asset Tag</label>
                <input
                  id="asset_tag"
                  name="asset_tag"
                  type="text"
                  className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.asset_tag}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-5 pt-5 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedAssetManagement;