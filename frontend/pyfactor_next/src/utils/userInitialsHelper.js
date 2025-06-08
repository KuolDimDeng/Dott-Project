'use client';


/**
 * Helper utility to extract user initials from profile data
 * Only returns initials when valid user data is available
 */
export function extractUserInitials(userData) {
  if (!userData) return null;
  
  const firstName = userData.first_name || userData.firstName || userData.given_name;
  const lastName = userData.last_name || userData.lastName || userData.family_name;
  const email = userData.email;
  
  // If we have both first and last name, use their first letters
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  } 
  
  // If we have only first name, use its first letter
  else if (firstName) {
    return firstName.charAt(0).toUpperCase();
  } 
  
  // If we have only last name, use its first letter
  else if (lastName) {
    return lastName.charAt(0).toUpperCase();
  } 
  
  // If we have email, try to extract initials from it
  else if (email && email.includes('@')) {
    const namePart = email.split('@')[0];
    
    // If email has format like "first.last@domain.com"
    if (namePart.includes('.')) {
      const parts = namePart.split('.');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
      }
    }
    
    // Just use the first letter of the email
    return email.charAt(0).toUpperCase();
  }
  
  // If we don't have any valid user data, return null
  return null;
}

/**
 * Helper to safely get business name from user data
 * Returns empty string instead of default
 */
export function extractBusinessName(userData) {
  if (!userData) return '';
  
  return userData.businessName || userData.business_name || userData['custom:businessname'] || '';
}