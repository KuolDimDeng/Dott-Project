'use client';

import React from 'react';
import StandardSpinner, { CenteredSpinner, ButtonSpinner } from './StandardSpinner';

/**
 * Examples of how to use the StandardSpinner component
 * Replace old spinner implementations with these patterns
 */
const SpinnerExamples = () => {
  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Standard Spinner Usage Examples</h2>
      
      {/* Example 1: Basic loading state */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">1. Basic Loading State (replaces simple animate-spin div)</h3>
        <div className="mb-2 text-sm text-gray-600">
          Replace: {`<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>`}
        </div>
        <StandardSpinner />
      </div>

      {/* Example 2: Centered loading in container */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">2. Centered Loading (for tables, lists, etc.)</h3>
        <div className="mb-2 text-sm text-gray-600">
          Replace loading divs with flex centering
        </div>
        <CenteredSpinner text="Loading products..." showText={true} />
      </div>

      {/* Example 3: Button loading state */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">3. Button Loading State</h3>
        <div className="mb-2 text-sm text-gray-600">
          Replace button spinners with ButtonSpinner component
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled>
          <ButtonSpinner text="Saving..." />
        </button>
      </div>

      {/* Example 4: Different sizes */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">4. Different Sizes</h3>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <StandardSpinner size="small" />
            <p className="text-xs mt-2">Small</p>
          </div>
          <div className="text-center">
            <StandardSpinner size="default" />
            <p className="text-xs mt-2">Default</p>
          </div>
          <div className="text-center">
            <StandardSpinner size="large" />
            <p className="text-xs mt-2">Large</p>
          </div>
          <div className="text-center">
            <StandardSpinner size="xl" />
            <p className="text-xs mt-2">XL</p>
          </div>
        </div>
      </div>

      {/* Example 5: Usage in loading states */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">5. Common Loading State Pattern</h3>
        <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
{`{isLoading ? (
  <CenteredSpinner size="large" minHeight="h-64" />
) : (
  // Your content here
)}`}
        </pre>
      </div>

      {/* Migration guide */}
      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-semibold mb-2">Migration Guide:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Import StandardSpinner or its variants</li>
          <li>Replace animate-spin divs with StandardSpinner component</li>
          <li>Use CenteredSpinner for centered loading states</li>
          <li>Use ButtonSpinner for button loading states</li>
          <li>All spinners now use consistent SVG-based design</li>
        </ul>
      </div>
    </div>
  );
};

export default SpinnerExamples;