import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { axiosInstance } from '@/lib/axiosConfig';

const ConnectBank = () => {
  const [region, setRegion] = useState('');
  const [africanOption, setAfricanOption] = useState('');
  const [africanBankProvider, setAfricanBankProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkToken, setLinkToken] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [connectedBankInfo, setConnectedBankInfo] = useState(null);

  const handleRegionChange = (event) => {
    setRegion(event.target.value);
    setAfricanOption('');
    setAfricanBankProvider('');
  };

  const handleAfricanOptionChange = (event) => {
    setAfricanOption(event.target.value);
    setAfricanBankProvider('');
  };

  const handleAfricanBankProviderChange = (event) => {
    setAfricanBankProvider(event.target.value);
  };

  const getProviderForRegion = (region) => {
    switch (region) {
      case 'America':
        return 'plaid';
      case 'Europe':
        return 'tink';
      case 'Africa':
        return africanOption === 'Mobile Money' ? 'africas_talking' : africanBankProvider;
      case 'Asia':
        return 'salt_edge';
      default:
        return 'unknown';
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    const provider = getProviderForRegion(region);
    try {
      const payload = { region, provider };
      if (region === 'Africa') {
        payload.sub_option = africanOption;
        if (africanOption === 'Banks') {
          payload.bank_provider = africanBankProvider;
        }
      }

      const response = await axiosInstance.post('/api/banking/create_link_token/', payload);

      if (response.data.link_token) {
        setLinkToken(response.data.link_token);
      } else if (response.data.auth_url) {
        // Handle non-Plaid providers that return an auth URL
        window.location.href = response.data.auth_url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error creating link token:', err);
      setError('Failed to initialize bank connection. Please try again.');
      setSnackbar({ open: true, message: 'Failed to connect bank', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      console.log('Bank connection successful');
      exchangePublicToken(public_token);
    },
    onExit: (err, metadata) => {
      console.log('Plaid Link exited', err, metadata);
      if (err) {
        setSnackbar({ open: true, message: 'Failed to connect bank', severity: 'error' });
      }
    },
    onEvent: (eventName, metadata) => {
      console.log('Plaid Link event', eventName, metadata);
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const exchangePublicToken = async (public_token) => {
    try {
      const response = await axiosInstance.post('/api/banking/exchange_token/', { public_token });
      if (response.data.success) {
        setConnectedBankInfo(response.data.bank_info);
        setSnackbar({
          open: true,
          message: 'Bank connected successfully',
          severity: 'success',
        });
      } else {
        throw new Error('Failed to exchange token');
      }
    } catch (error) {
      console.error('Error exchanging token:', error);
      setSnackbar({
        open: true,
        message: 'Failed to connect bank. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">
        Connect Your Bank
      </h1>

      {!connectedBankInfo ? (
        <>
          <p className="mb-4">
            Please choose the region where your bank is located. This helps us provide you with the
            most appropriate connection method for your bank.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Your Region
            </label>
            <select
              value={region}
              onChange={handleRegionChange}
              className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Select a region</option>
              <option value="America">America</option>
              <option value="Europe">Europe</option>
              <option value="Africa">Africa</option>
              <option value="Asia">Asia</option>
            </select>
          </div>

          {region === 'Africa' && (
            <div className="mb-4">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-2">Choose a connection method</legend>
                <div className="space-y-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Mobile Money"
                      checked={africanOption === 'Mobile Money'}
                      onChange={handleAfricanOptionChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Mobile Money</span>
                  </label>
                  <div>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="Banks"
                        checked={africanOption === 'Banks'}
                        onChange={handleAfricanOptionChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2">Traditional Banks</span>
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {region === 'Africa' && africanOption === 'Banks' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Bank Provider
              </label>
              <select
                value={africanBankProvider}
                onChange={handleAfricanBankProviderChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Select a provider</option>
                <option value="Mono">Mono</option>
                <option value="Stitch">Stitch</option>
              </select>
            </div>
          )}

          <button
            className={`w-full py-2 px-4 rounded-md ${
              !region ||
              (region === 'Africa' &&
                (!africanOption || (africanOption === 'Banks' && !africanBankProvider))) ||
              loading
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={handleConnect}
            disabled={
              !region ||
              (region === 'Africa' &&
                (!africanOption || (africanOption === 'Banks' && !africanBankProvider))) ||
              loading
            }
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Connect'}
          </button>
        </>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-blue-600 mb-2">
            Successfully Connected!
          </h2>
          <p className="mb-4">
            You are now connected to {connectedBankInfo.institution_name}.
          </p>
          <ul className="divide-y divide-gray-200">
            {connectedBankInfo.accounts.map((account, index) => (
              <li key={index} className="py-3">
                <div className="font-medium">Account: {account.name}</div>
                <div className="text-sm text-gray-600">Type: {account.type}, Balance: ${account.balances.current.toFixed(2)}</div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            You can now view your transactions and account details in the Banking Dashboard.
          </p>
          <a
            href="/dashboard/banking"
            className="mt-4 w-full block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md"
          >
            Go to Banking Dashboard
          </a>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-600">
          {error}
        </p>
      )}
      
      {snackbar.open && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`p-3 rounded-md shadow-lg ${
            snackbar.severity === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            snackbar.severity === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <div className="flex items-center">
              <span>{snackbar.message}</span>
              <button 
                onClick={handleCloseSnackbar}
                className="ml-3 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectBank;
