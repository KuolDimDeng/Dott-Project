import { useAuth } from '../context/AuthContext';

export const useSession = () => {
  const context = useAuth();
  
  if (!context) {
    throw new Error('useSession must be used within an AuthProvider');
  }

  return context;
};