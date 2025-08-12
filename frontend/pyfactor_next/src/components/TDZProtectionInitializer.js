'use client';

import { useEffect } from 'react';
// import { initializeTDZProtection } from '@/utils/tdzProtection';

export default function TDZProtectionInitializer() {
  useEffect(() => {
    // Temporarily disabled due to conflicts with React 18
    // initializeTDZProtection();
  }, []);

  return null;
}