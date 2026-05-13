import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  caption?: string;
  children: ReactNode;
  height?: number;
}

export function ChartCard({ title, subtitle, caption, children, height = 280 }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-sm font-semibold text-gray-200 leading-tight">{title}</h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4 leading-relaxed">{subtitle}</p>
      <div style={{ height }}>{children}</div>
      {caption && <p className="text-xs text-gray-600 mt-3 leading-relaxed">{caption}</p>}
    </div>
  );
}
