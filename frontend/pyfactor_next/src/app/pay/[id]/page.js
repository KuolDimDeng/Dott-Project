'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function PayInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}/public`);
      if (!response.ok) {
        throw new Error('Invoice not found');
      }
      const data = await response.json();
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Invoice not found or has been paid');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/invoice-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          success_url: `${window.location.origin}/pay/${invoice.id}/success`,
          cancel_url: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment session');
      }

      const { checkout_url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = checkout_url;
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice not found</h3>
          <p className="mt-1 text-sm text-gray-500">This invoice may have been deleted or already paid.</p>
        </div>
      </div>
    );
  }

  const isAlreadyPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-8">
          <div className="px-6 py-8 sm:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice Payment</h1>
                <p className="mt-1 text-sm text-gray-600">Secure payment powered by Stripe</p>
              </div>
              <div className="text-right">
                <img 
                  src="/dott-logo.png" 
                  alt="Dott" 
                  className="h-8 inline-block"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* Business Info */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{invoice.business_name}</h2>
              {invoice.business_address && (
                <p className="text-sm text-gray-600">{invoice.business_address}</p>
              )}
              {invoice.business_email && (
                <p className="text-sm text-gray-600">{invoice.business_email}</p>
              )}
              {invoice.business_phone && (
                <p className="text-sm text-gray-600">{invoice.business_phone}</p>
              )}
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Bill To</h3>
                <p className="mt-2 text-base font-medium text-gray-900">{invoice.customer_name}</p>
                {invoice.customer_email && (
                  <p className="text-sm text-gray-600">{invoice.customer_email}</p>
                )}
                {invoice.customer_phone && (
                  <p className="text-sm text-gray-600">{invoice.customer_phone}</p>
                )}
              </div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice #</span>
                  <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isAlreadyPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.description || item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${parseFloat(item.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">${parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-gray-900">-${parseFloat(invoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-900">${parseFloat(invoice.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                {invoice.shipping_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span className="text-gray-900">${parseFloat(invoice.shipping_cost).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-medium pt-4 border-t">
                  <span className="text-gray-900">Total Due</span>
                  <span className="text-gray-900">${parseFloat(invoice.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            {!isAlreadyPaid ? (
              <div className="mt-8">
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pay ${parseFloat(invoice.total_amount).toFixed(2)} with Card
                    </>
                  )}
                </button>
                <p className="mt-3 text-center text-sm text-gray-500">
                  Secure payment processed by Stripe. Your card details are never stored.
                </p>
              </div>
            ) : (
              <div className="mt-8 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-green-800 font-medium">This invoice has been paid</p>
                </div>
                <p className="mt-1 text-sm text-green-700">
                  Payment received on {invoice.paid_date ? format(new Date(invoice.paid_date), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Security Badge */}
        <div className="text-center text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
              <span>PCI Compliant</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">Powered by Dott</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}