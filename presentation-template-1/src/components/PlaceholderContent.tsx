import { FileQuestion } from 'lucide-react';

interface PlaceholderContentProps {
  title: string;
  description?: string;
}

export const PlaceholderContent = ({ title, description }: PlaceholderContentProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 mb-6">
        <FileQuestion className="w-16 h-16 text-accent/50" />
      </div>
      <h2 className="text-3xl font-bold text-slate-700 mb-2">{title}</h2>
      {description && (
        <p className="text-lg text-slate-400 max-w-md">{description}</p>
      )}
    </div>
  );
};
