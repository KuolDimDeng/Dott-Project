// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/signup/page.js

'use client';

import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner'; // Create this if you haven't

// Dynamically import SignUp component
const SignUp = dynamic(() => import('./component/SignUp'), {
  loading: () => <LoadingSpinner />
});

export default function SignUpPage() {
  return <SignUp />;
}