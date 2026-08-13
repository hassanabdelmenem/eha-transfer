import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const useIdleTimeout = () => {
  const { user, logout } = useAuth();
  const timeoutRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    
    // Only set a timeout if a user is logged in
    if (user) {
      timeoutRef.current = window.setTimeout(async () => {
        try {
          await logout();
          // Optional: we could redirect or show a toast here, but logout itself usually forces navigation
        } catch (err) {
          console.error("Failed to logout on idle timeout:", err);
        }
      }, IDLE_TIMEOUT_MS);
    }
  }, [user, logout]);

  useEffect(() => {
    // Only attach event listeners if someone is logged in
    if (!user) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Attach listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer]);
};
