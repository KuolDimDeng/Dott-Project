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
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import ReceiptGenerator from '@/utils/receiptGenerator';

const ReceiptDialog = ({ isOpen, onClose, saleData, businessInfo, onReceiptHandled }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
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
        setCustomerEmail(saleData.customer.email || '');
      }
    }
  }, [isOpen, saleData, businessInfo]);

  // Print receipt
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
      
      toast.success('Receipt sent to printer');
      
      // Auto-close after successful print and reset POS
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

  // Download PDF receipt
  const handleDownloadPDF = async () => {
    if (!receiptGenerator || !receiptData) return;

    setIsGenerating(true);
    try {
      const pdf = receiptGenerator.generatePDFReceipt(receiptData);
      pdf.save(`Receipt-${receiptData.receipt.number}.pdf`);
      
      toast.success('PDF receipt downloaded');
      
      // Auto-close after successful download and reset POS
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
    if (!receiptGenerator || !receiptData || !customerEmail.trim()) {
      toast.error('Please enter customer email address');
      return;
    }

    setIsGenerating(true);
    try {
      // Call backend API to send email (secure, server-side)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/sales/pos/send-receipt/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${document.cookie.split('sid=')[1]?.split(';')[0] || ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          to: customerEmail,
          receipt: receiptData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 503) {
          toast.error('Email service is being configured. Please download the PDF receipt instead.');
        } else if (response.status === 401) {
          toast.error('Authentication required. Please sign in again.');
        } else {
          toast.error(errorData.error || errorData.message || 'Failed to send email');
        }
        return;
      }

      toast.success(`Receipt emailed to ${customerEmail}`);
      
      // Auto-close after successful email and reset POS
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


  // Share receipt (Web Share API or fallback)
  const handleShareReceipt = async () => {
    if (!receiptGenerator || !receiptData) return;

    try {
      const textReceipt = receiptGenerator.generateTextReceipt(receiptData);
      
      if (navigator.share) {
        // Use Web Share API if available
        await navigator.share({
          title: `Receipt #${receiptData.receipt.number}`,
          text: textReceipt,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(textReceipt);
        toast.success('Receipt copied to clipboard');
      }
      
      // Auto-close after successful share and reset POS
      setTimeout(() => {
        onClose();
        if (onReceiptHandled) onReceiptHandled();
      }, 1500);
      
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share receipt');
    }
  };

  const ReceiptOption = ({ icon: Icon, title, description, onClick, disabled, variant = 'default' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-lg border transition-all duration-200 ${
        disabled 
          ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50' 
          : variant === 'primary'
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      } group`}
    >
      <div className="flex items-start space-x-4">
        <div className={`p-2 rounded-lg ${
          disabled 
            ? 'bg-gray-200' 
            : variant === 'primary'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 text-left">
          <h3 className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className={`text-sm mt-1 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        Sale Completed!
                      </Dialog.Title>
                      <p className="text-sm text-gray-500">
                        Receipt #{receiptData?.receipt?.number}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-6">
                    Choose how you'd like to provide the receipt to your customer:
                  </p>

                  <div className="space-y-3">
                    {/* Print Receipt */}
                    <ReceiptOption
                      icon={PrinterIcon}
                      title="Print Receipt"
                      description="Print a physical receipt"
                      onClick={handlePrintReceipt}
                      disabled={isGenerating}
                      variant="primary"
                    />

                    {/* Download PDF */}
                    <ReceiptOption
                      icon={DocumentArrowDownIcon}
                      title="Download PDF"
                      description="Save receipt as PDF file"
                      onClick={handleDownloadPDF}
                      disabled={isGenerating}
                    />

                    {/* Email Receipt */}
                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="Customer email address"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <ReceiptOption
                        icon={EnvelopeIcon}
                        title="Email Receipt"
                        description="Send receipt via email"
                        onClick={handleEmailReceipt}
                        disabled={isGenerating || !customerEmail.trim()}
                      />
                    </div>

                  </div>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          onClose();
                          if (onReceiptHandled) onReceiptHandled();
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Skip Receipt
                      </button>
                      <button
                        onClick={handleShareReceipt}
                        disabled={isGenerating}
                        className="flex-1 px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                      >
                        Share/Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      You can access this receipt later in Sales History
                    </p>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ReceiptDialog;