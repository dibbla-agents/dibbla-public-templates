import { SlideLayout } from '@/components/SlideLayout';

export const Slide01WhoWeAre = () => {
  return (
    <SlideLayout title="Who We Are" centerContent>
      <div className="space-y-10 max-w-5xl">
        <p className="text-2xl md:text-3xl text-slate-800 leading-relaxed">
          We are a team of <span className="text-accent font-semibold">experienced consultants
          and engineers</span> with deep expertise in digital transformation,
          enterprise software, and operational excellence.
        </p>

        <p className="text-2xl md:text-3xl text-slate-800 leading-relaxed">
          We deliver <span className="text-accent font-semibold">tailored solutions
          and strategic advisory</span> to companies navigating complex technology landscapes.
        </p>

        <p className="text-2xl md:text-3xl text-slate-800 leading-relaxed">
          Our team has a proven track record working with <span className="text-accent font-semibold">Fortune 500 companies</span> to
          drive measurable business outcomes through technology-led innovation.
        </p>
      </div>
    </SlideLayout>
  );
};
