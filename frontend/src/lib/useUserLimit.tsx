import { useCallback } from 'react';

export function useUserLimit() {
  // Self-hosted unrestricted mode
  const checkLimit = useCallback(async (currentMessageCount?: number) => false, []);
  const handle429Error = useCallback(() => {}, []);

  return { 
    limitReached: false, 
    checkLimit, 
    Snackbar: null, 
    handle429Error, 
    messageLimit: 999999 
  };
}