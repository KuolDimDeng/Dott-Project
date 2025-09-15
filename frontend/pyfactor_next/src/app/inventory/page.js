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
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    // Check if we should show the create form
    const action = searchParams.get('action');
    const prefillParam = searchParams.get('prefill');

    if (action === 'create') {
      setShowCreateForm(true);

      // Parse prefill data if provided
      if (prefillParam) {
        try {
          const data = JSON.parse(decodeURIComponent(prefillParam));
          setPrefillData(data);
        } catch (error) {
          console.error('Error parsing prefill data:', error);
        }
      }
    }
  }, [searchParams]);

  return <UnifiedInventoryList initialCreateForm={showCreateForm} prefillData={prefillData} />;
} 