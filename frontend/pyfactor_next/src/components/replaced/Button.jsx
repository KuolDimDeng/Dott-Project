'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

// Button variants
const variants = {
  primary: 'bg-primary-main hover:bg-primary-dark text-white shadow-sm',
  secondary: 'bg-secondary-main hover:bg-secondary-dark text-white shadow-sm',
  outlined: 'bg-transparent border border-primary-main text-primary-main hover:bg-primary-main/5',
  text: 'bg-transparent text-primary-main hover:bg-primary-main/5',
  error: 'bg-error-main hover:bg-error-main/90 text-white shadow-sm',
  success: 'bg-success-main hover:bg-success-main/90 text-white shadow-sm',
  warning: 'bg-warning-main hover:bg-warning-main/90 text-white shadow-sm',
  info: 'bg-info-main hover:bg-info-main/90 text-white shadow-sm',
};

// Button sizes
const sizes = {
  small: 'px-2.5 py-1.5 text-xs',
  medium: 'px-4 py-2 text-sm',
  large: 'px-6 py-3 text-base',
};

const Button = forwardRef(({
  children,
  className = '',
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  startIcon,
  endIcon,
  disabled = false,
  type = 'button',
  onClick,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={twMerge(
        'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light',
        variants[variant] || variants.primary,
        sizes[size] || sizes.medium,
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className
      )}
      {...props}
    >
      {startIcon && <span className="mr-2 -ml-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-2 -mr-1">{endIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button; 