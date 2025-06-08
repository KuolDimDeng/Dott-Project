'use client';

/**
 * React DatePicker Stub
 * 
 * This stub provides a mock implementation for the react-datepicker library
 * to prevent errors when the actual library is not available.
 */

import React from 'react';

// Basic stub component that mimics DatePicker
const DatePicker = (props) => {
  const { 
    selected, 
    onChange,
    placeholderText = "Select date",
    className = "",
    disabled = false,
    minDate,
    maxDate,
    showTimeSelect,
    dateFormat = "MM/dd/yyyy",
    ...rest
  } = props;

  // Format the date as a string (very simple implementation)
  const formatDate = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  // Display value
  const displayValue = selected ? formatDate(selected) : placeholderText;

  // Handle click
  const handleClick = () => {
    if (!disabled && onChange) {
      // Just set today's date when clicked
      onChange(new Date());
    }
  };

  return (
    <div 
      className={`datepicker-stub ${className}`}
      style={{ 
        position: 'relative',
        display: 'inline-block',
        width: '100%'
      }}
    >
      <input
        type="text"
        value={displayValue}
        onClick={handleClick}
        readOnly
        disabled={disabled}
        className="w-full h-9 border border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-gray-700"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        {...rest}
      />
    </div>
  );
};

// Add static properties and methods
DatePicker.registerLocale = () => {};
DatePicker.setDefaultLocale = () => {};

// Default export
export default DatePicker; 