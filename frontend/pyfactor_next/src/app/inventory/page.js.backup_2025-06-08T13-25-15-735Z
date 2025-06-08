'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import UnifiedInventoryList from './components/UnifiedInventoryList';

/**
 * Main Inventory Page
 * Uses the unified inventory list component for enhanced product management
 * Handles URL parameters for actions like creating a new product
 */
export default function InventoryPage() {
  const searchParams = useSearchParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  useEffect(() => {
    // Check if we should show the create form
    const action = searchParams.get('action');
    if (action === 'create') {
      setShowCreateForm(true);
    }
  }, [searchParams]);
  
  return <UnifiedInventoryList initialCreateForm={showCreateForm} />;
} 