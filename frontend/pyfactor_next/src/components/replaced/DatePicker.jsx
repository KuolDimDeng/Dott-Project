'use client';

import { forwardRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

const DatePicker = forwardRef(({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  min,
  max,
  helperText,
  error = false,
  required = false,
  fullWidth = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    
    // If the value is already in yyyy-MM-dd format, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    
    // Otherwise, try to parse it as a Date object
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={id}
          className={twMerge(
            'block mb-1 text-sm font-medium',
            error ? 'text-error-main' : 'text-gray-700 dark:text-gray-200'
          )}
        >
          {label}
          {required && <span className="ml-1 text-error-main">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="date"
          id={id}
          name={name}
          ref={ref}
          value={formatDate(value)}
          onChange={handleChange}
          onBlur={(e) => {
            setFocused(false);
            if (onBlur) onBlur(e);
          }}
          onFocus={() => setFocused(true)}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          className={twMerge(
            'block w-full rounded-md py-2 px-3 text-sm transition-colors duration-200 focus:outline-none',
            error 
              ? 'border-error-main focus:border-error-main focus:ring-error-main/20' 
              : 'border-gray-300 dark:border-gray-600 focus:border-primary-main focus:ring-primary-main/20',
            disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700',
            'date-input-custom',
            className
          )}
          {...props}
        />
      </div>
      
      {helperText && (
        <p className={twMerge(
          'mt-1 text-xs',
          error ? 'text-error-main' : 'text-gray-500 dark:text-gray-400'
        )}>
          {helperText}
        </p>
      )}
      
      <style jsx global>{`
        /* Custom styling for date input */
        .date-input-custom::-webkit-calendar-picker-indicator {
          filter: ${focused ? 'invert(0)' : 'invert(0.5)'};
          cursor: pointer;
        }
        
        .dark .date-input-custom::-webkit-calendar-picker-indicator {
          filter: ${focused ? 'invert(1)' : 'invert(0.7)'};
        }
      `}</style>
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker; 