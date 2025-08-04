/**
 * Cookie Helper Utilities
 * Extracted from AppBar for reusability
 */

export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    const cookieValue = parts.pop().split(';').shift();
    try {
      return decodeURIComponent(cookieValue);
    } catch (e) {
      return cookieValue;
    }
  }
  return null;
};

export const getBusinessNameFromCookies = () => {
  try {
    const businessNameCookie = getCookie('businessName');
    if (businessNameCookie) {
      return businessNameCookie;
    }

    // Check session storage
    const sessionBusinessName = sessionStorage.getItem('businessName');
    if (sessionBusinessName) {
      return sessionBusinessName;
    }

    // Check user data cookie
    const userDataCookie = getCookie('userData');
    if (userDataCookie) {
      try {
        const userData = JSON.parse(userDataCookie);
        if (userData?.business_name) {
          return userData.business_name;
        }
      } catch (e) {
        console.error('Error parsing userData cookie:', e);
      }
    }
  } catch (error) {
    console.error('Error getting business name:', error);
  }
  
  return null;
};

export const formatTenantId = (id) => {
  if (!id) return '';
  
  // Extract numeric part from tenant ID
  const match = id.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `ORG-${String(num).padStart(4, '0')}`;
  }
  
  return id;
};
