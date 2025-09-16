'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SMSDemo() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSendCode = async () => {
    setError('');
    setSuccess('');

    // Validate phone number (US format)
    const digitsOnly = phoneNumber.replace(/[^\d]/g, '');
    if (digitsOnly.length !== 10) {
      setError('Please enter a valid 10-digit US phone number');
      return;
    }

    if (!consent) {
      setError('Please agree to receive SMS verification codes');
      return;
    }

    setLoading(true);

    // Simulate sending code (replace with actual API call in production)
    setTimeout(() => {
      setLoading(false);
      setCodeSent(true);
      setSuccess('Verification code sent! Please check your phone.');
    }, 2000);
  };

  const handleVerifyCode = async () => {
    setError('');
    setSuccess('');

    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    // Simulate verification (replace with actual API call in production)
    setTimeout(() => {
      setLoading(false);
      setSuccess('Phone number verified successfully! This is a demo.');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Image
                src="/Logo.svg"
                alt="Dott Logo"
                width={120}
                height={40}
                priority
              />
              <span className="ml-3 text-gray-500 text-sm">SMS Verification Demo</span>
            </div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto pt-16 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">
            Phone Verification Demo
          </h1>
          <p className="text-gray-600 text-center mb-8">
            This demo shows how Dott users verify their phone numbers
          </p>

          {!codeSent ? (
            <div className="space-y-6">
              {/* Phone Number Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength="14"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your US phone number to receive a verification code
                </p>
              </div>

              {/* Consent Checkbox */}
              <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>I agree to receive SMS verification codes</strong> from Dott at the phone number provided.
                    Message and data rates may apply. This is for account security only - no marketing messages will be sent.
                    Reply STOP to unsubscribe.
                  </span>
                </label>
              </div>

              {/* Clear Message */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>What happens next:</strong><br />
                  We will send you a 6-digit verification code via SMS to confirm your phone number.
                  This helps secure your Dott account and enables two-factor authentication.
                </p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Send Code Button */}
              <button
                onClick={handleSendCode}
                disabled={loading || !phoneNumber}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  loading || !phoneNumber
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Code Entry */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                  maxLength="6"
                />
                <p className="mt-2 text-sm text-gray-600">
                  We sent a code to {phoneNumber}
                </p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Verify Button */}
              <button
                onClick={handleVerifyCode}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  loading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              {/* Resend Link */}
              <button
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode('');
                  setSuccess('');
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700"
              >
                Didn't receive a code? Send again
              </button>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3">How We Use SMS Verification</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Account creation verification
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Two-factor authentication (2FA)
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Password reset verification
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              One-time passcodes (OTP) only
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>This is a demonstration page for SMS verification compliance.</p>
          <p className="mt-1">
            Questions? Contact us at{' '}
            <a href="mailto:support@dottapps.com" className="text-blue-600 hover:text-blue-700">
              support@dottapps.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}