import { useState, useEffect, useCallback } from 'react';

// Base slide dimensions (16:9 aspect ratio)
export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

interface SlideScaling {
  scale: number;
  baseWidth: number;
  baseHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportRatio: number;
}

export function useSlideScaling(): SlideScaling {
  const [scale, setScale] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(1920);
  const [viewportHeight, setViewportHeight] = useState(1080);

  const calculateScale = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaleX = vw / BASE_WIDTH;
    const scaleY = vh / BASE_HEIGHT;
    // Use the smaller scale to ensure the slide fits entirely within the viewport
    setScale(Math.min(scaleX, scaleY));
    setViewportWidth(vw);
    setViewportHeight(vh);
  }, []);

  useEffect(() => {
    // Calculate initial scale
    calculateScale();

    // Recalculate on window resize
    window.addEventListener('resize', calculateScale);
    
    // Specifically handle orientation changes with a slight delay
    // to allow Safari to finish updating the viewport (address bar etc)
    const handleOrientationChange = () => {
      setTimeout(calculateScale, 100);
      setTimeout(calculateScale, 300); // Second pass to be sure
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', calculateScale);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [calculateScale]);

  return {
    scale,
    baseWidth: BASE_WIDTH,
    baseHeight: BASE_HEIGHT,
    viewportWidth,
    viewportHeight,
    viewportRatio: viewportWidth / viewportHeight,
  };
}
