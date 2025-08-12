'use client';

import React from 'react';
import { Typography, Button } from '@/shared/components/ui';

export default function TestArchitecture() {
  return (
    <div className="p-8">
      <Typography variant="h4" gutterBottom>
        Domain Architecture Test Page
      </Typography>
      
      <Typography variant="body1" className="mb-4">
        If you can see this page with proper styling, the shared components are working correctly.
      </Typography>
      
      <Button variant="primary">
        Test Button Works
      </Button>
      
      <div className="mt-4 p-4 bg-green-100 rounded">
        <Typography variant="body2" color="primary">
          ✅ Shared components loaded successfully!
        </Typography>
      </div>
    </div>
  );
}
