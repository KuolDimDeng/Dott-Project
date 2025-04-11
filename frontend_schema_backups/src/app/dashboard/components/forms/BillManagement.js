'use client';
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const BillManagement = ({ newBill: isNewBill = false }) => {
  const [tabValue, setTabValue] = useState(isNewBill ? 0 : 2);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [vendorSearchText, setVendorSearchText] = useState('');

  const [formData, setFormData] = useState({
    vendor: null,
    currency: 'USD',
    bill_date: null,
    due_date: null,
    poso_number: '',
    total_amount: 0,
    notes: '',
    items: [{ category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 }],
  });

  const toast = useToast();

  useEffect(() => {
    fetchBills();
    fetchVendors();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axiosInstance.get('/api/bills/');
      setBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      toast.error('Failed to fetch bills');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    }
  };

  const calculateTotalAmount = (items) => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setSelectedBill(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleVendorChange = (selectedVendor) => {
    setFormData((prevData) => ({
      ...prevData,
      vendor: selectedVendor,
    }));
    setShowVendorDropdown(false);
    setVendorSearchText(`${selectedVendor.vendor_name} (${selectedVendor.vendor_number})`);
  };

  const handleDateChange = (e, name) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setFormData((prevData) => ({
      ...prevData,
      [name]: date,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].price;
    const totalAmount = calculateTotalAmount(updatedItems);
    setFormData((prevData) => ({
      ...prevData,
      items: updatedItems,
      totalAmount: totalAmount,
    }));
  };

  const handleAddItem = () => {
    setFormData((prevData) => ({
      ...prevData,
      items: [
        ...prevData.items,
        { category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 },
      ],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const billData = {
        ...formData,
        vendor: formData.vendor.id,
        items: formData.items.map((item) => ({
          ...item,
          amount: item.quantity * item.price,
        })),
      };
      const response = await axiosInstance.post('/api/bills/create/', billData);
      toast.success('Bill created successfully');
      fetchBills();
      setTabValue(2); // Switch to list tab after creation
    } catch (error) {
      console.error('Error creating bill:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      toast.error('Failed to create bill');
    }
  };

  const handleBillSelect = (bill) => {
    setSelectedBill(bill);
    setTabValue(1); // Switch to detail tab
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const filteredVendors = vendorSearchText
    ? vendors.filter(v => 
        `${v.vendor_name} ${v.vendor_number}`.toLowerCase().includes(vendorSearchText.toLowerCase())
      )
    : vendors;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Bill Management</h2>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            className={`py-2 px-1 border-b-2 ${
              tabValue === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Create Bill
          </button>
          <button
            className={`py-2 px-1 border-b-2 ${
              tabValue === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
          >
            Bill Detail
          </button>
          <button
            className={`py-2 px-1 border-b-2 ${
              tabValue === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(2)}
          >
            Bill List
          </button>
        </div>
      </div>

      {/* Create Bill Tab */}
      {tabValue === 0 && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Vendor Autocomplete */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Search vendors"
                  value={vendorSearchText}
                  onChange={(e) => {
                    setVendorSearchText(e.target.value);
                    setShowVendorDropdown(true);
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  required
                />
                {showVendorDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-y-auto">
                    {filteredVendors.length > 0 ? (
                      filteredVendors.map((option) => (
                        <div
                          key={option.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleVendorChange(option)}
                        >
                          {option.vendor_name} ({option.vendor_number})
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-gray-500">No vendors found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Currency Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            
            {/* Bill Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formatDate(formData.bill_date)}
                onChange={(e) => handleDateChange(e, 'bill_date')}
              />
            </div>
            
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formatDate(formData.due_date)}
                onChange={(e) => handleDateChange(e, 'due_date')}
              />
            </div>
            
            {/* P.O./S.O. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">P.O./S.O.</label>
              <input
                type="text"
                name="poso_number"
                value={formData.poso_number}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            {/* Notes - Full width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              ></textarea>
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Bill Items</h3>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-3 bg-gray-50 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={item.category}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={item.amount}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Bill
            </button>
          </div>
        </form>
      )}

      {/* Bill Detail Tab */}
      {tabValue === 1 && selectedBill && (
        <div>
          <h3 className="text-lg font-medium mb-4">Bill Details</h3>
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Bill Number</p>
                <p className="font-medium">{selectedBill.bill_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-medium">{selectedBill.vendor_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium">{selectedBill.totalAmount} {selectedBill.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bill Date</p>
                <p className="font-medium">{new Date(selectedBill.bill_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium">{new Date(selectedBill.due_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">P.O./S.O.</p>
                <p className="font-medium">{selectedBill.poso_number}</p>
              </div>
            </div>
            {selectedBill.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="mt-1">{selectedBill.notes}</p>
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-medium mb-4">Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedBill.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.amount}</td>
                  </tr>
                ))}
                {selectedBill.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No items in this bill</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bill List Tab */}
      {tabValue === 2 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.length > 0 ? (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.bill_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.vendor_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.totalAmount} {bill.currency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bill.bill_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bill.due_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => handleBillSelect(bill)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No bills found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BillManagement;