import { useCallback } from 'react';

/**
 * useErrorBoundary Hook
 *
 * Simple hook to manually trigger error boundaries for catastrophic errors.
 * For most errors, use useErrorNotification instead.
 *
 * Usage:
 * const throwError = useErrorBoundary();
 *
 * // Only use this for truly catastrophic errors that should crash the component
 * if (criticalSystemFailure) {
 *   throwError(new Error('Critical system failure'));
 * }
 */
function useErrorBoundary() {
  /**
   * Throw an error to trigger the nearest error boundary
   * Only use this for catastrophic errors that should crash the component tree
   */
  const throwError = useCallback(error => {
    console.error('Manually triggering error boundary:', error);
    throw error;
  }, []);

  return throwError;
}

export default useErrorBoundary;
