import { useState, useCallback } from 'react';
import { getUserLimits } from './api';

export function useUserLimit() {
  const [limitReached, setLimitReached] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [messageLimit, setMessageLimit] = useState<number | null>(null);

  // Always fetch the latest limit from the backend on every check
  const checkLimit = useCallback(async (currentCount: number) => {
    try {
      const data = await getUserLimits();
      setMessageLimit(data.messageLimit);
      if (data.messageLimit !== null && currentCount >= data.messageLimit) {
        setLimitReached(true);
        setShowSnackbar(true);
        return true;
      }
      setLimitReached(false);
      return false;
    } catch {
      setLimitReached(false);
      return false;
    }
  }, []);

  // Call this in catch block if backend returns 429
  const handle429Error = useCallback(() => {
    setLimitReached(true);
    setShowSnackbar(true);
  }, []);

  const Snackbar = showSnackbar ? (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-400 text-yellow-900 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
      <span>Usage limit reached. Please upgrade to continue using premium features.</span>
      <button
        className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        onClick={() => { setShowSnackbar(false); window.location.href = '/paynow'; }}
      >
        Upgrade Now
      </button>
      <button
        className="ml-2 text-yellow-900 hover:text-yellow-700 text-lg font-bold"
        onClick={() => setShowSnackbar(false)}
      >
        ×
      </button>
    </div>
  ) : null;

  return { limitReached, checkLimit, Snackbar, handle429Error, messageLimit };
}