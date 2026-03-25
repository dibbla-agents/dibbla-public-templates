import { SlideLayout } from '@/components/SlideLayout';

export const Slide00Start = () => {
  return (
    <SlideLayout>
      <div className="flex flex-col items-center justify-center text-center space-y-12">
        {/* Logo */}
        <div className="w-48 md:w-64 text-accent">
          <svg
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
          >
            <rect x="10" y="10" width="100" height="100" rx="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="3" />
            <path d="M35 60 L55 80 L85 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        {/* Text */}
        <div className="space-y-6">
          <h1 className="text-6xl md:text-8xl font-bold text-slate-900 tracking-tight">
            NovaTech Solutions
          </h1>
          <div className="flex items-center justify-center space-x-4">
            <div className="h-px w-12 bg-accent" />
            <h2 className="text-2xl md:text-3xl font-medium text-accent uppercase tracking-[0.2em]">
              Company Presentation
            </h2>
            <div className="h-px w-12 bg-accent" />
          </div>
          <p className="text-lg md:text-xl text-slate-500 font-light tracking-widest mt-6">
            March 2026
          </p>
        </div>
      </div>
    </SlideLayout>
  );
};
