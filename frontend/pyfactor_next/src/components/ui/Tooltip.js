'use client';


import React, { useState } from 'react';
import FloatingUIWrapper from './FloatingUIWrapper';

/**
 * A tooltip component that uses Floating UI with dynamic imports
 */
export default function Tooltip({ children, content, placement = 'top', className = '' }) {
  // Use React.cloneElement later to attach event handlers to the child element
  if (!children || React.Children.count(children) !== 1) {
    console.warn('Tooltip component requires exactly one child element');
    return children || null;
  }

  // We use the render prop pattern to access the dynamically loaded FloatingUI module
  return (
    <FloatingUIWrapper 
      fallback={children} // Show the children without tooltip functionality while loading
    >
      {(ui) => <TooltipContent 
        ui={ui} 
        content={content} 
        placement={placement} 
        className={className}
      >
        {children}
      </TooltipContent>}
    </FloatingUIWrapper>
  );
}

// The actual tooltip implementation using the dynamically loaded Floating UI
function TooltipContent({ children, content, ui, placement, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    useFloating, 
    offset, 
    flip, 
    shift,
    useHover,
    useFocus,
    useDismiss,
    useRole,
    useInteractions,
    FloatingPortal
  } = ui;

  // Configure floating UI
  const { refs, floatingStyles, context } = useFloating({
    placement,
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(8), // Space between reference and floating element
      flip(), // Flip to the opposite side if there's not enough space
      shift() // Shift along the reference element if there's not enough space
    ]
  });

  // Set up interactions (hover, focus, etc.)
  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover, focus, dismiss, role
  ]);

  // Clone the child element to add our ref and event handlers
  const childElement = React.cloneElement(
    children,
    {
      ref: refs.setReference,
      ...getReferenceProps()
    }
  );

  return (
    <>
      {childElement}
      
      {/* Only render the tooltip when it's open */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={`bg-gray-800 text-white text-sm rounded px-2 py-1 max-w-xs z-50 ${className}`}
            {...getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
} 