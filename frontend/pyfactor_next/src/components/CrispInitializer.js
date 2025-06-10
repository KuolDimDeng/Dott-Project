'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CrispInitializer() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if we're coming from logout with preserved Crisp data
    const crispEmail = searchParams.get('crispEmail');
    const crispNickname = searchParams.get('crispNickname');
    
    if (window.$crisp && (crispEmail || crispNickname)) {
      // Re-initialize Crisp with preserved user data
      if (crispEmail) {
        window.$crisp.push(['set', 'user:email', crispEmail]);
      }
      if (crispNickname) {
        window.$crisp.push(['set', 'user:nickname', crispNickname]);
      }
      
      console.log('[CrispInitializer] Restored Crisp session data');
    }
  }, [searchParams]);
  
  return null;
}
