'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-datepicker/dist/react-datepicker.css';

// Use dynamic import with ssr: false to prevent server-side rendering
const DatePicker = dynamic(() => import('react-datepicker'), {
  ssr: false,
});

/**
 * Client-side only wrapper for DatePicker to prevent SSR issues
 */
export default function DatePickerWrapper(props) {
  const [mounted, setMounted] = useState(false);

  // Only render after component is mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a placeholder while loading or when server-side rendering
  if (!mounted) {
    return (
      <div 
        className="w-full h-9 border border-gray-300 rounded-md bg-gray-50"
        style={{ minHeight: '38px' }}
      />
    );
  }

  // Pass all props to the DatePicker component
  return <DatePicker {...props} />;
} 