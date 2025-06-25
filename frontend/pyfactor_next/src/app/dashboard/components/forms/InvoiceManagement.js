'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { orderApi, invoiceApi, customerApi, productApi, serviceApi } from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Record Payment Dialog
const RecordPaymentDialog = ({ isOpen, onClose, invoice, onRecord }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState(invoice?.total_amount || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: '💵', color: 'green' },
    { id: 'check', name: 'Check', icon: '📝', color: 'blue' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', color: 'purple' },
    { id: 'mobile_money', name: 'Mobile Money', icon: '📱', color: 'orange' },
    { id: 'other', name: 'Other', icon: '📋', color: 'gray' }
  ];

  const handleRecord = async () => {
    setIsRecording(true);
    try {
      await onRecord({
        payment_method: paymentMethod,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        reference,
        notes
      });
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setIsRecording(false);
    }
  };

  const isPartialPayment = parseFloat(amount) < parseFloat(invoice?.total_amount || 0);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Record Payment
                </Dialog.Title>
                
                {/* Invoice Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Invoice #{invoice?.invoice_number}</span>
                    <span className="font-medium text-gray-900">${parseFloat(invoice?.total_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{invoice?.customer_name}</div>
                </div>

                {/* Payment Method Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex items-center justify-center px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                          paymentMethod === method.id
                            ? method.id === 'cash' ? 'border-green-500 bg-green-50 text-green-700' :
                              method.id === 'check' ? 'border-blue-500 bg-blue-50 text-blue-700' :
                              method.id === 'bank_transfer' ? 'border-purple-500 bg-purple-50 text-purple-700' :
                              method.id === 'mobile_money' ? 'border-orange-500 bg-orange-50 text-orange-700' :
                              'border-gray-500 bg-gray-50 text-gray-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span className="mr-2">{method.icon}</span>
                        {method.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Received
                    <FieldTooltip text="Enter the actual amount received. For partial payments, enter the amount paid now." />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      step="0.01"
                      min="0.01"
                      max={invoice?.total_amount}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {isPartialPayment && (
                    <p className="mt-1 text-xs text-orange-600">
                      This is a partial payment. Remaining: ${(parseFloat(invoice?.total_amount || 0) - parseFloat(amount || 0)).toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Payment Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Reference Number (for check/bank transfer) */}
                {(paymentMethod === 'check' || paymentMethod === 'bank_transfer') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {paymentMethod === 'check' ? 'Check Number' : 'Transaction Reference'}
                      <FieldTooltip text={paymentMethod === 'check' ? 'Enter the check number for tracking' : 'Enter the bank transfer reference number'} />
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={paymentMethod === 'check' ? 'e.g., 001234' : 'e.g., TRN123456'}
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional payment details..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                    disabled={isRecording}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRecord}
                    disabled={isRecording || !amount || parseFloat(amount) <= 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRecording ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Send Invoice Dialog
const SendInvoiceDialog = ({ isOpen, onClose, invoice, onSend }) => {
  const [sendMethod, setSendMethod] = useState('email');
  const [email, setEmail] = useState(invoice?.customer_email || '');
  const [phone, setPhone] = useState(invoice?.customer_phone || '');
  const [message, setMessage] = useState(
    `Hi ${invoice?.customer_name || 'there'},\n\nPlease find attached your invoice #${invoice?.invoice_number || ''}.\n\nYou can pay this invoice securely online by clicking the button below.\n\nThank you for your business!`
  );
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend({
        method: sendMethod,
        email: sendMethod === 'email' ? email : undefined,
        phone: sendMethod === 'whatsapp' ? phone : undefined,
        message
      });
      onClose();
    } catch (error) {
      console.error('Error sending invoice:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Send Invoice
                </Dialog.Title>
                
                {/* Send Method Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send via
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSendMethod('email')}
                      className={`flex items-center justify-center px-4 py-2 rounded-lg border-2 transition-colors ${
                        sendMethod === 'email'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                    <button
                      onClick={() => setSendMethod('whatsapp')}
                      className={`flex items-center justify-center px-4 py-2 rounded-lg border-2 transition-colors ${
                        sendMethod === 'whatsapp'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </button>
                  </div>
                </div>

                {/* Contact Input */}
                {sendMethod === 'email' ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="customer@example.com"
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="+1234567890"
                    />
                  </div>
                )}

                {/* Message */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Payment Link Info */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Secure Payment Link Included</p>
                      <p className="mt-1">Your customer will receive a "Pay Invoice Online" button that takes them to a secure Stripe checkout page.</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                    disabled={isSending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isSending || (!email && sendMethod === 'email') || (!phone && sendMethod === 'whatsapp')}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : `Send via ${sendMethod === 'email' ? 'Email' : 'WhatsApp'}`}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Invoice Template Selection Dialog
const InvoiceTemplateDialog = ({ isOpen, onClose, onSelect }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Choose Invoice Template
                </Dialog.Title>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Standard Template */}
                  <div 
                    className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => onSelect('standard')}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">Standard Invoice</h3>
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <div className="text-xs space-y-1">
                        <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-300 rounded w-1/2"></div>
                        <div className="h-8"></div>
                        <div className="h-2 bg-gray-300 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 rounded w-2/3"></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Clean, simple layout perfect for everyday transactions. 
                      Mobile-optimized and quick to generate.
                    </p>
                    <ul className="mt-2 text-xs text-gray-500 space-y-1">
                      <li>• Essential fields only</li>
                      <li>• Clean, minimal design</li>
                      <li>• Best for B2C transactions</li>
                    </ul>
                  </div>

                  {/* Detailed Template */}
                  <div 
                    className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => onSelect('detailed')}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">Detailed Invoice</h3>
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <div className="text-xs space-y-1">
                        <div className="h-3 bg-gray-400 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-300 rounded w-1/2"></div>
                        <div className="h-4"></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-2 bg-gray-300 rounded"></div>
                          <div className="h-2 bg-gray-300 rounded"></div>
                        </div>
                        <div className="h-2 bg-gray-300 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 rounded w-full"></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Professional layout with comprehensive details for business clients.
                      Includes additional fields and formal structure.
                    </p>
                    <ul className="mt-2 text-xs text-gray-500 space-y-1">
                      <li>• PO numbers & payment terms</li>
                      <li>• Company letterhead prominent</li>
                      <li>• Best for B2B transactions</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

const InvoiceManagement = () => {
  // State management
  const [activeTab, setActiveTab] = useState('orders'); // orders, transactions, invoices
  const [salesOrders, setSalesOrders] = useState([]);
  const [salesTransactions, setSalesTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [invoiceToRecordPayment, setInvoiceToRecordPayment] = useState(null);
  
  // Refs
  const isMounted = useRef(true);

  // Summary statistics
  const summaryStats = {
    orders: {
      total: salesOrders.length,
      pending: salesOrders.filter(o => o.status === 'pending').length,
      totalValue: salesOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
    },
    transactions: {
      total: salesTransactions.length,
      unpaid: salesTransactions.filter(t => t.payment_status !== 'paid').length,
      totalValue: salesTransactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0),
      uninvoiced: salesTransactions.filter(t => !t.invoice_id).length
    },
    invoices: {
      total: invoices.length,
      unpaid: invoices.filter(i => i.status !== 'paid').length,
      totalValue: invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0)
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchSalesOrders(),
        fetchSalesTransactions(),
        fetchInvoices()
      ]);
    } catch (error) {
      logger.error('[InvoiceManagement] Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchSalesOrders = async () => {
    try {
      const data = await orderApi.getAll();
      
      // Handle both paginated and direct array responses
      let ordersList = [];
      if (Array.isArray(data)) {
        ordersList = data;
      } else if (data && Array.isArray(data.results)) {
        ordersList = data.results;
      }
      
      // Filter for pending/quote orders
      const pendingOrders = ordersList.filter(o => 
        o.status === 'pending' || o.status === 'quote' || o.status === 'draft'
      );
      
      if (isMounted.current) {
        setSalesOrders(pendingOrders);
      }
    } catch (error) {
      logger.error('[InvoiceManagement] Error fetching sales orders:', error);
      throw error;
    }
  };

  const fetchSalesTransactions = async () => {
    try {
      const data = await orderApi.getAll();
      
      // Handle both paginated and direct array responses
      let ordersList = [];
      if (Array.isArray(data)) {
        ordersList = data;
      } else if (data && Array.isArray(data.results)) {
        ordersList = data.results;
      }
      
      // Filter for completed orders (transactions)
      const completedOrders = ordersList.filter(o => 
        o.status === 'completed' || o.status === 'delivered' || o.status === 'paid'
      );
      
      if (isMounted.current) {
        setSalesTransactions(completedOrders);
      }
    } catch (error) {
      logger.error('[InvoiceManagement] Error fetching sales transactions:', error);
      throw error;
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await invoiceApi.getAll();
      
      // Handle both paginated and direct array responses
      let invoicesList = [];
      if (Array.isArray(data)) {
        invoicesList = data;
      } else if (data && Array.isArray(data.results)) {
        invoicesList = data.results;
      }
      
      if (isMounted.current) {
        setInvoices(invoicesList);
      }
    } catch (error) {
      logger.error('[InvoiceManagement] Error fetching invoices:', error);
      throw error;
    }
  };

  const handleConvertToSale = async (order) => {
    try {
      const updatedOrder = {
        ...order,
        status: 'completed',
        completed_date: new Date().toISOString()
      };
      
      await orderApi.update(order.id, updatedOrder);
      toast.success('Order converted to sale successfully');
      await fetchData();
    } catch (error) {
      logger.error('[InvoiceManagement] Error converting order:', error);
      toast.error('Failed to convert order to sale');
    }
  };

  const handleCreateInvoice = (item, type) => {
    setSelectedOrderForInvoice({ item, type });
    setShowTemplateDialog(true);
  };

  const handleTemplateSelect = async (template) => {
    setShowTemplateDialog(false);
    
    if (!selectedOrderForInvoice) return;
    
    try {
      const { item, type } = selectedOrderForInvoice;
      
      const invoiceData = {
        order_id: item.id,
        customer_id: item.customer_id,
        template: template,
        invoice_type: type === 'order' ? 'proforma' : 'standard',
        items: item.items,
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        shipping_cost: item.shipping_cost,
        discount_amount: item.discount_amount,
        total_amount: item.total_amount,
        notes: item.notes,
        terms: item.payment_terms
      };
      
      const newInvoice = await invoiceApi.create(invoiceData);
      
      // Update order with invoice reference
      await orderApi.update(item.id, { invoice_id: newInvoice.id });
      
      toast.success(`Invoice created successfully with ${template} template`);
      await fetchData();
      
      // TODO: Open PDF preview/download
      window.open(`/api/invoices/${newInvoice.id}/pdf?template=${template}`, '_blank');
      
    } catch (error) {
      logger.error('[InvoiceManagement] Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const handleEdit = async (item, type) => {
    // Check permissions based on type
    if (type === 'transaction' && item.invoice_id) {
      const confirmed = window.confirm(
        '⚠️ This transaction has an invoice. Editing will create an audit note. Continue?'
      );
      if (!confirmed) return;
    }
    
    setSelectedItem({ ...item, type });
    setIsEditing(true);
    setShowDetails(true);
  };

  const handleDelete = async (item, type) => {
    const confirmMessage = type === 'order' 
      ? 'Are you sure you want to delete this sales order?'
      : 'Are you sure you want to void this transaction?';
      
    if (!window.confirm(confirmMessage)) return;
    
    try {
      if (type === 'invoice') {
        await invoiceApi.delete(item.id);
      } else {
        await orderApi.delete(item.id);
      }
      
      toast.success(`${type} ${type === 'transaction' ? 'voided' : 'deleted'} successfully`);
      await fetchData();
    } catch (error) {
      logger.error(`[InvoiceManagement] Error deleting ${type}:`, error);
      toast.error(`Failed to ${type === 'transaction' ? 'void' : 'delete'} ${type}`);
    }
  };

  const handleSendInvoice = (invoice) => {
    setInvoiceToSend(invoice);
    setShowSendDialog(true);
  };

  const handleRecordPayment = (invoice) => {
    setInvoiceToRecordPayment(invoice);
    setShowPaymentDialog(true);
  };

  const handleRecordPaymentConfirm = async (paymentData) => {
    try {
      const tenantId = getSecureTenantId();
      if (!tenantId) {
        toast.error('Authentication required');
        return;
      }

      // Record payment in the backend
      const response = await fetch('/api/invoices/record-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          invoice_id: invoiceToRecordPayment.id,
          ...paymentData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      const result = await response.json();
      
      // Update invoice status based on payment amount
      const isPaidInFull = paymentData.amount >= parseFloat(invoiceToRecordPayment.total_amount);
      
      await invoiceApi.update(invoiceToRecordPayment.id, { 
        status: isPaidInFull ? 'paid' : 'partially_paid',
        paid_amount: paymentData.amount,
        paid_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.reference,
        payment_notes: paymentData.notes
      });

      toast.success(
        isPaidInFull 
          ? 'Payment recorded successfully. Invoice marked as paid.'
          : `Partial payment of $${paymentData.amount.toFixed(2)} recorded successfully.`
      );
      
      await fetchData();
      setShowPaymentDialog(false);
      setInvoiceToRecordPayment(null);
      
    } catch (error) {
      logger.error('[InvoiceManagement] Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const handleSendInvoiceConfirm = async (sendData) => {
    try {
      const tenantId = getSecureTenantId();
      if (!tenantId) {
        toast.error('Authentication required');
        return;
      }

      // Generate payment link
      const paymentLink = `${window.location.origin}/pay/${invoiceToSend.id}`;
      
      // Prepare invoice send data
      const invoiceSendData = {
        invoice_id: invoiceToSend.id,
        method: sendData.method,
        recipient: sendData.email || sendData.phone,
        message: sendData.message,
        payment_link: paymentLink,
        include_pdf: true
      };

      // Send invoice via API
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(invoiceSendData)
      });

      if (!response.ok) {
        throw new Error('Failed to send invoice');
      }

      const result = await response.json();
      
      // Update invoice status
      await invoiceApi.update(invoiceToSend.id, { 
        status: 'sent',
        sent_date: new Date().toISOString(),
        sent_via: sendData.method
      });

      toast.success(`Invoice sent successfully via ${sendData.method === 'email' ? 'Email' : 'WhatsApp'}`);
      
      // If WhatsApp, open WhatsApp with pre-filled message
      if (sendData.method === 'whatsapp') {
        const whatsappMessage = encodeURIComponent(
          `${sendData.message}\n\n` +
          `📄 View Invoice: ${paymentLink}\n` +
          `💳 Pay Online: ${paymentLink}`
        );
        const whatsappUrl = `https://wa.me/${sendData.phone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;
        window.open(whatsappUrl, '_blank');
      }

      await fetchData();
      setShowSendDialog(false);
      setInvoiceToSend(null);
      
    } catch (error) {
      logger.error('[InvoiceManagement] Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
  };

  // Filter items based on search
  const filterItems = (items) => {
    if (!searchTerm) return items;
    
    return items.filter(item => 
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-black mb-6">Invoice Management</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending Orders</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{summaryStats.orders.pending}</p>
          <p className="text-gray-600 text-sm mt-1">
            ${summaryStats.orders.totalValue.toFixed(2)} total value
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Uninvoiced Sales</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{summaryStats.transactions.uninvoiced}</p>
          <p className="text-gray-600 text-sm mt-1">
            {summaryStats.transactions.total} total transactions
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Unpaid Invoices</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{summaryStats.invoices.unpaid}</p>
          <p className="text-gray-600 text-sm mt-1">
            ${summaryStats.invoices.totalValue.toFixed(2)} outstanding
          </p>
        </div>
      </div>
      
      {/* Search and Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by customer or order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sales Orders
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {summaryStats.orders.total}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sales Transactions
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {summaryStats.transactions.total}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Invoices
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {summaryStats.invoices.total}
              </span>
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
              {/* Sales Orders Tab */}
              {activeTab === 'orders' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filterItems(salesOrders).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(order.order_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.customer_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.items?.length || 0} items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${parseFloat(order.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              order.status === 'quote' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(order, 'order')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleConvertToSale(order)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Convert
                              </button>
                              <button
                                onClick={() => handleCreateInvoice(order, 'order')}
                                className="text-purple-600 hover:text-purple-900"
                              >
                                Invoice
                              </button>
                              <button
                                onClick={() => handleDelete(order, 'order')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filterItems(salesOrders).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No sales orders found</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Sales Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filterItems(salesTransactions).map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(transaction.order_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.customer_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.items?.length || 0} items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${parseFloat(transaction.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              transaction.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {transaction.payment_status || 'unpaid'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.invoice_id ? (
                              <span className="text-green-600">Created</span>
                            ) : (
                              <span className="text-red-600">Not created</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(transaction, 'transaction')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              {!transaction.invoice_id && (
                                <button
                                  onClick={() => handleCreateInvoice(transaction, 'transaction')}
                                  className="text-purple-600 hover:text-purple-900"
                                >
                                  Create Invoice
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(transaction, 'transaction')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Void
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filterItems(salesTransactions).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No sales transactions found</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filterItems(invoices).map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {invoice.customer_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${parseFloat(invoice.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                              invoice.status === 'partially_paid' ? 'bg-orange-100 text-orange-800' :
                              invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status === 'partially_paid' ? 'Partial' : invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invoice.invoice_type === 'proforma' ? 'Pro Forma' : 'Standard'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(`/api/invoices/${invoice.id}/pdf?template=${invoice.template}`, '_blank')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              {invoice.status !== 'paid' && (
                                <>
                                  <button
                                    onClick={() => handleSendInvoice(invoice)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Send
                                  </button>
                                  <button
                                    onClick={() => handleRecordPayment(invoice)}
                                    className="text-purple-600 hover:text-purple-900"
                                  >
                                    Record Payment
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => window.print()}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Print
                              </button>
                              <button
                                onClick={() => handleDelete(invoice, 'invoice')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filterItems(invoices).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No invoices found</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Invoice Template Selection Dialog */}
      <InvoiceTemplateDialog
        isOpen={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        onSelect={handleTemplateSelect}
      />
      
      {/* Send Invoice Dialog */}
      <SendInvoiceDialog
        isOpen={showSendDialog}
        onClose={() => {
          setShowSendDialog(false);
          setInvoiceToSend(null);
        }}
        invoice={invoiceToSend}
        onSend={handleSendInvoiceConfirm}
      />
      
      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => {
          setShowPaymentDialog(false);
          setInvoiceToRecordPayment(null);
        }}
        invoice={invoiceToRecordPayment}
        onRecord={handleRecordPaymentConfirm}
      />
    </div>
  );
};

export default InvoiceManagement;