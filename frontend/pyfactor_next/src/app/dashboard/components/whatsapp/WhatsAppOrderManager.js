'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  PaperAirplaneIcon 
} from '@heroicons/react/24/outline';

const WhatsAppOrderManager = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/whatsapp-business/orders/');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.results || data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/orders/${orderId}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(orders.find(o => o.id === orderId));
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleSendPaymentLink = async (orderId) => {
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/orders/${orderId}/send_payment_link/`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Payment link sent successfully!');
      }
    } catch (error) {
      console.error('Error sending payment link:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.order_status === filter;
    const matchesSearch = order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_phone.includes(searchTerm) ||
                         order.id.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Orders</h1>
            <p className="text-gray-600 mt-2">Manage and track customer orders</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{order.id.split('-')[0]}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {order.customer_name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.customer_phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.order_status)}`}>
                              {order.order_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.currency} {order.total_amount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                
                {/* Order Info */}
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-medium">#{selectedOrder.id.split('-')[0]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{selectedOrder.customer_name || 'No name'}</p>
                    <p className="text-sm">{selectedOrder.customer_phone}</p>
                  </div>
                  {selectedOrder.customer_address && (
                    <div>
                      <p className="text-sm text-gray-500">Delivery Address</p>
                      <p className="text-sm">{selectedOrder.customer_address}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Order Date</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Status</p>
                    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedOrder.order_status)}`}>
                      {selectedOrder.order_status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                    <span className={`px-3 py-1 text-sm rounded-full ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                      {selectedOrder.payment_status}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Order Items</h3>
                  <div className="border rounded-lg p-3 space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-gray-500">Qty: {item.quantity} × {selectedOrder.currency} {item.unit_price}</p>
                        </div>
                        <p className="font-medium">{selectedOrder.currency} {item.total_price}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-gray-500">Subtotal</p>
                    <p className="font-medium">{selectedOrder.currency} {selectedOrder.total_amount}</p>
                  </div>
                  {selectedOrder.dott_fee_amount > 0 && (
                    <div className="flex justify-between mb-2">
                      <p className="text-sm text-gray-500">Platform Fee</p>
                      <p className="text-sm">{selectedOrder.dott_fee_currency} {selectedOrder.dott_fee_amount}</p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <p className="font-semibold">Total</p>
                    <p className="font-semibold text-lg">{selectedOrder.currency} {selectedOrder.total_amount}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {selectedOrder.payment_status === 'pending' && (
                    <button
                      onClick={() => handleSendPaymentLink(selectedOrder.id)}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                    >
                      <PaperAirplaneIcon className="w-4 h-4 inline mr-2" />
                      Send Payment Link
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.order_status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}
                        className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Confirm
                      </button>
                    )}
                    {selectedOrder.order_status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}
                        className="bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm"
                      >
                        Process
                      </button>
                    )}
                    {selectedOrder.order_status === 'processing' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'shipped')}
                        className="bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 text-sm"
                      >
                        Ship
                      </button>
                    )}
                    {selectedOrder.order_status === 'shipped' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                        className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm"
                      >
                        Delivered
                      </button>
                    )}
                    {!['delivered', 'cancelled'].includes(selectedOrder.order_status) && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            handleUpdateStatus(selectedOrder.id, 'cancelled');
                          }
                        }}
                        className="bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-500">Select an order to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOrderManager;