'use client';

import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function OfflineIndicator({ isOnline }) {
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2">
      <div className="flex items-center justify-center text-sm">
        <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
        <span>Offline Mode - Sales will sync when connected</span>
      </div>
    </div>
  );
}