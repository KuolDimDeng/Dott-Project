'use client';

import { useState, useEffect } from 'react';

/**
 * Client-side only wrapper for DatePicker to prevent SSR issues
 * This is a stub implementation since react-datepicker is not available
 */
export default function DatePickerWrapper(props) {
  const [mounted, setMounted] = useState(false);

  // Only render after component is mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Access any props that would normally be passed to DatePicker
  const { 
    selected, 
    onChange, 
    placeholderText = "Select a date...",
    className = ""
  } = props;

  // Display a date if one is selected
  const displayValue = selected ? new Date(selected).toLocaleDateString() : placeholderText;

  // Render a basic input that looks like a date picker
  return (
    <div className={`datepicker-stub ${className}`}>
      <div 
        className="w-full h-9 border border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-gray-700"
        onClick={() => onChange && onChange(new Date())}
      >
        {displayValue}
      </div>
    </div>
  );
} 