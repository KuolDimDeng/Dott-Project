'use client';

import { useEffect } from 'react';
import { initializeTDZProtection } from '@/utils/tdzProtection';

export default function TDZProtectionInitializer() {
  useEffect(() => {
    initializeTDZProtection();
  }, []);

  return null;
}