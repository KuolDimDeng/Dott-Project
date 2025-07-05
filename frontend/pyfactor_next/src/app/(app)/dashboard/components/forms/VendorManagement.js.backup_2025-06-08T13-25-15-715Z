import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const VendorManagement = ({ newVendor: isNewVendor = false }) => {
  const [tabValue, setTabValue] = useState(isNewVendor ? 0 : 2);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [formData, setFormData] = useState({
    vendor_name: '',
    street: '',
    postcode: '',
    city: '',
    state: '',
    phone: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    }
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setSelectedVendor(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/vendors/create/', formData);
      fetchVendors();
      setFormData({
        vendor_name: '',
        street: '',
        postcode: '',
        city: '',
        state: '',
        phone: '',
      });
      setTabValue(2); // Switch to list tab after creation
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    setTabValue(1); // Switch to detail tab
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Vendor Management
      </h1>
      
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex -mb-px">
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              tabValue === 0
                ? 'border-primary-main text-primary-main'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Create Vendor
          </button>
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              tabValue === 1
                ? 'border-primary-main text-primary-main'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
            disabled={!selectedVendor && tabValue !== 1}
          >
            Vendor Detail
          </button>
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              tabValue === 2
                ? 'border-primary-main text-primary-main'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(2)}
          >
            Vendor List
          </button>
        </nav>
      </div>

      {tabValue === 0 && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="vendor_name" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Name
              </label>
              <input
                id="vendor_name"
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-main focus:ring focus:ring-primary-light focus:ring-opacity-50"
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                Street
              </label>
              <input
                id="street"
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-main focus:ring focus:ring-primary-light focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                Postcode
              </label>
              <input
                id="postcode"
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-main focus:ring focus:ring-primary-light focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-main focus:ring focus:ring-primary-light focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                id="state"
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-main focus:ring focus:ring-primary-light focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="phone"
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-main focus:ring focus:ring-primary-light focus:ring-opacity-50"
              />
            </div>
            
            <div className="md:col-span-2 mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-main text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50"
              >
                Create Vendor
              </button>
            </div>
          </div>
        </form>
      )}

      {tabValue === 1 && selectedVendor && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">Vendor Details</h2>
          <p className="text-gray-700"><span className="font-medium">Vendor Number:</span> {selectedVendor.vendor_number}</p>
          <p className="text-gray-700"><span className="font-medium">Vendor Name:</span> {selectedVendor.vendor_name}</p>
          <p className="text-gray-700"><span className="font-medium">Street:</span> {selectedVendor.street}</p>
          <p className="text-gray-700"><span className="font-medium">Postcode:</span> {selectedVendor.postcode}</p>
          <p className="text-gray-700"><span className="font-medium">City:</span> {selectedVendor.city}</p>
          <p className="text-gray-700"><span className="font-medium">State:</span> {selectedVendor.state}</p>
          <p className="text-gray-700"><span className="font-medium">Phone:</span> {selectedVendor.phone}</p>
        </div>
      )}

      {tabValue === 2 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(vendors) && vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vendor.vendor_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vendor.vendor_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vendor.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vendor.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleVendorSelect(vendor)}
                        className="text-primary-main hover:text-primary-dark"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No vendors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;