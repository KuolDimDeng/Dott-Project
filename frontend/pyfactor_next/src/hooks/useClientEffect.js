'use client';

import { useEffect, useLayoutEffect } from 'react';

// Use this hook instead of useLayoutEffect to avoid warnings on SSR
// It will use useLayoutEffect on the client and useEffect during SSR
export const useClientEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default useClientEffect;