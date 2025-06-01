// Build-time stub for next-auth/react
import React from 'react';

export function SessionProvider({ children }) {
  return React.createElement('div', null, children);
}

export function useSession() {
  return {
    data: null,
    status: 'loading',
    update: () => {},
  };
}

export function getSession() {
  return Promise.resolve(null);
}

export function getCsrfToken() {
  return Promise.resolve('');
}

export function getProviders() {
  return Promise.resolve({});
}

export function signIn() {
  return Promise.resolve({ ok: true });
}

export function signOut() {
  return Promise.resolve({ ok: true });
}

export default {
  SessionProvider,
  useSession,
  getSession,
  getCsrfToken,
  getProviders,
  signIn,
  signOut,
}; 