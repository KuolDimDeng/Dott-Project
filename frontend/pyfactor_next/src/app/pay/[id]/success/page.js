'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // You could verify the payment status here if needed
    // For now, we'll just show the success message
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your payment. Your invoice has been marked as paid and a receipt has been sent to your email.
          </p>

          {/* Invoice Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Invoice ID</p>
            <p className="text-lg font-medium text-gray-900">#{params.id}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.print()}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Receipt
            </button>

            <Link
              href="/"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Done
            </Link>
          </div>

          {/* Security Note */}
          <p className="mt-6 text-xs text-gray-500">
            This payment was processed securely by Stripe. For any questions, please contact the business that sent you this invoice.
          </p>
        </div>

        {/* Powered by Dott */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Powered by{' '}
          <a href="https://dottapps.com" className="font-medium text-blue-600 hover:text-blue-500">
            Dott
          </a>
        </p>
      </div>
    </div>
  );
}