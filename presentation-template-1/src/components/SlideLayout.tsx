import { ReactNode } from 'react';
import { useExportMode } from '@/contexts/ExportContext';

interface SlideLayoutProps {
  children: ReactNode;
  direction?: number;
  /** Main title for the slide - renders in fixed position at top */
  title?: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Center content vertically in remaining space (default: false) */
  centerContent?: boolean;
}

export const SlideLayout = ({ children, title, subtitle, centerContent = false }: SlideLayoutProps) => {
  const { isExportMode } = useExportMode();

  return (
    <div
      className={`absolute inset-0 flex flex-col bg-primary-bg overflow-auto ${
        isExportMode
          ? 'px-[48px] py-[32px]'
          : 'px-[96px] pt-[96px] pb-[112px]'
      }`}
    >
      <div className="mx-auto w-full max-w-[1440px] flex flex-col h-full">
        {title && (
          <div className="flex-shrink-0 mb-10">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-3">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xl text-accent font-medium mb-3">
                {subtitle}
              </p>
            )}
            <div className="h-1 w-24 bg-accent rounded-full" />
          </div>
        )}

        <div className={`flex-1 flex flex-col ${
          title
            ? (centerContent ? 'justify-center' : 'justify-start')
            : 'justify-center'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
};
