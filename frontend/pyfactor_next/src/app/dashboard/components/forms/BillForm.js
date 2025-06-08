'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { toast } from 'react-toastify';

const BillForm = () => {
  const [vendor, setVendor] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [billDate, setBillDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [posoNumber, setPosoNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 },
  ]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState(null);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [vendorSearchText, setVendorSearchText] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    console.log('Vendors:', vendors);
  }, [vendors]);

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      const response = await axiosInstance.get('/api/vendors/');
      console.log('Vendors response:', response.data);
      setVendors(response.data);
      setVendorsError(null);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendorsError('Failed to load vendors. Please try again.');
    } finally {
      setVendorsLoading(false);
    }
  };

  const handleVendorChange = (selectedVendor) => {
    setVendor(selectedVendor);
    setShowVendorDropdown(false);
    setVendorSearchText(`${selectedVendor.vendor_name} (${selectedVendor.vendor_number})`);
  };

  const handleCurrencyChange = (event) => {
    setCurrency(event.target.value);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].price;
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 },
    ]);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendor) {
      toast.error('Please select a vendor');
      return;
    }
    
    const billData = {
      vendor: vendor.id,
      currency,
      bill_date: billDate,
      due_date: dueDate,
      poso_number: posoNumber,
      totalAmount,
      notes,
      items,
    };

    try {
      const response = await axiosInstance.post('/api/bills/create/', billData);
      console.log('Bill created:', response.data);
      toast.success('Bill created successfully');

      // Reset form or redirect
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Error creating bill');
    }
  };

  const filteredVendors = vendorSearchText
    ? vendors.filter(v => 
        `${v.vendor_name} ${v.vendor_number}`.toLowerCase().includes(vendorSearchText.toLowerCase())
      )
    : vendors;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Add Bill</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendor Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                className={`w-full p-2 border rounded-md ${vendorsError ? 'border-red-500' : 'border-gray-300'}`}
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
                  {vendorsLoading ? (
                    <div className="p-2 text-gray-500">Loading...</div>
                  ) : filteredVendors.length > 0 ? (
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
            {vendorsError && <p className="mt-1 text-sm text-red-500">{vendorsError}</p>}
          </div>

          {/* Currency Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={handleCurrencyChange}
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              {/* Add more currency options as needed */}
            </select>
          </div>

          {/* Bill Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formatDate(billDate)}
              onChange={(e) => setBillDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formatDate(dueDate)}
              onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>

          {/* P.O./S.O. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">P.O./S.O.</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={posoNumber}
              onChange={(e) => setPosoNumber(e.target.value)}
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end mt-6 space-x-4">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default BillForm;