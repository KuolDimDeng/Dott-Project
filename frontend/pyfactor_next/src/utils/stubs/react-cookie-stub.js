// Build-time stub for react-cookie
import React from 'react';

export function CookiesProvider({ children }) {
  return React.createElement('div', null, children);
}

export function useCookies() {
  return [
    {}, // cookies object
    () => {}, // setCookie function
    () => {} // removeCookie function
  ];
}

export const withCookies = (Component) => Component;

export default {
  CookiesProvider,
  useCookies,
  withCookies,
}; 