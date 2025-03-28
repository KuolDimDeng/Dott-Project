import { useEffect } from 'react';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';
import useEnsureTenant from '@/hooks/useEnsureTenant';

export default function DashboardLayout({ children }) {
  const { verifyTenantSchema } = useTenantInitialization();
  const { status: tenantStatus } = useEnsureTenant();
  
  // Verify tenant schema exists when dashboard loads
  useEffect(() => {
    const checkTenantSchema = async () => {
      await verifyTenantSchema();
    };
    
    checkTenantSchema();
  }, [verifyTenantSchema]);

  // ... existing code ...
} 