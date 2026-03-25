import { useEffect, useCallback, useState } from 'react';

interface UseKeyboardNavigationProps {
  onNext: () => void;
  onPrev: () => void;
  isSelectMode?: boolean;
}

interface UseKeyboardNavigationReturn {
  isModifierHeld: boolean;
}

export const useKeyboardNavigation = ({ onNext, onPrev, isSelectMode = false }: UseKeyboardNavigationProps): UseKeyboardNavigationReturn => {
  const [isModifierHeld, setIsModifierHeld] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Track Cmd (Mac) / Ctrl (Windows) modifier key
    if (e.key === 'Meta' || e.key === 'Control') {
      setIsModifierHeld(true);
      return;
    }

    // Skip navigation when in select mode or modifier is held
    if (isSelectMode || e.metaKey || e.ctrlKey) {
      return;
    }

    // Prevent default for navigation keys
    if (['ArrowRight', 'ArrowLeft', ' ', 'Enter', 'Backspace'].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'Enter':
        onNext();
        break;
      case 'ArrowLeft':
      case 'Backspace':
        onPrev();
        break;
    }
  }, [onNext, onPrev, isSelectMode]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Release modifier key tracking
    if (e.key === 'Meta' || e.key === 'Control') {
      setIsModifierHeld(false);
    }
  }, []);

  // Handle window blur (e.g., user switches tabs while holding modifier)
  const handleBlur = useCallback(() => {
    setIsModifierHeld(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp, handleBlur]);

  return { isModifierHeld };
};
