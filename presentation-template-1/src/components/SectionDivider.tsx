interface SectionDividerProps {
  title: string;
  subtitle?: string;
  direction?: number;
}

export const SectionDivider = ({ title, subtitle }: SectionDividerProps) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card-bg">
      <div className="relative z-10 text-center">
        {/* Decorative line */}
        <div className="h-[2px] w-20 bg-accent mx-auto mb-8" />

        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-6 text-xl text-slate-400 font-light">
            {subtitle}
          </p>
        )}

        {/* Decorative line */}
        <div className="h-[2px] w-20 bg-accent mx-auto mt-8" />
      </div>
    </div>
  );
};
