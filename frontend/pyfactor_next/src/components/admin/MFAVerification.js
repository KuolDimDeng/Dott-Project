import React, { useState } from 'react';
import AdminSecureStorage from '@/utils/adminSecureStorage';

const MFAVerification = ({ tempToken, onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          temp_token: tempToken,
          mfa_token: code,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        // Store admin data
        AdminSecureStorage.setAdminData({
          ...data.user,
          sessionExpiry: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
        });

        onSuccess(data);
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (error) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Two-Factor Authentication</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {useBackupCode ? 'Enter Backup Code' : 'Enter 6-digit code from your authenticator app'}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              const value = e.target.value;
              if (useBackupCode) {
                // Allow alphanumeric and hyphens for backup codes
                setCode(value.toUpperCase());
              } else {
                // Only allow digits for TOTP codes
                setCode(value.replace(/\D/g, '').slice(0, 6));
              }
            }}
            placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
            className="w-full px-4 py-2 border rounded-lg text-center text-lg font-mono"
            maxLength={useBackupCode ? 9 : 6}
            autoFocus
            required
          />
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading || (!useBackupCode && code.length !== 6)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
              setError('');
            }}
            className="w-full px-4 py-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            {useBackupCode ? 'Use authenticator app instead' : 'Use backup code instead'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-6 text-sm text-gray-600">
        <p>Having trouble?</p>
        <ul className="mt-2 space-y-1">
          <li>• Make sure your device's time is synchronized</li>
          <li>• Try using a backup code if you can't access your authenticator</li>
          <li>• Contact your administrator if you're locked out</li>
        </ul>
      </div>
    </div>
  );
};

export default MFAVerification;