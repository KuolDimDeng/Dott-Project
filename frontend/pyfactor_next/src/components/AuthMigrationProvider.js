'use client';

import { useEffect } from 'react';
import { initializeAuthMigration } from '@/utils/authMigration';

/**
 * Client-side component to handle auth migration
 * Migrates from localStorage to secure cookies
 */
export default function AuthMigrationProvider({ children }) {
  useEffect(() => {
    // Initialize auth migration on client side only
    initializeAuthMigration();
  }, []);

  return children;
}