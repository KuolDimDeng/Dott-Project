'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'react-hot-toast';
import { 
  XMarkIcon,
  PrinterIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import ReceiptGenerator from '@/utils/receiptGenerator';

const MobileReceiptDialog = ({ isOpen, onClose, saleData, businessInfo, onReceiptHandled }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customerContact, setCustomerContact] = useState('');
  const [contactType, setContactType] = useState('email'); // email, phone, whatsapp
  const [receiptGenerator, setReceiptGenerator] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // Initialize receipt generator and data when dialog opens
  useEffect(() => {
    if (isOpen && saleData) {
      const generator = new ReceiptGenerator(businessInfo);
      setReceiptGenerator(generator);
      
      const data = generator.generateReceiptData(saleData);
      setReceiptData(data);

      // Pre-fill customer contact if available
      if (saleData.customer) {
        setCustomerContact(saleData.customer.email || saleData.customer.phone || '');
        setContactType(saleData.customer.email ? 'email' : 'phone');
      }
    }
  }, [isOpen, saleData, businessInfo]);

  // Download PDF receipt
  const handleDownloadPDF = async () => {
    if (!receiptGenerator || !receiptData) return;

    setIsGenerating(true);
    try {
      const pdf = receiptGenerator.generatePDFReceipt(receiptData);
      pdf.save(`Receipt-${receiptData.receipt.number}.pdf`);
      
      toast.success('PDF receipt downloaded');
      
      // Auto-close after successful download
      setTimeout(() => {
        onClose();
        if (onReceiptHandled) onReceiptHandled();
      }, 1500);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  // Email receipt
  const handleEmailReceipt = async () => {
    if (!receiptGenerator || !receiptData || !customerContact.trim()) {
      toast.error('Please enter customer email address');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/pos/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'email',
          to: customerContact,
          receipt: receiptData,
          emailContent: {
            subject: `Receipt #${receiptData?.receipt?.number || 'N/A'}`,
            html: true
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to send email');
        return;
      }

      toast.success(`Receipt emailed to ${customerContact}`);
      
      setTimeout(() => {
        onClose();
        if (onReceiptHandled) onReceiptHandled();
      }, 1500);
      
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send email receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  // SMS receipt
  const handleSMSReceipt = async () => {
    if (!receiptGenerator || !receiptData || !customerContact.trim()) {
      toast.error('Please enter customer phone number');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/pos/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'sms',
          to: customerContact,
          receipt: receiptData
        }),
      });

      if (!response.ok) {
        toast.error('Failed to send SMS');
        return;
      }

      toast.success(`Receipt sent via SMS to ${customerContact}`);
      
      setTimeout(() => {
        onClose();
        if (onReceiptHandled) onReceiptHandled();
      }, 1500);
      
    } catch (error) {
      console.error('SMS error:', error);
      toast.error('Failed to send SMS receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  // WhatsApp receipt
  const handleWhatsAppReceipt = async () => {
    if (!receiptGenerator || !receiptData) return;

    try {
      const textReceipt = receiptGenerator.generateTextReceipt(receiptData);
      
      // Format phone number (remove non-digits and add country code if needed)
      let phoneNumber = customerContact.replace(/\D/g, '');
      if (!phoneNumber.startsWith('1') && phoneNumber.length === 10) {
        phoneNumber = '1' + phoneNumber; // Add US country code
      }
      
      // Open WhatsApp with pre-filled message
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textReceipt)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('Opening WhatsApp...');
      
      setTimeout(() => {
        onClose();
        if (onReceiptHandled) onReceiptHandled();
      }, 1500);
      
    } catch (error) {
      console.error('WhatsApp error:', error);
      toast.error('Failed to open WhatsApp');
    }
  };

  // Share receipt (Web Share API)
  const handleShareReceipt = async () => {
    if (!receiptGenerator || !receiptData) return;

    try {
      const textReceipt = receiptGenerator.generateTextReceipt(receiptData);
      
      if (navigator.share) {
        // Use Web Share API if available (mobile browsers)
        await navigator.share({
          title: `Receipt #${receiptData.receipt.number}`,
          text: textReceipt,
        });
        
        setTimeout(() => {
          onClose();
          if (onReceiptHandled) onReceiptHandled();
        }, 500);
        
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(textReceipt);
        toast.success('Receipt copied to clipboard');
        
        setTimeout(() => {
          onClose();
          if (onReceiptHandled) onReceiptHandled();
        }, 1500);
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error('Failed to share receipt');
      }
    }
  };

  // Print receipt (for mobile with print capability)
  const handlePrintReceipt = async () => {
    if (!receiptGenerator || !receiptData) return;

    setIsGenerating(true);
    try {
      const htmlReceipt = receiptGenerator.generateHTMLReceipt(receiptData);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlReceipt);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
      
      toast.success('Opening print dialog...');
      
      setTimeout(() => {
        onClose();
        if (onReceiptHandled) onReceiptHandled();
      }, 1500);
      
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt');
    } finally {
      setIsGenerating(false);
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
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-full"
            >
              <Dialog.Panel className="w-full max-h-[85vh] transform overflow-hidden rounded-t-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        Sale Complete!
                      </Dialog.Title>
                      <p className="text-sm text-gray-500">
                        #{receiptData?.receipt?.number}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Download PDF */}
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isGenerating}
                      className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <DocumentArrowDownIcon className="h-8 w-8 text-blue-600 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Download PDF</span>
                    </button>

                    {/* Share */}
                    <button
                      onClick={handleShareReceipt}
                      disabled={isGenerating}
                      className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <ShareIcon className="h-8 w-8 text-green-600 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Share</span>
                    </button>

                    {/* Print */}
                    <button
                      onClick={handlePrintReceipt}
                      disabled={isGenerating}
                      className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <PrinterIcon className="h-8 w-8 text-gray-600 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Print</span>
                    </button>

                    {/* WhatsApp Direct */}
                    <button
                      onClick={() => {
                        if (!customerContact) {
                          setContactType('whatsapp');
                        } else {
                          handleWhatsAppReceipt();
                        }
                      }}
                      disabled={isGenerating}
                      className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600 mb-2" />
                      <span className="text-sm font-medium text-gray-900">WhatsApp</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or send to customer</span>
                    </div>
                  </div>

                  {/* Contact Input */}
                  <div className="space-y-3">
                    {/* Contact Type Selector */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setContactType('email')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          contactType === 'email'
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                            : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                        }`}
                      >
                        <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                        Email
                      </button>
                      <button
                        onClick={() => setContactType('phone')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          contactType === 'phone'
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                            : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                        }`}
                      >
                        <DevicePhoneMobileIcon className="h-4 w-4 inline mr-1" />
                        SMS
                      </button>
                      <button
                        onClick={() => setContactType('whatsapp')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          contactType === 'whatsapp'
                            ? 'bg-green-100 text-green-700 border-2 border-green-500'
                            : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                        }`}
                      >
                        <ChatBubbleLeftRightIcon className="h-4 w-4 inline mr-1" />
                        WhatsApp
                      </button>
                    </div>

                    {/* Input Field */}
                    <div className="relative">
                      <input
                        type={contactType === 'email' ? 'email' : 'tel'}
                        placeholder={
                          contactType === 'email' 
                            ? 'customer@example.com'
                            : contactType === 'phone'
                            ? '+1 234 567 8900'
                            : '+1 234 567 8900 (WhatsApp)'
                        }
                        value={customerContact}
                        onChange={(e) => setCustomerContact(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={() => {
                        if (contactType === 'email') {
                          handleEmailReceipt();
                        } else if (contactType === 'phone') {
                          handleSMSReceipt();
                        } else {
                          handleWhatsAppReceipt();
                        }
                      }}
                      disabled={isGenerating || !customerContact.trim()}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                        isGenerating || !customerContact.trim()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : contactType === 'whatsapp'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        `Send via ${contactType === 'email' ? 'Email' : contactType === 'phone' ? 'SMS' : 'WhatsApp'}`
                      )}
                    </button>
                  </div>

                  {/* Skip Button */}
                  <button
                    onClick={() => {
                      onClose();
                      if (onReceiptHandled) onReceiptHandled();
                    }}
                    className="w-full mt-3 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    Skip Receipt
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Receipt saved in Sales History
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MobileReceiptDialog;