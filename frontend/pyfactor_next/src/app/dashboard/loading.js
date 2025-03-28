'use client';

import React from 'react';
import { CircularProgress, Typography } from '@/components/ui/TailwindComponents';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <CircularProgress size="large" className="mb-6" />
      
      <Typography variant="h5" className="mb-2 text-center">
        Loading dashboard...
      </Typography>
      
      <Typography variant="body1" className="text-gray-600 text-center max-w-md">
        Please wait while we prepare your dashboard
      </Typography>
    </div>
  );
} 