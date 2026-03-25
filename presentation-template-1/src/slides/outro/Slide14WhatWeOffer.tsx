import { Server, Users, Check } from 'lucide-react';
import { SlideLayout } from '@/components/SlideLayout';

export const Slide14WhatWeOffer = () => {
  const technologyFeatures = [
    'Cloud infrastructure & migration',
    'Enterprise integration platform',
    'Custom application development',
    'Ongoing technical support',
  ];

  const consultingServices = [
    'Discovery & strategy workshops',
    'Implementation & delivery',
    'Training & enablement programs',
  ];

  return (
    <SlideLayout title="What We Offer" centerContent>
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-2xl text-slate-600 text-center mb-10 max-w-4xl">
          Two ways to work with us
        </p>

        <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 flex flex-col">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-accent/10 rounded-xl">
                <Server className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Technology</h3>
                <p className="text-base text-slate-400">Platform & Infrastructure</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="inline-block bg-accent/10 text-accent text-sm font-medium px-3 py-1 rounded-full">
                Cloud or on-premise deployment
              </span>
            </div>

            <div className="space-y-3 flex-grow">
              {technologyFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                  <p className="text-lg text-slate-700">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 flex flex-col">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-accent/10 rounded-xl">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Consulting</h3>
                <p className="text-base text-slate-400">Expert guidance and delivery</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="inline-block bg-accent/10 text-accent text-sm font-medium px-3 py-1 rounded-full">
                Hourly rate or fixed fee
              </span>
            </div>

            <div className="space-y-3 flex-grow">
              {consultingServices.map((service, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                  <p className="text-lg text-slate-700">{service}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};
