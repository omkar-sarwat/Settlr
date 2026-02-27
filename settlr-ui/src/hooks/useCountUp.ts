/**
 * useCountUp Hook
 * 
 * Makes numbers count up from 0 when they first appear on screen.
 * Great for showing balances, stats, and amounts with visual impact.
 * 
 * Example:
 *   const displayAmount = useCountUp(24500, 1000);
 *   // displayAmount will animate from 0 to 24500 over 1 second
 * 
 * @param target - The final number to count to
 * @param duration - How long the animation should take in milliseconds (default 1000ms)
 * @returns The current animated number value
 */

import { useEffect, useState, useRef } from 'react';

export function useCountUp(target: number, duration: number = 1000): number {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    // Reset start time when target changes
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      // Record the start time on first frame
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      
      // Calculate progress (0 to 1)
      const progress = Math.min(
        (timestamp - startTimeRef.current) / duration, 
        1
      );
      
      // Ease out cubic — fast at start, slows at end
      // This makes the counting feel more natural
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Update the displayed count
      setCount(Math.floor(eased * target));

      // Continue animating if not finished
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount or when target/duration changes
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}
