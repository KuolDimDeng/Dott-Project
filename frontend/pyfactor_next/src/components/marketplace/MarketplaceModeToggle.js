'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Briefcase } from 'lucide-react';

const MarketplaceModeToggle = ({ currentMode, onModeChange }) => {
  const [mode, setMode] = useState(currentMode || 'business');

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
    // Save to localStorage
    localStorage.setItem('marketplaceMode', newMode);
  };

  useEffect(() => {
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem('marketplaceMode');
    if (savedMode && savedMode !== mode) {
      setMode(savedMode);
      if (onModeChange) {
        onModeChange(savedMode);
      }
    }
  }, []);

  return (
    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleModeChange('business')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
          mode === 'business'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Briefcase className="w-4 h-4" />
        <span className="font-medium">Business</span>
      </button>
      <button
        onClick={() => handleModeChange('consumer')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
          mode === 'consumer'
            ? 'bg-white text-green-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <ShoppingBag className="w-4 h-4" />
        <span className="font-medium">Consumer</span>
      </button>
    </div>
  );
};

export default MarketplaceModeToggle;