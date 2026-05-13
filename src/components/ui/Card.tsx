import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPad?: boolean;
}

export function Card({ noPad, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-700 bg-gray-900 ${noPad ? '' : 'p-4'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
