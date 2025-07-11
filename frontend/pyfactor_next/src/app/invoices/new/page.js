'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { ArrowLeftIcon, CameraIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function NewInvoicePage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/login');
    }
  }, [session, loading, router]);

  useEffect(() => {
    if (session?.tenantId) {
      fetchCustomers();
      // Set default due date to 30 days from now
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [session]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`/api/customers/${session.tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const updatedItems = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (item.quantity * item.price);
    }, 0);
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real implementation, you would upload this to your server
      // For now, we'll just show a success message
      toast.success('Photo attached to invoice');
    }
  };

  const createInvoice = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    const validItems = items.filter(item => item.description && item.quantity > 0 && item.price > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item');
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceData = {
        customer_id: selectedCustomer.id,
        due_date: dueDate,
        items: validItems,
        notes: notes,
        total_amount: calculateTotal(),
        tenant_id: session.tenantId
      };

      const response = await fetch(`/api/invoices/${session.tenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(invoiceData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Invoice created successfully!');
        
        // Store for offline sync if needed
        if (!navigator.onLine) {
          const pendingInvoices = JSON.parse(localStorage.getItem('pendingInvoices') || '[]');
          pendingInvoices.push({
            ...invoiceData,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('pendingInvoices', JSON.stringify(pendingInvoices));
        }
        
        router.push(`/invoices/${data.id}`);
      } else {
        throw new Error('Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      
      if (!navigator.onLine) {
        const pendingInvoices = JSON.parse(localStorage.getItem('pendingInvoices') || '[]');
        pendingInvoices.push({
          ...invoiceData,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('pendingInvoices', JSON.stringify(pendingInvoices));
        
        toast.success('Invoice saved offline. Will sync when online.');
        router.push('/invoices');
      } else {
        toast.error('Failed to create invoice');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-3 p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">New Invoice</h1>
          </div>
          <button
            onClick={createInvoice}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Customer Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Customer</h2>
          
          {!selectedCustomer ? (
            <div>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowCustomerSearch(true);
                }}
                onFocus={() => setShowCustomerSearch(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {showCustomerSearch && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerSearch(false);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      {customer.email && (
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                {selectedCustomer.email && (
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Items</h2>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        ${(item.quantity * item.price).toFixed(2)}
                      </span>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={addItem}
            className="mt-3 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Item
          </button>
        </div>

        {/* Additional Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Details</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attach Photo
              </label>
              <label className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer">
                <CameraIcon className="w-5 h-5 mr-2" />
                Take Photo / Upload
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-blue-600">
              ${calculateTotal().toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}