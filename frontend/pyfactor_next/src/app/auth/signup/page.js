// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/signup/page.js

'use client';

import dynamic from 'next/dynamic';
import { CircularProgress } from '@/components/ui/TailwindComponents';

// Simple loading component for dynamic import
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen w-screen">
    <CircularProgress />
  </div>
);

// Dynamically import SignUp component with improved loading state
const SignUp = dynamic(() => import('./component/SignUp'), {
  loading: () => <LoadingFallback />
});

export default function SignUpPage() {
  return <SignUp />;
}