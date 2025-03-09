'use client';

import TestAuth from '@/test-auth';

export default function TestAuthPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Auth Configuration Test Page</h1>
      <TestAuth />
    </div>
  );
}