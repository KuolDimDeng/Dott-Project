'use client';

import React from 'react';
import POSSystemInline from './POSSystemInline';

/**
 * Wrapper component for POSSystem to be used in routing
 * Uses the inline version instead of modal
 */
const POSSystemWrapper = () => {
  return <POSSystemInline />;
};

export default POSSystemWrapper;