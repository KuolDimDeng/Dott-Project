'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  MicrophoneIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  ShoppingCartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { useSession } from '@/hooks/useSession-v2';
import toast from 'react-hot-toast';

export default function ChatInterface({ 
  conversationId, 
  recipientInfo,
  mode = 'consumer', // 'consumer' or 'business'
  onClose,
  onCreateOrder
}) {
  const { session } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!session?.user || !conversationId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat/`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Chat WebSocket connected');
      setIsConnected(true);
      
      // Join conversation
      ws.send(JSON.stringify({
        type: 'join_conversation',
        conversation_id: conversationId
      }));
      
      // Load existing messages
      loadMessages();
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Chat connection error');
    };
    
    ws.onclose = () => {
      console.log('Chat WebSocket disconnected');
      setIsConnected(false);
    };
    
    setSocket(ws);
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave_conversation',
          conversation_id: conversationId
        }));
        ws.close();
      }
    };
  }, [session, conversationId]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'new_message':
        setMessages(prev => [...prev, data.message]);
        // Mark as read if chat is open
        markMessageAsRead(data.message.id);
        break;
      
      case 'typing':
        if (data.user_id !== session?.user?.id) {
          setRecipientTyping(data.is_typing);
        }
        break;
      
      case 'read_receipt':
        setMessages(prev => prev.map(msg => 
          msg.id === data.message_id 
            ? { ...msg, is_read: true, read_at: data.read_at }
            : msg
        ));
        break;
      
      case 'message_sent':
        setMessages(prev => [...prev, data.message]);
        break;
      
      default:
        break;
    }
  };

  // Load existing messages
  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?conversation_id=${conversationId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.results || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim() || !socket || socket.readyState !== WebSocket.OPEN) return;
    
    socket.send(JSON.stringify({
      type: 'send_message',
      conversation_id: conversationId,
      text_content: newMessage.trim(),
      message_type: 'text'
    }));
    
    setNewMessage('');
    inputRef.current?.focus();
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    if (!isTyping) {
      setIsTyping(true);
      socket.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: true
      }));
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: false
      }));
    }, 2000);
  };

  // Mark message as read
  const markMessageAsRead = (messageId) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    socket.send(JSON.stringify({
      type: 'read_receipt',
      message_ids: [messageId]
    }));
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create order from chat
  const handleCreateOrder = () => {
    // Parse messages to extract order items
    const orderItems = parseOrderFromMessages();
    if (orderItems.length > 0 && onCreateOrder) {
      onCreateOrder(orderItems);
    } else {
      toast.error('No items found to create order');
    }
  };

  const parseOrderFromMessages = () => {
    // Simple parser - can be enhanced with AI later
    const items = [];
    messages.forEach(msg => {
      // Look for patterns like "2 pizzas", "1 burger", etc.
      const matches = msg.text_content.match(/(\d+)\s+([a-zA-Z\s]+)/g);
      if (matches) {
        matches.forEach(match => {
          const [, quantity, item] = match.match(/(\d+)\s+(.+)/);
          items.push({
            name: item.trim(),
            quantity: parseInt(quantity),
            price: 0 // To be filled by business
          });
        });
      }
    });
    return items;
  };

  // Format message time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {recipientInfo?.business_name?.[0] || recipientInfo?.first_name?.[0] || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {recipientInfo?.business_name || recipientInfo?.first_name || 'Chat'}
            </h3>
            {recipientTyping && (
              <p className="text-sm text-green-600">Typing...</p>
            )}
            {!recipientTyping && isConnected && (
              <p className="text-sm text-gray-500">Online</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {mode === 'consumer' && messages.length > 0 && (
            <button
              onClick={handleCreateOrder}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Create order from chat"
            >
              <ShoppingCartIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Start a conversation</p>
            {mode === 'consumer' && (
              <p className="text-sm mt-2">Ask about products, prices, or availability</p>
            )}
          </div>
        )}
        
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === session?.user?.id;
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwnMessage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="break-words">{message.text_content}</p>
                <div className={`flex items-center justify-end mt-1 space-x-1 text-xs ${
                  isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>{formatTime(message.created_at)}</span>
                  {isOwnMessage && (
                    <>
                      {message.is_delivered && <CheckIcon className="w-3 h-3" />}
                      {message.is_read && <CheckIconSolid className="w-3 h-3" />}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {recipientTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <PhotoIcon className="w-5 h-5" />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <MicrophoneIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className={`p-2 rounded-lg ${
              newMessage.trim() && isConnected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
        
        {!isConnected && (
          <p className="text-xs text-red-500 mt-2">Connection lost. Reconnecting...</p>
        )}
      </div>
    </div>
  );
}