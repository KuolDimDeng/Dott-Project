// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/signup/page.js

'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

// Simple loading component for dynamic import
const LoadingFallback = () => (
  <Box sx={{ 
    display: 'flex',
    justifyContent: 'center', 
    alignItems: 'center',
    height: '100vh',
    width: '100vw'
  }}>
    <CircularProgress />
  </Box>
);

// Dynamically import SignUp component with improved loading state
const SignUp = dynamic(() => import('./component/SignUp'), {
  loading: () => <LoadingFallback />
});

export default function SignUpPage() {
  return <SignUp />;
}