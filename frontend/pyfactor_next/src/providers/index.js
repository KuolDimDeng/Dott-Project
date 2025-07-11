import { AuthProvider } from '../contexts/AuthContext';
import AuthWrapper from '../app/AuthWrapper/AuthWrapper';
import dynamic from 'next/dynamic';

const PWAInstallPrompt = dynamic(() => import('../components/PWAInstallPrompt'), {
  ssr: false
});

const Providers = ({ children }) => {
  return (
    <AuthWrapper>
      <AuthProvider>
        {children}
        <PWAInstallPrompt />
      </AuthProvider>
    </AuthWrapper>
  );
};

export default Providers;