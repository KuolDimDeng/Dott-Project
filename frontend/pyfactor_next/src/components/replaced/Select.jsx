'use client';

import { forwardRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

const Select = forwardRef(({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  helperText,
  error = false,
  required = false,
  fullWidth = false,
  disabled = false,
  placeholder = 'Select an option',
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
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
        <select
          id={id}
          name={name}
          ref={ref}
          value={value || ''}
          onChange={handleChange}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          onFocus={() => setIsFocused(true)}
          disabled={disabled}
          required={required}
          className={twMerge(
            'block w-full rounded-md py-2 pl-3 pr-10 text-sm transition-colors duration-200 focus:outline-none appearance-none',
            error 
              ? 'border-error-main focus:border-error-main focus:ring-error-main/20' 
              : 'border-gray-300 dark:border-gray-600 focus:border-primary-main focus:ring-primary-main/20',
            disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      
      {helperText && (
        <p className={twMerge(
          'mt-1 text-xs',
          error ? 'text-error-main' : 'text-gray-500 dark:text-gray-400'
        )}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select; 