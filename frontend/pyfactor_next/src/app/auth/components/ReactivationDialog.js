import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// Auth0 authentication is handled via useSession hook
import { checkDisabledAccount, reactivateAccount } from '@/lib/account-reactivation';

/**
 * Component for reactivating a disabled account
 */
export default function ReactivationDialog({ email, onClose, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('check'); // 'check', 'confirm', 'password', 'success'
  const [accountInfo, setAccountInfo] = useState(null);
  const router = useRouter();

  // Check if the account exists and is disabled
  const checkAccount = async () => {
    try {
      setLoading(true);
      setMessage('');

      const result = await checkDisabledAccount(email);
      
      if (result.success && result.exists && result.isDisabled) {
        setAccountInfo(result);
        setStep('confirm');
      } else if (result.success && result.exists && !result.isDisabled) {
        setMessage('This account is already active. Please sign in.');
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setMessage('No account found with this email. Please sign up for a new account.');
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('[ReactivationDialog] Error checking account:', error);
      setMessage('Error checking account status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle reactivation confirmation
  const handleConfirm = async () => {
    try {
      setLoading(true);
      setMessage('');

      const result = await reactivateAccount({
        email,
        username: accountInfo.username,
        tenantId: accountInfo.tenantInfo?.id
      });

      if (result.success) {
        setStep('password');
        setMessage('Your account has been reactivated! Please enter your password to sign in.');
      } else {
        setMessage(`Could not reactivate account: ${result.message}`);
      }
    } catch (error) {
      console.error('[ReactivationDialog] Error reactivating account:', error);
      setMessage('Error reactivating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign-in after reactivation
  const handleSignIn = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage('');

      await signIn({
        username: email,
        password
      });

      setStep('success');
      setMessage('Sign-in successful!');
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Default redirect to dashboard if no success handler
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('[ReactivationDialog] Error signing in:', error);
      setMessage('Error signing in. Please check your password and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial check on component mount
  React.useEffect(() => {
    if (step === 'check' && email) {
      checkAccount();
    }
  }, [email]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-medium mb-4">Account Reactivation</h2>
        
        {message && (
          <div className={`p-3 mb-4 rounded ${step === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {message}
          </div>
        )}

        {step === 'check' && (
          <div className="text-center">
            <p>Checking account status...</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <p className="mb-4">
              This account was previously closed. Would you like to reactivate it?
              {accountInfo?.tenantInfo?.name && (
                <span className="block mt-2 font-semibold">Business name: {accountInfo.tenantInfo.name}</span>
              )}
              {accountInfo?.tenantInfo?.deactivated_at && (
                <span className="block mt-1 text-sm text-gray-600">
                  Closed on: {new Date(accountInfo.tenantInfo.deactivated_at).toLocaleDateString()}
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Reactivating...' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        )}

        {step === 'password' && (
          <form onSubmit={handleSignIn}>
            <p className="mb-4">
              Your account has been reactivated. Please enter your password to sign in.
            </p>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                disabled={loading || !password}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center">
            <p className="text-green-600 font-medium">Account reactivated successfully!</p>
            <p className="mt-2">Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
} 