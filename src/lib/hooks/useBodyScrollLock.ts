'use client';

import { useEffect } from 'react';

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Save previous styles
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalPosition = document.body.style.position;

    // Apply lock
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      // Restore previous styles
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.position = originalPosition;
    };
  }, [isLocked]);
}
