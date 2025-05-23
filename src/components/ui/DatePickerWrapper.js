import React from 'react';

const DatePickerWrapper = ({ 
  value, 
  onChange, 
  placeholder = "Select date",
  className = '',
  label,
  error = false,
  ...props 
}) => {
  // Convert date value to proper format for input[type="date"]
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date;
      // Otherwise try to parse and format
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
    }
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    }
    return '';
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (onChange) {
      // Return Date object or string based on original format
      if (value instanceof Date) {
        onChange(newValue ? new Date(newValue) : null);
      } else {
        onChange(newValue);
      }
    }
  };

  const inputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
    bg-white
  `;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        type="date"
        className={inputClasses}
        value={formatDateForInput(value)}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
};

export default DatePickerWrapper; 