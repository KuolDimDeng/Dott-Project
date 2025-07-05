import React from 'react';
import { useToast } from '@/components/Toast/ToastProvider';

function ConsoleMessages({ backgroundColor = 'bg-gray-100 dark:bg-gray-800' }) {
  // No longer using messages from context as toast notifications are displayed automatically
  // This component can now be simplified or even removed if not needed
  
  return (
    <div className={`flex items-center p-4 h-full overflow-hidden ${backgroundColor}`}>
      <p className="text-blue-800 dark:text-blue-300 whitespace-nowrap overflow-hidden text-ellipsis font-normal">
        Console messages now use toast notifications
      </p>
    </div>
  );
}

export default ConsoleMessages;