import { SlideLayout } from '@/components/SlideLayout';
import { Code2, Users, Settings } from 'lucide-react';

export const SlideWhatThisEnables = () => {
  const enablers = [
    {
      icon: Code2,
      title: 'Accelerated development cycles',
      description:
        'Engineering teams ship faster with modern tooling, automated pipelines, and standardized processes across the organization.',
    },
    {
      icon: Users,
      title: 'Empowered business teams',
      description:
        'Business experts can configure and adapt solutions without deep technical knowledge, reducing bottlenecks and time-to-value.',
    },
    {
      icon: Settings,
      title: 'Operational excellence at scale',
      description:
        'Centralized management and automated operations ensure consistency and reliability regardless of how fast you grow.',
    },
  ];

  return (
    <SlideLayout title="What Does This Enable?" centerContent>
      <div className="max-w-5xl mx-auto space-y-10">
        <p className="text-2xl text-slate-700 text-center leading-relaxed">
          Your teams can focus on <span className="text-accent font-semibold">delivering value</span>
          {' '} — while operations and infrastructure <span className="text-accent font-semibold">run themselves</span>.
        </p>

        <div className="space-y-6">
          {enablers.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-6 bg-slate-100 border border-slate-200 rounded-xl p-6"
            >
              <div className="p-3 bg-accent/10 rounded-xl flex-shrink-0">
                <item.icon className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-base text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
};
