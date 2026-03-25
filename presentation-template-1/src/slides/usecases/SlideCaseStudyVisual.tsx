import { SlideLayout } from '@/components/SlideLayout';
import { BarChart3, Clock, TrendingDown } from 'lucide-react';

export const SlideCaseStudyVisual = () => {
  return (
    <SlideLayout
      title="Supply Chain Optimization"
      subtitle="Global Manufacturing Client"
      centerContent
    >
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center">
          <div className="p-4 bg-accent/10 rounded-xl inline-block mb-4">
            <Clock className="w-10 h-10 text-accent" />
          </div>
          <div className="text-4xl font-bold text-accent mb-2">60%</div>
          <p className="text-lg font-semibold text-slate-900 mb-1">Faster Processing</p>
          <p className="text-sm text-slate-500">Order-to-delivery cycle time reduced from 14 to 5.6 days</p>
        </div>

        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center">
          <div className="p-4 bg-accent/10 rounded-xl inline-block mb-4">
            <TrendingDown className="w-10 h-10 text-accent" />
          </div>
          <div className="text-4xl font-bold text-accent mb-2">35%</div>
          <p className="text-lg font-semibold text-slate-900 mb-1">Cost Reduction</p>
          <p className="text-sm text-slate-500">Operational costs decreased through automated workflows</p>
        </div>

        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center">
          <div className="p-4 bg-accent/10 rounded-xl inline-block mb-4">
            <BarChart3 className="w-10 h-10 text-accent" />
          </div>
          <div className="text-4xl font-bold text-accent mb-2">99.7%</div>
          <p className="text-lg font-semibold text-slate-900 mb-1">Accuracy Rate</p>
          <p className="text-sm text-slate-500">Inventory forecasting precision improved significantly</p>
        </div>
      </div>
    </SlideLayout>
  );
};
