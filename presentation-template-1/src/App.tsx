import { useState, useCallback, useEffect } from 'react';
import { Download, MousePointer2 } from 'lucide-react';
import { SLIDES } from '@/slides';
import { Navigation } from '@/components/Navigation';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useSlideScaling, BASE_WIDTH, BASE_HEIGHT } from '@/hooks/useSlideScaling';
import { ExportProvider } from '@/contexts/ExportContext';

function App() {
  const isExportMode = new URLSearchParams(window.location.search).get('export') === 'true';
  const { scale } = useSlideScaling();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const nextSlide = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(s => s + 1);
    }
  }, [currentSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(s => s - 1);
    }
  }, [currentSlide]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(s => !s);
  }, []);

  const { isModifierHeld } = useKeyboardNavigation({ onNext: nextSlide, onPrev: prevSlide, isSelectMode });

  const isNavigationDisabled = isSelectMode || isModifierHeld;

  const CurrentSlideComponent = SLIDES[currentSlide].component;

  const effectiveScale = isExportMode ? 1 : scale;

  const [controlsVisible, setControlsVisible] = useState(true);

  const showControls = useCallback(() => {
    setControlsVisible(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [controlsVisible]);

  const handleDownloadPdf = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/presentation.pdf';
    link.download = 'presentation.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <ExportProvider isExportMode={isExportMode}>
      <div
        data-export-mode={isExportMode ? "true" : "false"}
        data-total-slides={SLIDES.length}
        className="relative h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans text-slate-900 selection:bg-accent selection:text-white"
        onMouseMove={showControls}
      >
        {/* Top Right Controls */}
        {!isExportMode && (
          <div className={`fixed top-8 right-8 flex items-center gap-3 z-[100] transition-all duration-500 ${
            controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
          }`}>
            <button
              onClick={() => toggleSelectMode()}
              title={isSelectMode ? 'Disable text selection' : 'Enable text selection (or hold \u2318/Ctrl)'}
              className={`p-3 backdrop-blur-xl border rounded-xl active:scale-95 transition-all select-none ${
                isSelectMode
                  ? 'bg-accent/20 border-accent/50 hover:bg-accent/30'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <MousePointer2 className={`w-5 h-5 pointer-events-none ${isSelectMode ? 'text-accent' : 'text-slate-400'}`} />
            </button>

            <button
              onClick={() => handleDownloadPdf()}
              title="Download PDF"
              className="p-6 bg-slate-100 backdrop-blur-xl border border-slate-300 rounded-3xl active:scale-95 hover:bg-slate-200 transition-all select-none"
            >
              <Download className="w-10 h-10 text-accent pointer-events-none" />
            </button>
          </div>
        )}
        {/* Centering wrapper */}
        <div
          style={{
            width: BASE_WIDTH * effectiveScale,
            height: BASE_HEIGHT * effectiveScale,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          className="overflow-hidden"
        >
          {/* Scaled slide frame: fixed 1920x1080 */}
          <div
            style={{
              width: BASE_WIDTH,
              height: BASE_HEIGHT,
              transform: `scale(${effectiveScale})`,
              transformOrigin: '0 0',
              touchAction: 'pan-y pinch-zoom',
              willChange: 'transform',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="absolute top-0 left-0 bg-primary-bg"
          >

          {/* Touch Navigation Overlays */}
          {!isExportMode && (
            <div className={`absolute inset-0 z-1 pointer-events-none flex ${isNavigationDisabled ? 'hidden' : ''}`}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="w-1/5 h-full pointer-events-auto cursor-w-resize"
                title="Previous Slide"
              />
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="flex-1 h-full pointer-events-auto cursor-e-resize"
                title="Next Slide"
              />
            </div>
          )}

          {/* Slide Content */}
          <CurrentSlideComponent key={SLIDES[currentSlide].id} />

          {/* Navigation */}
          {!isExportMode && (
            <Navigation
              currentSlide={currentSlide}
              totalSlides={SLIDES.length}
              onPrev={prevSlide}
              onNext={nextSlide}
              onGoTo={goToSlide}
            />
          )}
          </div>
        </div>
      </div>
    </ExportProvider>
  );
}

export default App;
