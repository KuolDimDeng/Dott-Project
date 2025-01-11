// src/components/CrispChat/CrispChatWrapper.jsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CrispChat from './CrispChat';

const CrispChatWrapper = () => {
  const { data: session } = useSession();
  return <CrispChat session={session} />;
};

export default CrispChatWrapper;