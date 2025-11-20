import { useWindowDimensions, ScaledSize } from 'react-native';
import { useState, useEffect } from 'react';

export function useDebouncedWindowDimensions(delay: number): ScaledSize {
  const { width, height, scale, fontScale } = useWindowDimensions();
  const [debouncedDimensions, setDebouncedDimensions] = useState<ScaledSize>({
    width,
    height,
    scale,
    fontScale,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDimensions({ width, height, scale, fontScale });
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [width, height, scale, fontScale, delay]);

  return debouncedDimensions;
}
