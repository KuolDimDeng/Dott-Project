/**
 * Profile hook for accessing user profile data throughout the application
 * This is a thin wrapper around useUserProfile from UserProfileContext
 */
import UserProfileContext, { useUserProfile } from '@/contexts/UserProfileContext';
import { useContext } from 'react';

/**
 * Hook to access user profile data and related functionality
 * @returns {Object} Object containing:
 *   - profileData: The user profile data or null
 *   - loading: Boolean indicating if profile is being loaded
 *   - error: Any error message from profile fetching
 *   - fetchProfile: Function to refresh profile data
 *   - clearProfileCache: Function to clear cached profile data
 *   - isCacheValid: Function to check if cached profile is still valid
 */
export function useProfile() {
  return useUserProfile();
}

// Also export the original hook for compatibility
export { useUserProfile };

// Export default for any consumers that might use it
export default useProfile; 