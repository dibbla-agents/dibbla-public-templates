import { SlideLayout } from '@/components/SlideLayout';
import { Package, RefreshCw, Wrench, Server, GraduationCap } from 'lucide-react';

export const SlidePricingModel = () => {
  return (
    <SlideLayout title="Pricing Model" centerContent>
      <div className="grid md:grid-cols-2 gap-16 w-full mb-16">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-accent/10 rounded-2xl">
              <Package className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">One-time fees</h2>
          </div>

          <div className="grid grid-cols-2 gap-5 pl-[76px] flex-1">
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Package className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold text-slate-900">Implementation</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                Project-based pricing agreed upfront, covering design, development, and deployment.
              </p>
              <p className="text-xs text-slate-400 italic">
                Scoped per engagement
              </p>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <GraduationCap className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold text-slate-900">Training Program</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                Structured training to build in-house capability and self-sufficiency.
              </p>
              <p className="text-xs text-slate-400 italic">
                Enables your team to operate independently
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-accent/10 rounded-2xl">
              <RefreshCw className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Recurring fees</h2>
          </div>

          <div className="grid grid-cols-2 gap-5 pl-[76px] flex-1">
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Wrench className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold text-slate-900">Support & Maintenance</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ongoing support with optional handover to your internal team.
              </p>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Server className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold text-slate-900">Platform License</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  <span>Cloud infrastructure and managed services</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full text-center">
        <p className="text-2xl md:text-3xl text-slate-900 leading-relaxed">
          Our approach delivers <span className="font-semibold text-accent">measurable ROI</span> within the first year of engagement
        </p>
      </div>
    </SlideLayout>
  );
};
