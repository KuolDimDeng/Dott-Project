import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Decrypt function (matches the one in session route)
function decrypt(text) {
  try {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.SESSION_SECRET || 'dott-secret-key-2024-production-v1-encrypted32', 'utf8').slice(0, 32);
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Decrypt] Error:', error);
    return null;
  }
}

export default async function AuthProtectedLayout({ children }) {
  // Get session from cookies
  let session = null;
  
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('dott_auth_session');
    
    if (sessionCookie?.value) {
      const decryptedData = decrypt(sessionCookie.value);
      if (decryptedData) {
        session = JSON.parse(decryptedData);
        console.log('[AuthProtectedLayout] Session found:', {
          hasUser: !!session.user,
          needsOnboarding: session.user?.needsOnboarding,
          tenantId: session.user?.tenantId
        });
      }
    }
  } catch (error) {
    console.error('[AuthProtectedLayout] Failed to get session:', error);
  }
  
  if (!session || !session.user) {
    // No session, redirect to login
    console.log('[AuthProtectedLayout] No session found, redirecting to login');
    redirect('/auth/signin');
  }
  
  // Check onboarding status from session
  const needsOnboarding = session.user?.needsOnboarding || session.user?.needs_onboarding;
  const tenantId = session.user?.tenantId || session.user?.tenant_id;
  
  if (needsOnboarding === true || !tenantId) {
    // User needs to complete onboarding
    console.log('[AuthProtectedLayout] User needs onboarding, redirecting');
    redirect('/onboarding');
  }
  
  // If user has a tenant, redirect to tenant-specific dashboard
  if (tenantId) {
    console.log('[AuthProtectedLayout] Redirecting to tenant dashboard:', tenantId);
    redirect(`/tenant/${tenantId}/dashboard`);
  }
  
  // Session exists and onboarding is completed
  return <>{children}</>;
}