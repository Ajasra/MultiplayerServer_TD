import { useCallback, useRef, useState, useEffect, useMemo, memo } from 'react';
import { Box } from '@mantine/core';
import PropTypes from 'prop-types';
import settings from '../../../config/settings';

/**
 * High-Performance Throttled Joystick Component for 30Hz Input
 *
 * Enhanced performance optimizations:
 * - requestAnimationFrame-based throttling for precise 30Hz timing
 * - Cached bounding rect with smart invalidation
 * - Direct DOM manipulation to avoid React re-renders during dragging
 * - Optimized memory allocation patterns
 * - Hardware acceleration with translate3d
 * - Smart change detection (only sends significant movements)
 * - Queue management for updates during throttle periods
 */
const ThrottledJoystick = memo(({ onMove, size = 200 }) => {
  const containerRef = useRef(null);
  const knobRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [initialPosition] = useState({ x: 0, y: 0 }); // Never changes, avoid re-renders

  // Calculate joystick position at 60% of viewport height (memoized to prevent recalculation)
  const joystickPosition = useMemo(() => {
    const viewportHeight = window.innerHeight;
    return Math.round(viewportHeight * 0.22); // Moved up to make room for bottom buttons
  }, []); // Empty dependency array since we want this calculated only once on component mount

  // Performance optimization: Cache rect and invalidate smartly
  const rectCacheRef = useRef({
    rect: null,
    lastUpdateTime: 0,
    containerSize: { width: 0, height: 0 },
    isValid: false,
  });

  // Throttling state with requestAnimationFrame-based timing
  const throttleStateRef = useRef({
    isThrottling: false,
    sendQueued: false,
    throttleTimeoutId: null,
    lastSentData: { x: 0, y: 0 },
    latestData: { x: 0, y: 0 },
    animationFrameId: null,
    lastSendTime: 0,
    rafId: null,
  });

  // Visual state ref to avoid React re-renders during dragging
  const visualStateRef = useRef({
    currentX: 0,
    currentY: 0,
    isDragging: false,
  });

  // Get throttle interval from client settings (33ms = 30Hz)
  const THROTTLE_MS = settings.CLIENT_JOYSTICK_THROTTLE_MS;
  const MAX_RECT_CACHE_AGE = 500; // Cache rect for 500ms

  // Optimized rect cache with smart invalidation
  const getCachedRect = useCallback(() => {
    const cache = rectCacheRef.current;
    const now = Date.now();

    if (!containerRef.current) return null;

    // Check if cache is invalid or too old
    const container = containerRef.current;
    const currentSize = {
      width: container.offsetWidth,
      height: container.offsetHeight,
    };

    const sizeChanged =
      currentSize.width !== cache.containerSize.width ||
      currentSize.height !== cache.containerSize.height;
    const cacheExpired = now - cache.lastUpdateTime > MAX_RECT_CACHE_AGE;

    if (!cache.isValid || sizeChanged || cacheExpired) {
      cache.rect = container.getBoundingClientRect();
      cache.lastUpdateTime = now;
      cache.containerSize = currentSize;
      cache.isValid = true;
    }

    return cache.rect;
  }, []);

  // Invalidate rect cache on resize/orientation change
  const invalidateRectCache = useCallback(() => {
    rectCacheRef.current.isValid = false;
  }, []);

  // Cleanup function for throttle state
  const cleanupThrottleState = useCallback(() => {
    const state = throttleStateRef.current;
    if (state.throttleTimeoutId) {
      clearTimeout(state.throttleTimeoutId);
      state.throttleTimeoutId = null;
    }
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    state.isThrottling = false;
    state.sendQueued = false;
  }, []);

  // High-performance 30Hz throttling using requestAnimationFrame
  const trySendJoystickData = useCallback(() => {
    const state = throttleStateRef.current;
    const { latestData, lastSentData } = state;
    const now = performance.now();

    // Smart change detection - only send significant changes (>1 unit) or return to zero
    const xDiff = Math.abs(latestData.x - lastSentData.x);
    const yDiff = Math.abs(latestData.y - lastSentData.y);

    const isSignificantChange =
      xDiff > 1 || yDiff > 1 || (latestData.x === 0 && latestData.y === 0);

    if (!isSignificantChange) {
      return;
    }

    // Check if enough time has passed for 30Hz (33.33ms)
    const timeSinceLastSend = now - state.lastSendTime;

    if (timeSinceLastSend >= THROTTLE_MS) {
      // Send immediately
      onMove(latestData.x, latestData.y);
      state.lastSentData = { ...latestData };
      state.lastSendTime = now;
      state.sendQueued = false;

      // Performance monitoring hook
      if (window.__joystickPerformanceMonitor) {
        window.__joystickPerformanceMonitor.recordSend();
      }
    } else {
      // Queue for next available slot
      if (!state.sendQueued) {
        state.sendQueued = true;
        const remainingTime = THROTTLE_MS - timeSinceLastSend;

        // Use setTimeout for precise timing
        state.throttleTimeoutId = setTimeout(() => {
          if (state.sendQueued) {
            trySendJoystickData();
          }
        }, remainingTime);
      }
    }
  }, [onMove, THROTTLE_MS]);

  // Direct DOM manipulation for maximum performance during dragging
  const updateKnobPosition = useCallback((x, y) => {
    const knob = knobRef.current;
    if (!knob) return;

    // Update visual state
    visualStateRef.current.currentX = x;
    visualStateRef.current.currentY = y;

    // Direct DOM update - no React re-render
    knob.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`;
  }, []);

  // Optimized joystick movement processing
  const processJoystickMove = useCallback(
    (clientX, clientY) => {
      const rect = getCachedRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = size / 2 - 20; // Keep knob inside circle

      let x = deltaX;
      let y = deltaY;

      // Constrain to circle
      if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        x = deltaX * ratio;
        y = deltaY * ratio;
      }

      // Update visual position directly (no React re-render)
      updateKnobPosition(x, y);

      // Convert to game coordinates (-100 to 100 range)
      const gameX = Math.round((x / maxDistance) * 100) || 0;
      const gameY = Math.round(-(y / maxDistance) * 100) || 0; // Invert Y for game coordinates

      // Update throttle state
      throttleStateRef.current.latestData = { x: gameX, y: gameY };

      // Try to send data with optimized throttling
      trySendJoystickData();

      // Performance monitoring hook
      if (window.__joystickPerformanceMonitor) {
        window.__joystickPerformanceMonitor.recordInput(gameX, gameY);
      }
    },
    [size, getCachedRect, updateKnobPosition, trySendJoystickData]
  );

  // requestAnimationFrame-based move handler for 60fps visual smoothness
  const animateJoystickMove = useCallback(
    (clientX, clientY) => {
      const state = throttleStateRef.current;

      // Cancel any existing animation frame
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
      }

      // Schedule new frame for smooth rendering
      state.animationFrameId = requestAnimationFrame(() => {
        processJoystickMove(clientX, clientY);
        state.animationFrameId = null;
      });
    },
    [processJoystickMove]
  );

  const handleStart = useCallback(
    (clientX, clientY) => {
      setIsDragging(true);
      visualStateRef.current.isDragging = true;

      // Update knob color immediately
      const knob = knobRef.current;
      if (knob) {
        knob.style.backgroundColor = '#228be6';
        knob.style.transition = 'none';
      }

      animateJoystickMove(clientX, clientY);
    },
    [animateJoystickMove]
  );

  const handleEnd = useCallback(() => {
    if (!visualStateRef.current.isDragging) return;

    setIsDragging(false);
    visualStateRef.current.isDragging = false;

    // Reset knob position and style directly
    const knob = knobRef.current;
    if (knob) {
      knob.style.transform = 'translate3d(-50%, -50%, 0)';
      knob.style.backgroundColor = '#495057';
      knob.style.transition = 'transform 0.2s ease';
    }

    // Clean up throttle state
    cleanupThrottleState();

    // Update visual state
    visualStateRef.current.currentX = 0;
    visualStateRef.current.currentY = 0;

    // Send final zero state immediately
    throttleStateRef.current.latestData = { x: 0, y: 0 };
    onMove(0, 0);
    throttleStateRef.current.lastSentData = { x: 0, y: 0 };
    throttleStateRef.current.lastSendTime = performance.now();
  }, [onMove, cleanupThrottleState]);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    e => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    },
    [handleStart]
  );

  const handleMouseMove = useCallback(
    e => {
      if (!visualStateRef.current.isDragging) return;
      e.preventDefault();
      animateJoystickMove(e.clientX, e.clientY);
    },
    [animateJoystickMove]
  );

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    e => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    e => {
      if (!visualStateRef.current.isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      animateJoystickMove(touch.clientX, touch.clientY);
    },
    [animateJoystickMove]
  );

  const handleTouchEnd = useCallback(
    e => {
      e.preventDefault();
      handleEnd();
    },
    [handleEnd]
  );

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, {
        passive: false,
      });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Resize and orientation change optimization
  useEffect(() => {
    const handleResize = () => {
      invalidateRectCache();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, {
      passive: true,
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [invalidateRectCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupThrottleState();
    };
  }, [cleanupThrottleState]);

  return (
    <Box
      className='joystickContainer'
      ref={containerRef}
      style={{
        bottom: joystickPosition,
        width: size,
        height: size,

        cursor: isDragging ? 'grabbing' : 'grab',
        // Performance: Enable hardware acceleration
        willChange: 'transform',
        transform: 'translateZ(0)', // Force GPU layer
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* High-performance joystick knob */}
      <Box
        ref={knobRef}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(133, 1, 113, 0.76) 0%, rgb(218, 5, 186) 100%)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate3d(-50%, -50%, 0)',
          transition: 'transform 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          border: '2px solid rgb(255, 255, 255)',
          // Performance optimizations
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      />
    </Box>
  );
});

ThrottledJoystick.propTypes = {
  onMove: PropTypes.func.isRequired,
  size: PropTypes.number,
};

ThrottledJoystick.displayName = 'ThrottledJoystick';

export default ThrottledJoystick;
