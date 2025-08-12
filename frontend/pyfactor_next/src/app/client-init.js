'use client';

import { useEffect } from 'react';
import '@/utils/bindPolyfill';
import { loadCloudflareAnalytics } from '@/utils/cloudflareAnalytics';

export function ClientInit() {
  useEffect(() => {
    // Load Cloudflare analytics safely
    loadCloudflareAnalytics();
  }, []);
  
  return null;
}
