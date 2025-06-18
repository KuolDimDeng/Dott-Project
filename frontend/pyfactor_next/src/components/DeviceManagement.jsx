/**
 * Device Management Component
 * Allows users to view and manage their trusted devices
 */

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { formatDistanceToNow } from 'date-fns';

const DeviceManagement = () => {
  const { session } = useSession();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trustingDevice, setTrustingDevice] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingDeviceId, setPendingDeviceId] = useState(null);

  // Fetch user devices
  const fetchDevices = async () => {
    if (!session?.accessToken) return;

    try {
      setLoading(true);
      const response = await fetch('/api/sessions/security/devices/', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices);
      } else {
        setError('Failed to load devices');
      }
    } catch (err) {
      setError('Error loading devices');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [session]);

  // Trust current device
  const trustCurrentDevice = async (deviceName) => {
    if (!session?.accessToken) return;

    try {
      setTrustingDevice(true);
      const response = await fetch('/api/sessions/security/devices/trust/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          device_name: deviceName,
          duration_days: 90
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPendingDeviceId(data.device_id);
        // Show verification code input
        return true;
      } else {
        setError('Failed to trust device');
        return false;
      }
    } catch (err) {
      setError('Error trusting device');
      console.error('Error trusting device:', err);
      return false;
    } finally {
      setTrustingDevice(false);
    }
  };

  // Verify device trust
  const verifyDeviceTrust = async () => {
    if (!session?.accessToken || !pendingDeviceId || !verificationCode) return;

    try {
      const response = await fetch('/api/sessions/security/devices/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          device_id: pendingDeviceId,
          code: verificationCode
        }),
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh devices list
        await fetchDevices();
        setPendingDeviceId(null);
        setVerificationCode('');
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Error verifying device');
      console.error('Error verifying device:', err);
    }
  };

  // Revoke device trust
  const revokeDeviceTrust = async (deviceId) => {
    if (!session?.accessToken) return;

    try {
      const response = await fetch('/api/sessions/security/devices/revoke/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          device_id: deviceId,
          reason: 'User requested'
        }),
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh devices list
        await fetchDevices();
      } else {
        setError('Failed to revoke device trust');
      }
    } catch (err) {
      setError('Error revoking device trust');
      console.error('Error revoking device:', err);
    }
  };

  // Get device icon based on platform
  const getDeviceIcon = (platform) => {
    if (!platform) return '💻';
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('win')) return '🖥️';
    if (platformLower.includes('mac')) return '🍎';
    if (platformLower.includes('linux')) return '🐧';
    if (platformLower.includes('android')) return '📱';
    if (platformLower.includes('ios') || platformLower.includes('iphone')) return '📱';
    return '💻';
  };

  // Get risk level badge
  const getRiskBadge = (riskScore) => {
    if (riskScore <= 30) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Low Risk</span>;
    } else if (riskScore <= 70) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Medium Risk</span>;
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">High Risk</span>;
    }
  };

  if (loading) {
    return <div className="p-4">Loading devices...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Device Management</h2>
      
      {/* Trust new device form */}
      {!pendingDeviceId && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Trust This Device</h3>
          <p className="text-sm text-gray-600 mb-3">
            Trusted devices can sign in without additional verification.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Device name (e.g., My Laptop)"
              className="flex-1 px-3 py-2 border rounded"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  trustCurrentDevice(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousSibling;
                if (input.value) {
                  trustCurrentDevice(input.value);
                  input.value = '';
                }
              }}
              disabled={trustingDevice}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Trust Device
            </button>
          </div>
        </div>
      )}

      {/* Verification code input */}
      {pendingDeviceId && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold mb-2">Enter Verification Code</h3>
          <p className="text-sm text-gray-600 mb-3">
            We've sent a verification code to your email. Enter it below to trust this device.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="6-digit code"
              maxLength="6"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={verifyDeviceTrust}
              disabled={verificationCode.length !== 6}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Verify
            </button>
            <button
              onClick={() => {
                setPendingDeviceId(null);
                setVerificationCode('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Devices list */}
      <div className="space-y-4">
        {devices.length === 0 ? (
          <p className="text-gray-500">No devices found.</p>
        ) : (
          devices.map((device) => (
            <div key={device.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getDeviceIcon(device.platform)}</span>
                    <h4 className="font-semibold">
                      {device.trust_name || `${device.platform || 'Unknown Device'}`}
                    </h4>
                    {device.is_trusted && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Trusted
                      </span>
                    )}
                    {device.is_blocked && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        Blocked
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>First seen: {formatDistanceToNow(new Date(device.first_seen))} ago</p>
                    <p>Last active: {formatDistanceToNow(new Date(device.last_seen))} ago</p>
                    <p>Login count: {device.login_count}</p>
                    <p className="text-xs">{device.user_agent}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {getRiskBadge(device.risk_score)}
                    <span className="text-xs text-gray-500">
                      Trust score: {device.trust_score}/100
                    </span>
                  </div>
                </div>

                {device.is_trusted && !device.is_blocked && (
                  <button
                    onClick={() => revokeDeviceTrust(device.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Revoke Trust
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeviceManagement;