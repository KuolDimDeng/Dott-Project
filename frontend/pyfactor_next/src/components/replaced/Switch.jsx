'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Switch = forwardRef(({
  id,
  name,
  checked = false,
  onChange,
  disabled = false,
  label,
  labelPlacement = 'end',
  size = 'medium',
  className = '',
  ...props
}, ref) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  // Size variants
  const sizeClasses = {
    small: {
      switch: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translateX: 'translate-x-4',
    },
    medium: {
      switch: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translateX: 'translate-x-5',
    },
    large: {
      switch: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translateX: 'translate-x-7',
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.medium;

  const switchClasses = twMerge(
    'relative inline-flex items-center flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2',
    currentSize.switch,
    checked 
      ? 'bg-primary-main' 
      : 'bg-gray-200 dark:bg-gray-700',
    disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'cursor-pointer',
    className
  );

  const thumbClasses = twMerge(
    'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
    currentSize.thumb,
    checked ? currentSize.translateX : 'translate-x-0',
    disabled ? 'opacity-80' : ''
  );

  const containerClasses = twMerge(
    'inline-flex items-center',
    labelPlacement === 'start' ? 'flex-row-reverse' : 'flex-row',
    labelPlacement === 'top' ? 'flex-col-reverse' : '',
    labelPlacement === 'bottom' ? 'flex-col' : ''
  );

  const labelClasses = twMerge(
    'text-sm font-medium text-gray-700 dark:text-gray-300',
    labelPlacement === 'start' ? 'mr-2' : '',
    labelPlacement === 'end' ? 'ml-2' : '',
    labelPlacement === 'top' ? 'mb-1' : '',
    labelPlacement === 'bottom' ? 'mt-1' : '',
    disabled ? 'opacity-50' : ''
  );

  return (
    <div className={containerClasses}>
      {label && (
        <label 
          htmlFor={id} 
          className={labelClasses}
          onClick={(e) => {
            if (!disabled) {
              e.preventDefault();
              const newEvent = {
                target: {
                  checked: !checked,
                  name,
                }
              };
              handleChange(newEvent);
            }
          }}
        >
          {label}
        </label>
      )}
      
      <button 
        type="button"
        role="switch"
        id={id}
        name={name}
        ref={ref}
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          if (!disabled) {
            const newEvent = {
              target: {
                checked: !checked,
                name,
              }
            };
            handleChange(newEvent);
          }
        }}
        className={switchClasses}
        {...props}
      >
        <span 
          aria-hidden="true" 
          className={thumbClasses}
        />
      </button>
    </div>
  );
});

Switch.displayName = 'Switch';

export default Switch; 