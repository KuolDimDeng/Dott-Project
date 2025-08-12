'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';

/**
 * UserAvatar - Profile avatar with subscription indicator
 * Memoized for performance
 */
const UserAvatar = memo(({ 
  userData,
  initials,
  size = 40,
  showSubscription = true,
  onClick
}) => {
  const subscriptionColor = showSubscription 
    ? getSubscriptionPlanColor(userData?.subscription_type) 
    : null;

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-center rounded-full
        transition-all duration-200 hover:scale-105
        ${subscriptionColor ? `ring-2 ring-${subscriptionColor}` : ''}
      `}
      style={{ width: size, height: size }}
      aria-label="User menu"
    >
      {userData?.profile_picture ? (
        <Image
          src={userData.profile_picture}
          alt="Profile"
          width={size}
          height={size}
          className="rounded-full object-cover"
          priority
        />
      ) : (
        <div 
          className={`
            flex items-center justify-center rounded-full
            bg-gradient-to-br from-blue-500 to-purple-600
            text-white font-semibold
          `}
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {initials || '??'}
        </div>
      )}
      
      {showSubscription && userData?.subscription_type && (
        <div 
          className={`
            absolute -bottom-1 -right-1 w-3 h-3 rounded-full
            bg-${subscriptionColor} border-2 border-white
          `}
          title={userData.subscription_type}
        />
      )}
    </button>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
