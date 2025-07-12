'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPinIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function LocationConsent({ 
  onAccept, 
  onDecline, 
  showAlways = false,
  employeeId,
  tenantId 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(true);
  const [consentStatus, setConsentStatus] = useState(null);
  const [showConsent, setShowConsent] = useState(false);

  // Check existing consent status
  useEffect(() => {
    checkConsentStatus();
  }, [employeeId]);

  const checkConsentStatus = async () => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/hr/location-consents/check/${employeeId}/`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConsentStatus(data);
        
        // Show consent dialog if not consented or showAlways is true
        if (!data.has_consented || showAlways) {
          setShowConsent(true);
        }
      }
    } catch (error) {
      console.error('Error checking consent status:', error);
      setShowConsent(true); // Show consent on error
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      if (rememberChoice && employeeId) {
        // Save consent preference
        await fetch('/api/hr/location-consents/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({
            employee: employeeId,
            has_consented: true,
            consent_given_at: new Date().toISOString(),
            tracking_enabled: true,
            share_with_manager: true,
            random_checks_allowed: true,
          }),
        });
      }
      
      setShowConsent(false);
      onAccept();
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      if (rememberChoice && employeeId) {
        // Save decline preference
        await fetch('/api/hr/location-consents/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({
            employee: employeeId,
            has_consented: false,
            consent_declined_at: new Date().toISOString(),
            tracking_enabled: false,
          }),
        });
      }
      
      setShowConsent(false);
      onDecline();
    } catch (error) {
      console.error('Error saving decline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showConsent) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <MapPinIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Enable Location for Timesheets
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Help verify your work location
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-4">
          {/* Why we need location */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Why location?</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Verify work location for clients</li>
                  <li>• Ensure accurate timesheet records</li>
                  <li>• Comply with labor regulations</li>
                  <li>• Improve workplace safety</li>
                </ul>
              </div>
            </div>
          </div>

          {/* When we track */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">When we track</p>
                <p className="text-sm text-gray-600">Only during work hours when clocked in</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">Your privacy</p>
                <p className="text-sm text-gray-600">Location data encrypted & auto-deleted after 90 days</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">Your control</p>
                <p className="text-sm text-gray-600">View your data anytime, opt-out in settings</p>
              </div>
            </div>
          </div>

          {/* Legal notice */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <DocumentTextIcon className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900 font-medium">Legal compliance</p>
                <p className="text-sm text-gray-600 mt-1">
                  This complies with GDPR, CCPA, and local labor laws. Location tracking is:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>✓ Limited to work hours only</li>
                  <li>✓ Used solely for business purposes</li>
                  <li>✓ Subject to your consent</li>
                  <li>✓ Fully transparent and auditable</li>
                </ul>
                <div className="flex items-center space-x-3 mt-2">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {showDetails ? 'Hide' : 'Show'} summary
                  </button>
                  <a
                    href="/legal/location-tracking-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Read full policy →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Full privacy policy (collapsible) */}
          {showDetails && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-3">
              <h4 className="font-medium text-gray-900">Location Tracking Privacy Policy</h4>
              
              <div>
                <p className="font-medium text-gray-900">1. Data Collection</p>
                <p>We collect GPS coordinates and convert them to addresses only when you clock in/out or during random verification checks while on duty.</p>
              </div>

              <div>
                <p className="font-medium text-gray-900">2. Data Usage</p>
                <p>Location data is used exclusively for:</p>
                <ul className="ml-4 mt-1">
                  <li>• Timesheet verification</li>
                  <li>• Compliance with client requirements</li>
                  <li>• Workplace safety monitoring</li>
                  <li>• Payroll accuracy</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-900">3. Data Storage</p>
                <p>All location data is encrypted and automatically deleted after 90 days. You can request immediate deletion at any time.</p>
              </div>

              <div>
                <p className="font-medium text-gray-900">4. Your Rights</p>
                <ul className="ml-4 mt-1">
                  <li>• Access your location history</li>
                  <li>• Export your data</li>
                  <li>• Request deletion</li>
                  <li>• Opt-out at any time</li>
                  <li>• No retaliation for opting out</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-900">5. Legal Basis</p>
                <p>We process location data based on your explicit consent and our legitimate business interests in accurate timekeeping and workplace safety.</p>
              </div>
            </div>
          )}

          {/* Remember choice */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              id="remember"
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember" className="text-sm text-gray-600">
              Remember my choice
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 space-y-3">
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <CheckCircleIcon className="w-5 h-5" />
            <span>Accept & Enable Location</span>
          </button>
          
          <button
            onClick={handleDecline}
            disabled={isLoading}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <XCircleIcon className="w-5 h-5" />
            <span>Decline & Continue Without</span>
          </button>
          
          <p className="text-xs text-center text-gray-500">
            You can change this anytime in Settings → Privacy
          </p>
        </div>
      </div>
    </div>
  );
}