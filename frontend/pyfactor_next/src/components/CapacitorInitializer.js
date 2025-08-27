'use client';

import { useEffect } from 'react';
import { initializeApp } from '@/utils/capacitor';

export default function CapacitorInitializer() {
  useEffect(() => {
    // Initialize Capacitor app when running on mobile
    initializeApp().catch(err => {
      console.error('Failed to initialize Capacitor:', err);
    });
  }, []);

  return null;
}