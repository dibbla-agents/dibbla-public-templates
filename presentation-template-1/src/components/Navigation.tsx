import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AUTO_HIDE_DELAY = 3000;

interface NavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
}

export const Navigation = ({
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
  onGoTo
}: NavigationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const showControls = useCallback(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    showControls();
  }, [currentSlide, showControls]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);

    const handleMouseMove = () => {
      showControls();
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isVisible, showControls]);

  return (
    <div data-total-slides={totalSlides} className="absolute bottom-0 left-0 w-full p-[48px] flex justify-between items-center z-10 pointer-events-none">
      {/* Progress dots */}
      <div className="flex items-center gap-6 pointer-events-auto">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => onGoTo(i)}
              className={`h-1.5 rounded-full transition-all duration-500 hover:scale-125 active:scale-90 ${
                i === currentSlide
                  ? 'w-8 bg-accent'
                  : 'w-1.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right side controls - auto-hides */}
      <div
        className={`flex items-center gap-3 pointer-events-auto transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 bg-slate-50 backdrop-blur-md border border-slate-200 rounded-full p-1">
          <button
            onClick={onPrev}
            disabled={currentSlide === 0}
            className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-slate-400 hover:text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-[50px] text-center font-mono text-[10px] text-slate-300">
            <span className="text-slate-400">{String(currentSlide + 1).padStart(2, '0')}</span>
            <span className="mx-0.5 text-slate-200">/</span>
            <span className="text-slate-300">{String(totalSlides).padStart(2, '0')}</span>
          </div>
          <button
            onClick={onNext}
            disabled={currentSlide === totalSlides - 1}
            className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-slate-400 hover:text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
