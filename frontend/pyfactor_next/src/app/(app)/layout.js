'use client';

import SessionHeartbeat from '@/components/SessionHeartbeat';
import Providers from '@/providers';

// Layout for main app routes (non-admin)
export default function AppLayout({ children }) {
  return (
    <>
      {/* Session Heartbeat Component */}
      <SessionHeartbeat interval={60000} />
      
      <Providers>
        {children}
      </Providers>
    </>
  );
}