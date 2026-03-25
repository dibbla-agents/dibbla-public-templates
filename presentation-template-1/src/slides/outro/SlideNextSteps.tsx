import { SlideLayout } from '@/components/SlideLayout';
import { Calendar, MessageSquare, Rocket } from 'lucide-react';

export const SlideNextSteps = () => {
  const steps = [
    {
      icon: Calendar,
      title: 'Customized Demo',
      description: 'Tailored demonstration for your specific situation and use cases',
    },
    {
      icon: MessageSquare,
      title: 'Discovery Workshop',
      description: 'Identify high-impact opportunities and define scope together',
    },
    {
      icon: Rocket,
      title: 'Pilot Project',
      description: 'Start with a focused proof-of-concept to demonstrate value',
    },
  ];

  return (
    <SlideLayout title="Next Steps" centerContent>
      <div className="flex flex-col items-center justify-center h-full max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 w-full">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="p-4 bg-accent/10 rounded-xl inline-block mb-4">
                <step.icon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
};
