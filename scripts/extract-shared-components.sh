#!/bin/bash

# 🧩 Extract Shared Components from Large Files
# This creates a reusable component library

echo "🧩 EXTRACTING SHARED COMPONENTS"
echo "==============================="

BASE_DIR="/Users/kuoldeng/projectx/frontend/pyfactor_next/src"
SHARED_UI="$BASE_DIR/shared/components/ui"

echo "📋 STEP 1: Extract Typography Component"
echo "======================================"

# Extract Typography component from ProductManagement.js
cat > "$SHARED_UI/Typography.js" << 'EOF'
'use client';

import React from 'react';

const Typography = ({ variant, component, className, color, children, gutterBottom, ...props }) => {
  let baseClasses = '';
  
  // Handle variants
  if (variant === 'h4' || (component === 'h1' && !variant)) {
    baseClasses = 'text-2xl font-bold';
  } else if (variant === 'h5') {
    baseClasses = 'text-xl font-semibold';
  } else if (variant === 'h6') {
    baseClasses = 'text-lg font-medium';
  } else if (variant === 'subtitle1' || variant === 'subtitle2') {
    baseClasses = 'text-sm font-medium';
  } else if (variant === 'body1') {
    baseClasses = 'text-base';
  } else if (variant === 'body2') {
    baseClasses = 'text-sm';
  }
  
  // Handle colors
  if (color === 'textSecondary') {
    baseClasses += ' text-gray-500';
  } else if (color === 'primary') {
    baseClasses += ' text-blue-600';
  } else if (color === 'error') {
    baseClasses += ' text-red-600';
  }
  
  // Handle gutterBottom
  if (gutterBottom) {
    baseClasses += ' mb-2';
  }
  
  const Tag = component || 'p';
  
  return (
    <Tag className={`${baseClasses} ${className || ''}`} {...props}>
      {children}
    </Tag>
  );
};

export { Typography };
EOF

echo "✅ Typography component extracted"

echo ""
echo "📋 STEP 2: Extract Tooltip Component"
echo "==================================="

# Extract FieldTooltip component
cat > "$SHARED_UI/Tooltip.js" << 'EOF'
'use client';

import React, { useState } from 'react';

const Tooltip = ({ text, position = 'top', children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)} // For mobile
        className="cursor-help"
      >
        {children || (
          <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Alias for backward compatibility
const FieldTooltip = Tooltip;

export { Tooltip, FieldTooltip };
EOF

echo "✅ Tooltip component extracted"

echo ""
echo "📋 STEP 3: Extract Button Component"
echo "=================================="

cat > "$SHARED_UI/Button.js" << 'EOF'
'use client';

import React from 'react';

const Button = ({ 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  children,
  onClick,
  ...props 
}) => {
  let baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size variants
  if (size === 'small') {
    baseClasses += ' px-3 py-1.5 text-sm';
  } else if (size === 'large') {
    baseClasses += ' px-6 py-3 text-lg';
  } else {
    baseClasses += ' px-4 py-2 text-base';
  }
  
  // Color variants
  if (variant === 'primary') {
    baseClasses += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
  } else if (variant === 'secondary') {
    baseClasses += ' bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
  } else if (variant === 'danger') {
    baseClasses += ' bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
  } else if (variant === 'outline') {
    baseClasses += ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500';
  }
  
  // Disabled state
  if (disabled || loading) {
    baseClasses += ' opacity-50 cursor-not-allowed';
  }
  
  return (
    <button
      className={`${baseClasses} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m15.84 7.02.707.707-1.414 1.414-.707-.707z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export { Button };
EOF

echo "✅ Button component extracted"

echo ""
echo "📋 STEP 4: Update Shared Components Index"
echo "========================================"

cat > "$SHARED_UI/index.js" << 'EOF'
// Shared UI Components Library
export { Typography } from './Typography';
export { Tooltip, FieldTooltip } from './Tooltip';
export { Button } from './Button';

// Additional components will be added as they are extracted:
// export { Input } from './Input';
// export { Modal } from './Modal';
// export { Table } from './Table';
EOF

echo "✅ Shared components index updated"

echo ""
echo "📋 STEP 5: Create Base API Service"
echo "================================="

cat > "$BASE_DIR/shared/services/apiService.js" << 'EOF'
'use client';

// Base API Service - Extracted from massive apiClient.js
class ApiService {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      credentials: 'include', // Important for session cookies
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`API Error [${options.method || 'GET'}] ${endpoint}:`, error.message);
      throw error;
    }
  }

  // HTTP method shortcuts
  async get(endpoint, params = {}) {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT', 
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiService = new ApiService();
EOF

echo "✅ Base API service created"

echo ""
echo "✅ SHARED COMPONENTS EXTRACTION COMPLETE"
echo "========================================"
echo ""
echo "📁 Created components:"
echo "   - shared/components/ui/Typography.js"
echo "   - shared/components/ui/Tooltip.js"
echo "   - shared/components/ui/Button.js"
echo "   - shared/services/apiService.js"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Test shared components import correctly"
echo "2. Run: ./scripts/extract-product-domain.sh"
echo "3. Update ProductManagement.js to use shared components"
echo ""
echo "📋 USAGE EXAMPLE:"
echo "   import { Typography, Tooltip, Button } from '@/shared/components/ui';"
echo "   import { apiService } from '@/shared/services';"