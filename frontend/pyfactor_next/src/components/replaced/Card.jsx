'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

// Main Card component
const Card = forwardRef(({
  children,
  className = '',
  variant = 'elevation',
  elevation = 1,
  outlined = false,
  ...props
}, ref) => {
  const elevationClasses = {
    0: 'shadow-none',
    1: 'shadow-sm',
    2: 'shadow',
    3: 'shadow-md',
    4: 'shadow-lg',
    5: 'shadow-xl',
  };

  const cardClasses = twMerge(
    'rounded-lg overflow-hidden',
    variant === 'elevation' ? (elevationClasses[elevation] || elevationClasses[1]) : '',
    variant === 'outlined' || outlined ? 'border border-gray-200 dark:border-gray-700' : '',
    'bg-white dark:bg-gray-800',
    className
  );

  return (
    <div 
      ref={ref}
      className={cardClasses}
      {...props}
    >
      {children}
    </div>
  );
});

// Card Header component
const CardHeader = forwardRef(({
  title,
  subheader,
  avatar,
  action,
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={twMerge(
        'px-4 py-4 flex items-center',
        className
      )}
      {...props}
    >
      {avatar && (
        <div className="mr-3">
          {avatar}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
            {title}
          </h3>
        )}
        
        {subheader && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {subheader}
          </p>
        )}
        
        {children}
      </div>
      
      {action && (
        <div className="ml-4">
          {action}
        </div>
      )}
    </div>
  );
});

// Card Media component
const CardMedia = forwardRef(({
  component: Component = 'div',
  image,
  alt = '',
  height,
  children,
  className = '',
  ...props
}, ref) => {
  const mediaClasses = twMerge(
    'relative',
    height ? `h-${height}` : 'h-48',
    className
  );

  if (Component === 'img') {
    return (
      <Component
        ref={ref}
        src={image}
        alt={alt}
        className={twMerge('w-full object-cover', mediaClasses)}
        {...props}
      />
    );
  }

  return (
    <Component
      ref={ref}
      className={twMerge(mediaClasses, 'bg-cover bg-center')}
      style={{ backgroundImage: image ? `url(${image})` : undefined }}
      {...props}
    >
      {children}
    </Component>
  );
});

// Card Content component
const CardContent = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={twMerge('px-4 py-3', className)}
      {...props}
    >
      {children}
    </div>
  );
});

// Card Actions component
const CardActions = forwardRef(({
  children,
  disableSpacing = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={twMerge(
        'px-4 py-2 flex items-center',
        !disableSpacing && 'gap-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

// Display names for DevTools
Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardMedia.displayName = 'CardMedia';
CardContent.displayName = 'CardContent';
CardActions.displayName = 'CardActions';

export { Card, CardHeader, CardMedia, CardContent, CardActions }; 