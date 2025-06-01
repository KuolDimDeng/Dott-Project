// Build-time stub for @auth0/nextjs-auth0
import React from 'react';

export function Auth0Provider({ children }) {
  return React.createElement('div', null, children);
}

export function useUser() {
  return {
    user: null,
    isLoading: true,
    error: null,
  };
}

export function withAuthenticationRequired(Component) {
  return Component;
}

export function withPageAuthRequired(getServerSideProps) {
  return getServerSideProps || (() => ({ props: {} }));
}

// Server-side exports
export const handleAuth = () => ({});
export const handleLogin = () => ({});
export const handleLogout = () => ({});
export const handleCallback = () => ({});
export const handleProfile = () => ({});

export default {
  Auth0Provider,
  useUser,
  withAuthenticationRequired,
  withPageAuthRequired,
  handleAuth,
  handleLogin,
  handleLogout,
  handleCallback,
  handleProfile,
}; 