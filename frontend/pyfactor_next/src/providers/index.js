import { AuthProvider } from '../contexts/AuthContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import AuthWrapper from '../app/AuthWrapper/AuthWrapper';
import dynamic from 'next/dynamic';

const PWAInstallPrompt = dynamic(() => import('../components/PWAInstallPrompt'), {
  ssr: false
});

const Providers = ({ children }) => {
  return (
    <AuthWrapper>
      <AuthProvider>
        <CurrencyProvider>
          {children}
          <PWAInstallPrompt />
        </CurrencyProvider>
      </AuthProvider>
    </AuthWrapper>
  );
};

export default Providers;