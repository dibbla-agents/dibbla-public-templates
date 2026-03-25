import { SlideLayout } from '@/components/SlideLayout';

export const SlideCaseStudyDetails = () => {
  return (
    <SlideLayout
      title="Supply Chain Optimization"
      subtitle="Implementation Details"
    >
      <div className="flex items-center justify-center h-full">
        <div className="max-w-4xl space-y-8">

          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <div className="text-accent text-xl font-bold">01</div>
              <h3 className="text-2xl font-bold text-slate-900">Industry</h3>
            </div>
            <div className="pl-12">
              <div className="inline-block bg-accent/10 border-2 border-accent rounded-full px-5 py-2">
                <span className="text-accent font-bold text-lg uppercase tracking-wider">
                  Manufacturing & Logistics
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <div className="text-accent text-xl font-bold">02</div>
              <h3 className="text-2xl font-bold text-slate-900">What we delivered</h3>
            </div>
            <div className="pl-12">
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                <p className="text-slate-800 text-base leading-relaxed">
                  End-to-end supply chain digitization including demand forecasting,
                  automated procurement workflows, and real-time inventory tracking
                  across 12 warehouses in 4 countries.
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-start space-x-2">
                    <span className="text-accent font-semibold text-xs uppercase tracking-wide">Challenge:</span>
                    <p className="text-slate-600 text-sm">
                      Legacy ERP systems with manual data entry causing delays,
                      errors, and limited visibility across the supply chain.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <div className="text-accent text-xl font-bold">03</div>
              <h3 className="text-2xl font-bold text-slate-900">Business impact</h3>
            </div>
            <div className="pl-12">
              <div className="bg-accent/5 border-2 border-accent/30 rounded-xl p-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-white font-bold text-xs">✓</span>
                    </div>
                    <div>
                      <div className="text-slate-900 font-semibold text-base mb-0.5">Reduced operational costs by 35%</div>
                      <div className="text-slate-600 text-sm">
                        Automated workflows eliminated manual data entry and reduced processing errors.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-white font-bold text-xs">✓</span>
                    </div>
                    <div>
                      <div className="text-slate-900 font-semibold text-base mb-0.5">Real-time visibility across 12 sites</div>
                      <div className="text-slate-600 text-sm">
                        Management can now track inventory and orders in real-time across all locations.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-white font-bold text-xs">✓</span>
                    </div>
                    <div>
                      <div className="text-slate-900 font-semibold text-base mb-0.5">ROI achieved within 8 months</div>
                      <div className="text-slate-600 text-sm">
                        The investment paid for itself through efficiency gains and error reduction.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};
