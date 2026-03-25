import { SlideLayout } from '@/components/SlideLayout';
import { TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';

export const SlideOpportunity = () => {
  return (
    <SlideLayout title="The Opportunity" centerContent>
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-start gap-6">
          <div className="p-4 bg-accent/10 rounded-xl flex-shrink-0">
            <TrendingUp className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Market conditions are <span className="text-accent">rapidly evolving</span>
            </h3>
            <p className="text-xl text-slate-600 leading-relaxed">
              Organizations that modernize their operations now will gain a significant competitive advantage in the next 3-5 years.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-6">
          <div className="p-4 bg-amber-100 rounded-xl flex-shrink-0">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">The challenge</h3>
            <ul className="space-y-2 text-xl text-slate-600">
              <li className="flex items-start gap-3">
                <span className="text-amber-600 mt-1.5">•</span>
                <span>Legacy systems create <span className="text-slate-900 font-semibold">operational bottlenecks</span></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 mt-1.5">•</span>
                <span>Fragmented processes lead to <span className="text-slate-900 font-semibold">inefficiency and risk</span></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 mt-1.5">•</span>
                <span>Without a unified strategy, growth creates <span className="text-slate-900 font-semibold">increasing complexity</span></span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center pt-2">
          <ArrowRight className="w-6 h-6 text-accent mr-4 flex-shrink-0" />
          <p className="text-2xl text-slate-800 leading-snug">
            <span className="text-accent font-semibold">NovaTech</span> provides a proven framework for
            <span className="text-accent font-semibold"> modernizing</span>,
            <span className="text-accent font-semibold"> integrating</span>, and
            <span className="text-accent font-semibold"> scaling</span> your operations
            — with enterprise-grade reliability.
          </p>
        </div>
      </div>
    </SlideLayout>
  );
};
