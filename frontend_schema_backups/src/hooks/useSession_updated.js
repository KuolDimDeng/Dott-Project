import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useSession = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useSession must be used within an AuthProvider');
  }

  return {
    ...context,
    // Don't return refreshSession since it doesn't exist in the context
  };
};