// Build-time stub for UserProfileContext
import React from 'react';

export function UserProfileProvider({ children }) {
  return React.createElement('div', null, children);
}

export function useUserProfile() {
  return {
    profile: null,
    isLoading: true,
  };
}

export default null; 