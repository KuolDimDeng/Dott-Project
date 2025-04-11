'use client';

// This file is a redirect to the correct AuthContext implementation
// to avoid import errors in files that still import from this path
import { AuthProvider, useAuthContext, useAuth } from '../contexts/AuthContext';

export { AuthProvider, useAuthContext, useAuth };
export { default } from '../contexts/AuthContext';