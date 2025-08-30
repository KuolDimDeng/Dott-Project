'use client';

import React, { useState } from 'react';
import { 
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ChatToOrder({ 
  conversation,
  messages,
  onCreateOrder,
  onClose 
}) {
  const [orderItems, setOrderItems] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse messages to suggest items
  React.useEffect(() => {
    const suggestedItems = parseMessagesForItems(messages);
    setOrderItems(suggestedItems);
  }, [messages]);

  const parseMessagesForItems = (msgs) => {
    const items = [];
    const itemPatterns = [
      /(\d+)\s+x?\s*([a-zA-Z\s]+?)(?:\s*@\s*\$?(\d+(?:\.\d{2})?)?)?/gi,
      /([a-zA-Z\s]+?)\s*x\s*(\d+)(?:\s*@\s*\$?(\d+(?:\.\d{2})?)?)?/gi,
    ];

    msgs.forEach(msg => {
      if (msg.text_content) {
        itemPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(msg.text_content)) !== null) {
            const [, part1, part2, price] = match;
            
            // Determine quantity and name based on pattern
            let quantity, name;
            if (isNaN(part1)) {
              name = part1.trim();
              quantity = parseInt(part2) || 1;
            } else {
              quantity = parseInt(part1) || 1;
              name = part2.trim();
            }
            
            // Check if item already exists
            const existingItem = items.find(item => 
              item.name.toLowerCase() === name.toLowerCase()
            );
            
            if (existingItem) {
              existingItem.quantity += quantity;
            } else {
              items.push({
                id: Date.now() + Math.random(),
                name: name,
                quantity: quantity,
                price: parseFloat(price) || 0,
                confirmed: false
              });
            }
          }
        });
      }
    });

    return items;
  };

  const updateItemQuantity = (itemId, delta) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const updateItemPrice = (itemId, price) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, price: parseFloat(price) || 0 };
      }
      return item;
    }));
  };

  const removeItem = (itemId) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addNewItem = () => {
    setOrderItems(prev => [...prev, {
      id: Date.now(),
      name: '',
      quantity: 1,
      price: 0,
      confirmed: false
    }]);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCreateOrder = async () => {
    // Validate items
    const validItems = orderItems.filter(item => item.name && item.price > 0);
    
    if (validItems.length === 0) {
      toast.error('Please add at least one item with a price');
      return;
    }

    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    setIsProcessing(true);

    try {
      const orderData = {
        conversation_id: conversation.id,
        items: validItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit_price: item.price
        })),
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes,
        total_amount: calculateTotal(),
        created_from_chat: true
      };

      const response = await fetch('/api/chat/messages/create_order_from_chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Order created successfully!');
        
        if (onCreateOrder) {
          onCreateOrder(result.order_data);
        }
        
        onClose();
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <ShoppingCartIcon className="w-6 h-6 mr-2" />
              Create Order from Chat
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Review and confirm items discussed in chat
          </p>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Order Items */}
          <div className="space-y-3 mb-6">
            <h3 className="font-medium text-gray-900">Order Items</h3>
            
            {orderItems.map(item => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => setOrderItems(prev => prev.map(i => 
                    i.id === item.id ? { ...i, name: e.target.value } : i
                  ))}
                  placeholder="Item name"
                  className="flex-1 px-3 py-2 border rounded"
                />
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateItemQuantity(item.id, -1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateItemQuantity(item.id, 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center">
                  <CurrencyDollarIcon className="w-4 h-4 text-gray-400 mr-1" />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItemPrice(item.id, e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-20 px-2 py-2 border rounded"
                  />
                </div>
                
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <button
              onClick={addNewItem}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Item
            </button>
          </div>

          {/* Delivery Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Delivery Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address *
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address..."
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows="2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Notes (Optional)
              </label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Special instructions, gate code, etc..."
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows="2"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-blue-600">
              ${calculateTotal().toFixed(2)}
            </span>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={isProcessing || orderItems.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg text-white ${
                isProcessing || orderItems.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}