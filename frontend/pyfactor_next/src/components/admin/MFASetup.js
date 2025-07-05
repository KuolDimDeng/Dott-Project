import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import adminApiClient from '@/utils/adminApiClient';

const MFASetup = ({ onComplete, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('setup'); // setup, verify, backup

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const data = await adminApiClient.get('/admin/mfa/setup/');
      setSetupData(data);
      setLoading(false);
    } catch (error) {
      setError('Failed to load MFA setup data');
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminApiClient.post('/admin/mfa/setup/', {
        token: verificationCode,
      });

      if (response.success) {
        setBackupCodes(response.backup_codes);
        setStep('backup');
      }
    } catch (error) {
      setError(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  if (loading && !setupData) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 'setup' && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Set Up Two-Factor Authentication</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Two-factor authentication adds an extra layer of security to your admin account. 
              You'll need to enter a code from your authenticator app in addition to your password.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 1: Install an Authenticator App</h3>
              <p className="text-gray-600 mb-2">
                Install one of these authenticator apps on your phone:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Google Authenticator</li>
                <li>Microsoft Authenticator</li>
                <li>Authy</li>
                <li>1Password</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Step 2: Scan QR Code</h3>
              <p className="text-gray-600 mb-4">
                Scan this QR code with your authenticator app:
              </p>
              {setupData && (
                <div className="bg-white p-4 border rounded-lg inline-block">
                  <QRCodeSVG value={setupData.qr_code} size={200} />
                </div>
              )}
              <p className="text-sm text-gray-500 mt-4">
                Can't scan? Enter this code manually: <code className="bg-gray-100 px-2 py-1 rounded">{setupData?.secret}</code>
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Step 3: Verify</h3>
              <p className="text-gray-600 mb-4">
                Enter the 6-digit code from your authenticator app:
              </p>
              <form onSubmit={handleVerify}>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-32 px-4 py-2 border rounded-lg text-center text-lg font-mono"
                  maxLength={6}
                  required
                />
                {error && (
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable MFA'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {step === 'backup' && backupCodes && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Save Your Backup Codes</h2>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 font-semibold mb-2">Important!</p>
            <p className="text-sm text-yellow-800">
              Save these backup codes in a secure place. You can use them to access your account if you lose your authenticator device.
              Each code can only be used once.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white px-3 py-2 rounded border">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                const codes = backupCodes.join('\n');
                const blob = new Blob([codes], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'dott-admin-backup-codes.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Download Codes
            </button>
            <button
              onClick={handleComplete}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              I've Saved My Codes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MFASetup;